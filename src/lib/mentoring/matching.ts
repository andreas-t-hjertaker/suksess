/**
 * RIASEC-kompatibilitetsscoring for karrierementoring (Issue #70)
 *
 * Bruker dot-produkt av normaliserte RIASEC-vektorer for å beregne
 * kompatibilitet mellom elev og mentor. Score 0–100.
 */

import type { RiasecScores } from "@/types/domain";

const DIMS = [
  "realistic",
  "investigative",
  "artistic",
  "social",
  "enterprising",
  "conventional",
] as const;

function normalizeVector(scores: RiasecScores): number[] {
  const vec = DIMS.map((d) => scores[d]);
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / magnitude);
}

/**
 * Beregn RIASEC-kompatibilitet mellom elev og mentor.
 * Returnerer 0–100 (100 = perfekt match).
 */
export function riasecCompatibility(
  elev: RiasecScores,
  mentor: RiasecScores
): number {
  const na = normalizeVector(elev);
  const nb = normalizeVector(mentor);
  const dot = na.reduce((sum, v, i) => sum + v * nb[i], 0);
  // dot er mellom -1 og 1; skalér til 0–100
  return Math.round(((dot + 1) / 2) * 100);
}

/** Dominerende RIASEC-type (bokstav) for en profil */
export function topRiasecType(scores: RiasecScores): string {
  const best = DIMS.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  return best.charAt(0).toUpperCase();
}
