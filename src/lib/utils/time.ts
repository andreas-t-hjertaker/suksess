/**
 * Felles timestamp-verktøy for konsistent tidshåndtering.
 *
 * Standard:
 * - Firestore-dokumenter: serverTimestamp() (håndtert av Firestore SDK)
 * - Logging og cache-metadata: nowISO() → ISO 8601 streng
 * - Rate limiting / localStorage: Date.now() → epoch ms
 */

/** Returner nåværende tidspunkt som ISO 8601-streng */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Formater en timestamp til lesbar ISO-streng */
export function formatTimestamp(
  ts: Date | number | string | { toDate?: () => Date }
): string {
  if (typeof ts === "string") return ts;
  if (typeof ts === "number") return new Date(ts).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (ts && typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
    return ts.toDate().toISOString();
  }
  return new Date().toISOString();
}

/** Beregn utløpstidspunkt som ISO-streng, gitt TTL i millisekunder */
export function expiresAtISO(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}
