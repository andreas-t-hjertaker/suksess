/**
 * E-posttjeneste for Cloud Functions (#111).
 *
 * Bruker Resend som primær transport (RESEND_API_KEY env-variabel).
 * Fallback til Firebase Admin SDK sin innebygde e-posttjeneste.
 *
 * Alle e-poster logges i Firestore `emailLogs`-samlingen for sporbarhet.
 */

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { logger } from "firebase-functions/v2";

function getDb() {
  return admin.firestore();
}

/** Hash e-postadresse med SHA-256 for GDPR-kompatibel logging */
function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

/** Ekstraher domene fra e-post for debugging uten PII */
function emailDomain(email: string): string {
  return email.split("@")[1] || "unknown";
}

/** TTL for e-postlogger: 30 dager (Art. 6(1)(f) berettiget interesse) */
const EMAIL_LOG_TTL_DAYS = 30;

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type EmailRecipient = {
  email: string;
  name?: string;
};

type SendEmailPayload = {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type EmailResult = {
  messageId: string | null;
  provider: string;
};

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

/**
 * Send e-post via Resend API.
 * Krever RESEND_API_KEY miljøvariabel.
 */
async function sendViaResend(payload: SendEmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY er ikke konfigurert");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Suksess <noreply@suksess.no>",
      to: payload.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend feil (${response.status}): ${err}`);
  }

  const data = (await response.json()) as { id?: string };
  return { messageId: data.id ?? null, provider: "resend" };
}

/**
 * Send e-post via SMTP (nodemailer).
 * Brukes som fallback om Resend ikke er konfigurert.
 * Krever SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 */
async function sendViaSmtp(payload: SendEmailPayload): Promise<EmailResult> {
  // Dynamisk import for å unngå å laste nodemailer om det ikke trengs
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Suksess <noreply@suksess.no>",
    to: payload.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(", "),
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
  });

  return { messageId: info.messageId, provider: "smtp" };
}

// ---------------------------------------------------------------------------
// Offentlig API
// ---------------------------------------------------------------------------

/**
 * Send e-post med automatisk transport-valg.
 * Prioriterer Resend > SMTP basert på tilgjengelige miljøvariabler.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
  let result: EmailResult;

  if (process.env.RESEND_API_KEY) {
    result = await sendViaResend(payload);
  } else if (process.env.SMTP_HOST || process.env.SMTP_USER) {
    result = await sendViaSmtp(payload);
  } else {
    // I utvikling/test: logg og returner uten å sende
    logger.info("[email] Ingen e-posttransport konfigurert. Logget e-post:", {
      to: payload.to.map((r) => `${hashEmail(r.email)}@${emailDomain(r.email)}`),
      subject: payload.subject,
    });
    result = { messageId: `dev-${Date.now()}`, provider: "console" };
  }

  // Logg e-post i Firestore (anonymisert — GDPR Art. 6(1)(f))
  const expiresAt = new Date(Date.now() + EMAIL_LOG_TTL_DAYS * 24 * 60 * 60 * 1000);
  await getDb().collection("emailLogs").add({
    to: payload.to.map((r) => ({
      hash: hashEmail(r.email),
      domain: emailDomain(r.email),
    })),
    recipientCount: payload.to.length,
    subject: payload.subject,
    provider: result.provider,
    messageId: result.messageId,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });

  return result;
}
