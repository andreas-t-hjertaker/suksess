/**
 * Peppol sendetjeneste (#110).
 *
 * Sender EHF-fakturaer via Peppol-nettverket gjennom et norsk
 * Peppol Access Point (AP). Støtter flere AP-leverandører:
 *
 * 1. Direkte AP-integrasjon (foretrukket for produksjon)
 * 2. E-postfallback dersom Peppol-levering feiler
 *
 * Konfigureres via environment-variabler:
 * - PEPPOL_AP_URL: Base-URL til Peppol Access Point API
 * - PEPPOL_AP_KEY: API-nøkkel for autentisering mot AP
 * - PEPPOL_SENDER_ID: Avsenders Peppol-ID (0192:orgNr)
 * - PEPPOL_FALLBACK_EMAIL: E-post for manuelle fakturaer
 */

import type { EhfGenerationResult } from "./invoice-generator";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type PeppolDeliveryResult = {
  success: boolean;
  method: "peppol" | "email" | "stored";
  messageId?: string;
  error?: string;
  timestamp: string;
};

export type PeppolConfig = {
  apUrl: string;
  apKey: string;
  senderId: string;
  fallbackEmail: string;
};

export type EhfDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "not_applicable";

// ---------------------------------------------------------------------------
// Konfigurasjon
// ---------------------------------------------------------------------------

function getPeppolConfig(): PeppolConfig | null {
  const apUrl = process.env.PEPPOL_AP_URL;
  const apKey = process.env.PEPPOL_AP_KEY;
  const senderId = process.env.PEPPOL_SENDER_ID;
  const fallbackEmail = process.env.PEPPOL_FALLBACK_EMAIL || "faktura@suksess.no";

  if (!apUrl || !apKey || !senderId) return null;

  return { apUrl, apKey, senderId, fallbackEmail };
}

// ---------------------------------------------------------------------------
// Peppol AP-integrasjon
// ---------------------------------------------------------------------------

/**
 * Send EHF-faktura via Peppol Access Point.
 *
 * Bruker standard Peppol AP REST API:
 * POST /api/v1/outbox/send
 * Content-Type: application/xml
 *
 * Headere:
 * - X-Sender-Id: Avsenders Peppol-ID
 * - X-Receiver-Id: Mottakers Peppol-ID
 * - X-Document-Type: Peppol document type identifier
 * - X-Process-Id: Peppol process identifier
 */
async function sendViaPeppolAP(
  config: PeppolConfig,
  invoice: EhfGenerationResult
): Promise<PeppolDeliveryResult> {
  const documentTypeId =
    "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1";
  const processId =
    "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

  const response = await fetch(`${config.apUrl}/api/v1/outbox/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      "Authorization": `Bearer ${config.apKey}`,
      "X-Sender-Id": config.senderId,
      "X-Receiver-Id": invoice.buyerEndpoint,
      "X-Document-Type": documentTypeId,
      "X-Process-Id": processId,
    },
    body: invoice.xml,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Ukjent feil");
    return {
      success: false,
      method: "peppol",
      error: `Peppol AP svarte med ${response.status}: ${errorText}`,
      timestamp: new Date().toISOString(),
    };
  }

  const result = await response.json().catch(() => ({})) as { messageId?: string };
  return {
    success: true,
    method: "peppol",
    messageId: result.messageId || `peppol-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// E-post fallback
// ---------------------------------------------------------------------------

/**
 * Send EHF-faktura som XML-vedlegg via e-post (fallback).
 * Brukes når Peppol AP er utilgjengelig eller mottaker ikke er registrert.
 */
async function sendViaEmailFallback(
  invoice: EhfGenerationResult,
  recipientEmail: string,
  fallbackFrom: string
): Promise<PeppolDeliveryResult> {
  try {
    // Importer e-posttjeneste dynamisk (unngå sirkulære avhengigheter)
    const { apiPost } = await import("@/lib/api-client");

    await apiPost("/email/send", {
      to: recipientEmail,
      subject: `EHF-faktura ${invoice.invoiceNumber} fra KETL/Suksess`,
      text: [
        `Vedlagt finner du EHF-faktura ${invoice.invoiceNumber}.`,
        "",
        "Denne fakturaen er i standard EHF-format (Peppol BIS Billing 3.0)",
        "og kan importeres direkte i regnskapssystemet.",
        "",
        "Ved spørsmål, kontakt oss på faktura@suksess.no.",
        "",
        "Med vennlig hilsen",
        "KETL / Suksess",
      ].join("\n"),
      attachments: [
        {
          filename: `ehf-${invoice.invoiceNumber}.xml`,
          content: invoice.xml,
          contentType: "application/xml",
        },
      ],
    });

    return {
      success: true,
      method: "email",
      messageId: `email-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      method: "email",
      error: err instanceof Error ? err.message : "E-postsending feilet",
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Hovedfunksjon
// ---------------------------------------------------------------------------

/**
 * Send EHF-faktura — prøver Peppol først, faller tilbake til e-post.
 *
 * Flyt:
 * 1. Sjekk om Peppol AP er konfigurert
 * 2. Send via Peppol AP
 * 3. Ved feil: send via e-post som fallback
 * 4. Returner leveringsresultat med status
 */
export async function sendEhfInvoice(
  invoice: EhfGenerationResult,
  recipientEmail: string
): Promise<PeppolDeliveryResult> {
  const config = getPeppolConfig();

  // Hvis Peppol ikke er konfigurert, bruk e-post direkte
  if (!config) {
    console.warn("[EHF] Peppol AP ikke konfigurert — sender via e-post");
    return sendViaEmailFallback(
      invoice,
      recipientEmail,
      "faktura@suksess.no"
    );
  }

  // Prøv Peppol AP først
  const peppolResult = await sendViaPeppolAP(config, invoice);
  if (peppolResult.success) {
    return peppolResult;
  }

  // Fallback til e-post
  console.warn(`[EHF] Peppol-sending feilet: ${peppolResult.error} — prøver e-post`);
  const emailResult = await sendViaEmailFallback(
    invoice,
    recipientEmail,
    config.fallbackEmail
  );

  // Returner e-postresultat med Peppol-feilen vedlagt
  if (!emailResult.success) {
    return {
      ...emailResult,
      error: `Peppol: ${peppolResult.error}. E-post: ${emailResult.error}`,
    };
  }

  return emailResult;
}

/**
 * Sjekk om en organisasjon er registrert i Peppol SMP (Service Metadata Publisher).
 * Brukes for å verifisere at mottaker kan ta imot EHF via Peppol.
 */
export async function checkPeppolRegistration(
  participantId: string
): Promise<{ registered: boolean; endpointUrl?: string }> {
  const config = getPeppolConfig();
  if (!config) {
    return { registered: false };
  }

  try {
    const response = await fetch(
      `${config.apUrl}/api/v1/lookup/${encodeURIComponent(participantId)}`,
      {
        headers: { Authorization: `Bearer ${config.apKey}` },
      }
    );

    if (response.ok) {
      const data = await response.json() as { endpointUrl?: string };
      return { registered: true, endpointUrl: data.endpointUrl };
    }

    return { registered: false };
  } catch {
    return { registered: false };
  }
}
