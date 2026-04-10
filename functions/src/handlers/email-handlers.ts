import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { logger } from "firebase-functions/v2";
import { success, fail, withAuth, withAdmin, withRateLimit } from "../middleware";
import { sendEmail } from "../email";
import { db } from "../constants";

// ============================================================
// E-post (#111)
// ============================================================

/** POST /email/send — Send transaksjonell e-post (krever auth + rate limit) */
export const sendEmailHandler = withRateLimit("api", async ({ req, res }) => {
  const { to, subject, html, text, replyTo } = req.body as {
    to?: { email: string; name?: string }[];
    subject?: string;
    html?: string;
    text?: string;
    replyTo?: string;
  };

  if (!to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
    fail(res, "to, subject og html er påkrevd");
    return;
  }

  // Begrens antall mottakere per kall
  if (to.length > 50) {
    fail(res, "Maks 50 mottakere per sending");
    return;
  }

  try {
    const result = await sendEmail({ to, subject, html, text: text || "", replyTo });
    success(res, { messageId: result.messageId, provider: result.provider });
  } catch (err) {
    logger.error("[email] Sending feilet:", err);
    fail(res, "E-postsending feilet", 500);
  }
});

/** POST /email/invite — Send skoleinvitasjon (kun admin) */
export const sendInviteEmail = withAdmin(async ({ req, res }) => {
  const { emails, schoolName, tenantId } = req.body as {
    emails?: string[];
    schoolName?: string;
    tenantId?: string;
  };

  if (!emails || !Array.isArray(emails) || emails.length === 0 || !schoolName || !tenantId) {
    fail(res, "emails, schoolName og tenantId er påkrevd");
    return;
  }

  if (emails.length > 200) {
    fail(res, "Maks 200 invitasjoner per kall");
    return;
  }

  const baseUrl = process.env.APP_URL || "https://suksess.no";
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const email of emails) {
    const inviteToken = crypto.randomBytes(16).toString("hex");
    const inviteUrl = `${baseUrl}/login?invite=${inviteToken}&tenant=${tenantId}`;

    // Lagre invitasjon i Firestore
    await db.collection("invites").add({
      email,
      tenantId,
      token: inviteToken,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dager
    });

    try {
      await sendEmail({
        to: [{ email }],
        subject: `Invitasjon fra ${schoolName} — Suksess`,
        html: `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f4f5;padding:32px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:#18181b;padding:24px;text-align:center"><span style="color:#fff;font-size:20px;font-weight:700">Suksess</span></div>
<div style="padding:32px">
<h1 style="font-size:22px">Du er invitert! 🏫</h1>
<p>${schoolName} har gitt deg tilgang til Suksess — en AI-drevet karriereveiledningsplattform.</p>
<a href="${inviteUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Aksepter invitasjon</a>
<p style="font-size:12px;color:#71717a;margin-top:24px">Invitasjonen utløper om 7 dager.</p>
</div></div></body></html>`,
        text: `${schoolName} har invitert deg til Suksess!\n\nAksepter: ${inviteUrl}`,
      });
      results.push({ email, success: true });
    } catch (err) {
      results.push({ email, success: false, error: err instanceof Error ? err.message : "Ukjent feil" });
    }
  }

  success(res, { sent: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, results });
});

// ============================================================
// Foresatt / samtykke (#106)
// ============================================================

/** POST /email/parent-consent — Send samtykkeforespørsel til foresatt (krever auth) */
export const sendParentConsentEmail = withAuth(async ({ user, req, res }) => {
  const { parentEmail, studentName } = req.body as {
    parentEmail?: string;
    studentName?: string;
  };

  if (!parentEmail || !studentName) {
    fail(res, "parentEmail og studentName er påkrevd");
    return;
  }

  // Generer unik token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dager

  // Lagre token i Firestore
  await db.collection("parentConsentTokens").doc(token).set({
    studentUid: user.uid,
    parentEmail,
    token,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    used: false,
  });

  // Bygg samtykke-URL
  const baseUrl = process.env.APP_URL || "https://suksess.no";
  const consentUrl = `${baseUrl}/samtykke-bekreftelse?token=${token}`;

  try {
    await sendEmail({
      to: [{ email: parentEmail }],
      subject: "Samtykke påkrevd — Suksess karriereveiledning",
      html: `<p>${studentName} har opprettet en konto på Suksess. Siden eleven er under 16 år, krever GDPR samtykke fra foresatte.</p><p><a href="${consentUrl}">Godkjenn samtykke</a></p><p>Lenken er gyldig i 7 dager.</p>`,
      text: `${studentName} har opprettet en konto på Suksess. Godkjenn samtykke: ${consentUrl} (gyldig i 7 dager)`,
    });
    success(res, { sent: true });
  } catch (err) {
    logger.error("[parent-consent] E-post feilet:", err);
    fail(res, "E-postsending feilet", 500);
  }
});

/** POST /parent/unlink — Fjern foresatt-kobling (krever auth) */
export const unlinkParent = withAuth(async ({ user, req, res }) => {
  const { studentUid } = req.body as { studentUid?: string };

  if (!studentUid) {
    fail(res, "studentUid er påkrevd");
    return;
  }

  const linkId = `${user.uid}_${studentUid}`;
  const linkRef = db.collection("parentLinks").doc(linkId);
  const linkDoc = await linkRef.get();

  if (!linkDoc.exists) {
    fail(res, "Kobling ikke funnet", 404);
    return;
  }

  // Sett status til revoked
  await linkRef.update({
    status: "revoked",
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Logg i consentAudit
  await db.collection("consentAudit").add({
    type: "link_removed",
    parentUid: user.uid,
    studentUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    source: "server",
  });

  success(res, { unlinked: true });
});
