/**
 * Notifications — e-postvarsler for Suksess-plattformen (Issue #38, #39)
 *
 * Cloud Function Firestore-triggere:
 * - onParentalConsentCreated: Sender samtykke-e-post til foresatt
 *   (GDPR: samtykke for behandling av persondata for brukere under 16 år)
 * - onCounselorInvited: Sender invitasjon til rådgiver
 *
 * Konfigurasjon via Firebase Secret Manager / environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — SMTP-tilkobling
 *   SMTP_FROM   — avsender-adresse (f.eks. "Suksess <noreply@suksess.no>")
 *   APP_BASE_URL — basis-URL for lenker (f.eks. "https://suksess.no")
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as nodemailer from "nodemailer";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// E-posttransport
// ---------------------------------------------------------------------------

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Logg advarsel i dev — i prod skal disse alltid finnes
    console.warn("[notifications] SMTP ikke konfigurert — e-post vil ikke sendes");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_ADDRESS =
  process.env.SMTP_FROM ?? "Suksess <noreply@suksess.no>";
const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://suksess.no";

// ---------------------------------------------------------------------------
// E-post: Foresatt-samtykke (GDPR art. 8 — barn under 16 år)
// ---------------------------------------------------------------------------

type ParentalConsentDoc = {
  userId: string;
  parentEmail: string;
  parentName?: string | null;
  requiresParentalConsent: boolean;
  parentalConsentGiven: boolean;
};

/** Firestore-trigger: users/{uid}/consent/parental ble opprettet */
export const onParentalConsentCreated = onDocumentCreated(
  {
    document: "users/{uid}/consent/parental",
    region: "europe-west1",
  },
  async (event) => {
    const data = event.data?.data() as ParentalConsentDoc | undefined;
    if (!data || !data.requiresParentalConsent || data.parentalConsentGiven) {
      return;
    }

    const { userId, parentEmail, parentName } = data;
    if (!parentEmail) {
      console.warn(`[parental-consent] Mangler parentEmail for bruker ${userId}`);
      return;
    }

    // Hent elevens navn fra profil om tilgjengelig
    let studentName = "eleven";
    try {
      const profileSnap = await db.collection("profiles").doc(userId).get();
      if (profileSnap.exists) {
        const displayName = profileSnap.data()?.displayName as string | undefined;
        if (displayName) studentName = displayName;
      }
    } catch {
      // Ignorer feil — bruk fallback
    }

    const consentLink = `${APP_BASE_URL}/samtykke?uid=${encodeURIComponent(userId)}`;

    const html = `
<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8">
  <title>Samtykke for ${studentName}</title>
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">Suksess</h1>
    <p style="color: #6b7280; font-size: 14px;">Karriereveiledning for videregående elever</p>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 8px;">
    Hei${parentName ? `, ${parentName}` : ""}!
  </h2>
  <p>
    <strong>${studentName}</strong> ønsker å bruke Suksess — en AI-assistert karriereveiledningsplattform
    for norske videregående elever. Siden ${studentName} er under 16 år, krever personopplysningsloven
    at du som foresatt samtykker til bruk av tjenesten.
  </p>

  <h3 style="font-size: 16px; margin-top: 24px;">Hva behandler Suksess?</h3>
  <ul style="line-height: 1.7; color: #374151;">
    <li>Personlighetsprofil (Big Five OCEAN og RIASEC-interesser)</li>
    <li>Karakterer fra videregående (lagt inn av eleven selv)</li>
    <li>Samtalehistorikk med AI-veileder</li>
    <li>Bruksdata (innloggingstidspunkter, aktivitetsnivå)</li>
  </ul>
  <p style="color: #6b7280; font-size: 13px;">
    Data lagres i EU (Google Cloud europe-west1) og deles aldri med tredjeparter for kommersielle formål.
    Se vår <a href="${APP_BASE_URL}/personvern" style="color: #7c3aed;">personvernerklæring</a> for detaljer.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${consentLink}" style="
      background-color: #7c3aed;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
    ">Gi samtykke</a>
  </div>

  <p style="color: #6b7280; font-size: 13px; text-align: center;">
    Lenken er gyldig i 7 dager. Har du spørsmål? Kontakt oss på
    <a href="mailto:personvern@suksess.no" style="color: #7c3aed;">personvern@suksess.no</a>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 11px; text-align: center;">
    Du mottar denne e-posten fordi ${studentName} har oppgitt deg som foresatt.
    Dersom du ikke kjenner til dette, kan du se bort fra denne e-posten.
    Suksess AS, Postboks 1234, 0101 Oslo.
  </p>
</body>
</html>`;

    const transporter = createTransporter();
    if (!transporter) {
      // Logg at e-post ikke ble sendt — Firestore-dokumentet eksisterer allerede
      console.warn(
        `[parental-consent] Ingen SMTP-konfigurasjon — samtykke-e-post til ${parentEmail} ikke sendt`
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: parentEmail,
        subject: `Samtykke for ${studentName} på Suksess`,
        html,
        text: `Hei${parentName ? `, ${parentName}` : ""}!\n\n${studentName} ønsker å bruke Suksess. Klikk på lenken for å gi samtykke:\n${consentLink}\n\nSe vår personvernerklæring: ${APP_BASE_URL}/personvern`,
      });

      // Merk at e-post er sendt
      await db
        .collection("users")
        .doc(userId)
        .collection("consent")
        .doc("parental")
        .update({
          emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(
        `[parental-consent] Samtykke-e-post sendt til ${parentEmail} for bruker ${userId}`
      );
    } catch (err) {
      console.error(
        `[parental-consent] Feil ved sending av e-post til ${parentEmail}:`,
        err
      );
    }
  }
);

// ---------------------------------------------------------------------------
// E-post: Rådgiver-invitasjon (Issue #39)
// ---------------------------------------------------------------------------

type CounselorInviteDoc = {
  inviterName: string;
  inviterEmail: string;
  schoolName: string;
  inviteeEmail: string;
  token: string;
};

/** Firestore-trigger: counselorInvites/{inviteId} ble opprettet */
export const onCounselorInvited = onDocumentCreated(
  {
    document: "counselorInvites/{inviteId}",
    region: "europe-west1",
  },
  async (event) => {
    const data = event.data?.data() as CounselorInviteDoc | undefined;
    if (!data || !data.inviteeEmail || !data.token) {
      return;
    }

    const { inviterName, inviterEmail, schoolName, inviteeEmail, token } = data;
    const acceptLink = `${APP_BASE_URL}/onboarding/counselor?invite=${encodeURIComponent(token)}`;

    const html = `
<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="UTF-8">
  <title>Invitasjon til Suksess — ${schoolName}</title>
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">Suksess</h1>
    <p style="color: #6b7280; font-size: 14px;">Karriereveiledning for videregående elever</p>
  </div>

  <h2 style="font-size: 20px; margin-bottom: 8px;">
    Du er invitert til ${schoolName}!
  </h2>
  <p>
    <strong>${inviterName}</strong> (${inviterEmail}) har invitert deg til å bli rådgiver
    på Suksess for <strong>${schoolName}</strong>.
  </p>
  <p>
    Som rådgiver får du tilgang til anonymiserte, aggregerte data om dine elevers karriereinteresser
    og engasjementsnivå — uten å se individuelle profiler uten eksplisitt samtykke.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${acceptLink}" style="
      background-color: #7c3aed;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      display: inline-block;
    ">Aksepter invitasjon</a>
  </div>

  <p style="color: #6b7280; font-size: 13px; text-align: center;">
    Invitasjonen er gyldig i 7 dager.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  <p style="color: #9ca3af; font-size: 11px; text-align: center;">
    Suksess AS, Postboks 1234, 0101 Oslo.
  </p>
</body>
</html>`;

    const transporter = createTransporter();
    if (!transporter) {
      console.warn(
        `[counselor-invite] Ingen SMTP-konfigurasjon — invitasjon til ${inviteeEmail} ikke sendt`
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: inviteeEmail,
        subject: `Invitasjon til Suksess — ${schoolName}`,
        html,
        text: `Du er invitert til ${schoolName} på Suksess.\nAksepter her: ${acceptLink}`,
      });

      await event.data?.ref.update({
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[counselor-invite] Invitasjon sendt til ${inviteeEmail} for ${schoolName}`
      );
    } catch (err) {
      console.error(
        `[counselor-invite] Feil ved sending av invitasjon til ${inviteeEmail}:`,
        err
      );
    }
  }
);
