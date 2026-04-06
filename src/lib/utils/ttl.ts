/**
 * Felles TTL/cache-beregningslogikk.
 *
 * Brukes av ai/cache.ts, ai/semantic-cache.ts og ai/safety.ts
 * for å unngå duplisert aldersberegning.
 */

/** Beregn alder i timer fra et gitt tidspunkt */
export function calculateAgeHours(createdAt: Date | number): number {
  const ms = typeof createdAt === "number" ? createdAt : createdAt.getTime();
  return (Date.now() - ms) / 3_600_000;
}

/** Sjekk om et tidspunkt er eldre enn angitt TTL (i timer) */
export function isExpiredHours(
  createdAt: Date | number,
  ttlHours: number
): boolean {
  return calculateAgeHours(createdAt) > ttlHours;
}

/** Beregn alder i millisekunder fra et gitt tidspunkt */
export function calculateAgeMs(createdAt: Date | number | string): number {
  if (typeof createdAt === "string") {
    return Date.now() - new Date(createdAt).getTime();
  }
  const ms = typeof createdAt === "number" ? createdAt : createdAt.getTime();
  return Date.now() - ms;
}

/** Sjekk om et tidspunkt er eldre enn angitt TTL (i millisekunder) */
export function isExpiredMs(
  createdAt: Date | number | string,
  ttlMs: number
): boolean {
  return calculateAgeMs(createdAt) > ttlMs;
}
