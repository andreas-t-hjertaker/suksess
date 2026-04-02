/**
 * Foresatt-kobling — logikk for å generere invitasjonskoder og administrere
 * foresatt-elev-koblinger (#106)
 *
 * Flyt:
 * 1. Elev genererer 6-tegns koblingskode fra innstillinger
 * 2. Foresatt skriver inn koden i foresatt-portalen
 * 3. Kobling opprettes i parentLinks-samlingen
 * 4. Elev kan se og fjerne koblinger fra innstillinger
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type GuardianLink = {
  parentUid: string;
  parentDisplayName: string | null;
  parentEmail: string | null;
  linkedAt: Date;
  status: "active" | "revoked";
};

export type ParentInvite = {
  code: string;
  studentUid: string;
  status: "pending" | "accepted" | "expired";
  createdAt: Date;
  expiresAt: Date;
};

// ---------------------------------------------------------------------------
// Kodegenerering
// ---------------------------------------------------------------------------

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Utelater I/O/0/1 for lesbarhet

/**
 * Generer en 6-tegns alfanumerisk invitasjonskode.
 * Bruker Web Crypto API for kryptografisk sikkerhet.
 */
export function generateInviteCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => CODE_CHARS[byte % CODE_CHARS.length]).join("");
}

/**
 * Formater invitasjonskode med mellomrom for lesbarhet (ABC 123).
 */
export function formatInviteCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

// ---------------------------------------------------------------------------
// Firestore-operasjoner
// ---------------------------------------------------------------------------

/**
 * Opprett en ny foresatt-invitasjon i Firestore.
 * Koden utløper etter 30 minutter.
 */
export async function createParentInvite(studentUid: string): Promise<string> {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await setDoc(doc(collection(db, "parentInvites")), {
    code,
    studentUid,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  return code;
}

/**
 * Hent alle aktive foresatt-koblinger for en elev.
 */
export async function getLinkedGuardians(
  studentUid: string
): Promise<GuardianLink[]> {
  const snap = await getDocs(
    query(
      collection(db, "parentLinks"),
      where("studentUid", "==", studentUid),
      where("status", "==", "active")
    )
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      parentUid: data.parentUid,
      parentDisplayName: data.parentDisplayName || null,
      parentEmail: data.parentEmail || null,
      linkedAt: data.linkedAt?.toDate() || new Date(),
      status: data.status,
    };
  });
}

/**
 * Fjern kobling mellom foresatt og elev.
 * Setter status til "revoked" og sletter dokumentet.
 */
export async function unlinkGuardian(
  studentUid: string,
  parentUid: string
): Promise<void> {
  const linkId = `${parentUid}_${studentUid}`;
  await deleteDoc(doc(db, "parentLinks", linkId));
}

/**
 * Sjekk om en invitasjonskode er utløpt.
 */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Valider format på invitasjonskode.
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z2-9]{6}$/.test(code);
}
