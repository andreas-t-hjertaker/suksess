/**
 * Felles timestamp-utilities (#175).
 *
 * Standard:
 * - Firestore-dokumenter: bruk serverTimestamp() fra firebase/firestore
 * - Logging og audit: bruk nowISO() for ISO 8601-strenger
 * - Cache/rate limiting: bruk Date.now() for millisekund-presisjon
 *
 * Denne filen tilbyr hjelpefunksjoner for konsistent formatering.
 */

/**
 * Returner nåværende tidspunkt som ISO 8601-streng (UTC).
 * Bruk for logging, audit trails og serialisering.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Formater en Date, Firestore Timestamp eller unix ms til ISO 8601-streng.
 */
export function formatTimestamp(
  value: Date | number | { toDate: () => Date } | null | undefined
): string | null {
  if (value == null) return null;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate().toISOString();
  }
  return null;
}
