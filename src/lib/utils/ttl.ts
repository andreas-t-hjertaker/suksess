/**
 * Felles TTL-beregning (#173).
 *
 * Brukes av AI-cache, semantic-cache og andre moduler som trenger
 * aldersberegning basert på tidsstempler.
 */

/**
 * Beregn alder i timer fra et tidspunkt.
 */
export function calculateAgeHours(createdAt: Date | number): number {
  const ms = typeof createdAt === "number" ? createdAt : createdAt.getTime();
  return (Date.now() - ms) / 3_600_000;
}

/**
 * Sjekk om et tidspunkt er eldre enn angitt TTL (i timer).
 */
export function isExpired(createdAt: Date | number, ttlHours: number): boolean {
  return calculateAgeHours(createdAt) > ttlHours;
}

/**
 * Beregn alder i millisekunder fra et tidspunkt.
 */
export function calculateAgeMs(createdAt: Date | number): number {
  const ms = typeof createdAt === "number" ? createdAt : createdAt.getTime();
  return Date.now() - ms;
}

/**
 * Sjekk om et tidspunkt er eldre enn angitt TTL (i millisekunder).
 */
export function isExpiredMs(createdAt: Date | number, ttlMs: number): boolean {
  return calculateAgeMs(createdAt) > ttlMs;
}
