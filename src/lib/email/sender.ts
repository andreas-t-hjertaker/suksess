/**
 * E-postsending-tjeneste (#111).
 *
 * Abstraherer e-posttransport bak et felles grensesnitt.
 * Støtter Firebase-backend (Cloud Functions) via API-endepunkt,
 * eller direkte SMTP/SendGrid/Resend i server-kontekst.
 *
 * Klienten sender e-post via Cloud Function-API-et.
 */

import { apiPost } from "@/lib/api-client";
import type { EmailTemplate } from "./templates";

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type SendEmailOptions = {
  to: EmailRecipient | EmailRecipient[];
  template: EmailTemplate;
  replyTo?: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send e-post via Cloud Function API.
 * Brukes av klient-kode for å trigger transaksjonelle e-poster.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const res = await apiPost<{ messageId: string }>("/email/send", {
    to: recipients,
    subject: options.template.subject,
    html: options.template.html,
    text: options.template.text,
    replyTo: options.replyTo,
  });

  if (res.success) {
    return { success: true, messageId: res.data?.messageId };
  }

  return { success: false, error: res.error || "Ukjent feil ved sending" };
}

/**
 * Send velkomst-e-post til ny bruker.
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<SendEmailResult> {
  const { welcomeEmail } = await import("./templates");
  return sendEmail({
    to: { email, name },
    template: welcomeEmail(name),
  });
}

/**
 * Send skoleinvitasjon.
 */
export async function sendSchoolInvite(
  email: string,
  schoolName: string,
  inviteUrl: string
): Promise<SendEmailResult> {
  const { schoolInviteEmail } = await import("./templates");
  return sendEmail({
    to: { email },
    template: schoolInviteEmail(schoolName, inviteUrl),
  });
}
