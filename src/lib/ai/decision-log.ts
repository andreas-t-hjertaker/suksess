/**
 * AI Decision Logging — EU AI Act compliance.
 *
 * Logger AI-beslutninger til Firestore for transparens og etterprøvbarhet.
 * Bruker SHA-256-hashing av userId for å unngå direkte PII-kobling.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type AiDecisionType =
  | "career_match"
  | "study_recommendation"
  | "cv_content"
  | "chat_response";

export interface AiDecisionLogEntry {
  userIdHash: string;
  timestamp: ReturnType<typeof serverTimestamp>;
  decisionType: AiDecisionType;
  inputSummary: string;
  outputSummary: string;
  modelVersion: string;
  safetyFlags: string[];
}

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/** Hash en streng med SHA-256 (Web Crypto API) */
async function hashUserId(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fjern potensielle PII-mønstre og begrens lengde */
function stripPiiAndTruncate(text: string, maxLength = 200): string {
  let cleaned = text
    // Fjern norske personnummer (11 siffer)
    .replace(/\b\d{6}\s?\d{5}\b/g, "[FJERNET]")
    // Fjern e-postadresser
    .replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, "[EPOST]")
    // Fjern telefonnummer (norske)
    .replace(/(?:\+47\s?)?\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/g, "[TELEFON]");

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength - 3) + "...";
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Hovedfunksjon
// ---------------------------------------------------------------------------

const AI_DECISION_LOG_COLLECTION = "aiDecisionLog";

/**
 * Logg en AI-beslutning til Firestore for EU AI Act-compliance.
 *
 * userId hashes med SHA-256 slik at loggen ikke inneholder direkte PII.
 * Input og output strippes for PII og begrenses til 200 tegn.
 */
export async function logAiDecision(params: {
  userId: string;
  decisionType: AiDecisionType;
  inputSummary: string;
  outputSummary: string;
  modelVersion: string;
  safetyFlags?: string[];
}): Promise<void> {
  try {
    const userIdHash = await hashUserId(params.userId);

    const entry: AiDecisionLogEntry = {
      userIdHash,
      timestamp: serverTimestamp(),
      decisionType: params.decisionType,
      inputSummary: stripPiiAndTruncate(params.inputSummary),
      outputSummary: stripPiiAndTruncate(params.outputSummary),
      modelVersion: params.modelVersion,
      safetyFlags: params.safetyFlags ?? [],
    };

    await addDoc(collection(db, AI_DECISION_LOG_COLLECTION), entry);
  } catch {
    // Logging-feil skal ikke blokkere brukeropplevelsen
    console.warn("[AI Decision Log] Kunne ikke logge beslutning");
  }
}

// ---------------------------------------------------------------------------
// Feilrapportering fra brukere
// ---------------------------------------------------------------------------

const AI_ERROR_REPORTS_COLLECTION = "aiErrorReports";

export interface AiErrorReport {
  userIdHash: string;
  timestamp: ReturnType<typeof serverTimestamp>;
  messageId: string;
  messageContent: string;
  reason: string;
}

/**
 * Logg en brukerrapport om feil i AI-generert innhold.
 * Del av EU AI Act-kravet om menneskelig overstyring og klagekanal.
 */
export async function reportAiError(params: {
  userId: string;
  messageId: string;
  messageContent: string;
  reason: string;
}): Promise<void> {
  const userIdHash = await hashUserId(params.userId);

  await addDoc(collection(db, AI_ERROR_REPORTS_COLLECTION), {
    userIdHash,
    timestamp: serverTimestamp(),
    messageId: params.messageId,
    messageContent: stripPiiAndTruncate(params.messageContent, 500),
    reason: stripPiiAndTruncate(params.reason),
  } satisfies AiErrorReport);
}
