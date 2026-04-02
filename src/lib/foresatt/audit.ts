/**
 * Foresatt audit-logging (#106)
 *
 * Logger alle foresatt-handlinger i consentAudit-samlingen (immutabel).
 * Brukes for GDPR-etterlevelse og transparens.
 *
 * Handlinger:
 * - link_created: Foresatt koblet til elev
 * - link_removed: Kobling fjernet
 * - consent_given: Foresatt godkjente samtykke
 * - consent_withdrawn: Foresatt trakk samtykke
 * - insight_viewed: Foresatt så elevens data
 */

import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type GuardianAuditType =
  | "link_created"
  | "link_removed"
  | "consent_given"
  | "consent_withdrawn"
  | "insight_viewed";

export const GUARDIAN_AUDIT_TYPES: GuardianAuditType[] = [
  "link_created",
  "link_removed",
  "consent_given",
  "consent_withdrawn",
  "insight_viewed",
];

export type GuardianAuditAction = {
  type: GuardianAuditType;
  parentUid: string;
  studentUid: string;
  metadata?: Record<string, string>;
};

export type GuardianAuditRecord = GuardianAuditAction & {
  timestamp: ReturnType<typeof serverTimestamp>;
  source: "client";
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/**
 * Logg en foresatt-handling i consentAudit-samlingen.
 * Samlingen er immutabel — dokumenter kan ikke endres eller slettes.
 */
export async function logGuardianAction(
  action: GuardianAuditAction
): Promise<void> {
  const auditRef = doc(collection(db, "consentAudit"));
  await setDoc(auditRef, {
    ...action,
    timestamp: serverTimestamp(),
    source: "client",
  });
}

// ---------------------------------------------------------------------------
// Validering (pure functions for testing)
// ---------------------------------------------------------------------------

/**
 * Sjekk om en audit-type er gyldig.
 */
export function isValidAuditType(type: string): type is GuardianAuditType {
  return GUARDIAN_AUDIT_TYPES.includes(type as GuardianAuditType);
}

/**
 * Bygg en audit-action med validering.
 * Kaster feil ved ugyldig type.
 */
export function buildAuditAction(
  type: string,
  parentUid: string,
  studentUid: string,
  metadata?: Record<string, string>
): GuardianAuditAction {
  if (!isValidAuditType(type)) {
    throw new Error(`Ugyldig audit-type: ${type}`);
  }
  if (!parentUid || !studentUid) {
    throw new Error("parentUid og studentUid er påkrevd");
  }
  return { type, parentUid, studentUid, metadata };
}
