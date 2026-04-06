/**
 * Scoring-algoritmer for Big Five og RIASEC.
 *
 * Likert-skala: 1 (stemmer ikke i det hele tatt) — 5 (stemmer svært godt)
 * Reversed items: score = 6 - råverdi
 * Normalisert til 0–100 per dimensjon.
 */

import type { BigFiveScores, RiasecScores } from "@/types/domain";
import { RawAnswersSchema } from "@/types/schemas";
import {
  BIG_FIVE_QUESTIONS,
  RIASEC_QUESTIONS,
  STRENGTH_QUESTIONS,
  type BigFiveDimension,
  type RiasecDimension,
  type StrengthCategory,
} from "./questions";

/** Råsvar: spørsmålsId → verdi 1–5 */
export type RawAnswers = Record<string, number>;

/**
 * Validerer råsvar mot Likert-skala (heltall 1–5).
 * Kaster feil med beskrivende melding ved ugyldig input.
 */
export function validateAnswers(answers: RawAnswers): RawAnswers {
  const result = RawAnswersSchema.safeParse(answers);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Ugyldig personlighetssvar: ${issues}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Interne hjelpere
// ---------------------------------------------------------------------------

function clampAnswer(value: number): number {
  if (!Number.isFinite(value)) return 3; // NaN/Infinity → midtpunkt
  return Math.max(1, Math.min(5, Math.round(value)));
}

function scoredValue(rawValue: number, reversed: boolean): number {
  const clamped = clampAnswer(rawValue);
  return reversed ? 6 - clamped : clamped;
}

/**
 * Normaliser gjennomsnitt (1–5) til 0–100
 * min=1, max=5 → (avg - 1) / 4 * 100
 */
function normalize(avg: number): number {
  return Math.round(((avg - 1) / 4) * 100);
}

// ---------------------------------------------------------------------------
// Big Five scoring
// ---------------------------------------------------------------------------

export function scoreBigFive(answers: RawAnswers): BigFiveScores {
  validateAnswers(answers);

  const dimensions: BigFiveDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ];

  const result = {} as BigFiveScores;

  for (const dim of dimensions) {
    const qs = BIG_FIVE_QUESTIONS.filter((q) => q.dimension === dim);
    const scored = qs
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => scoredValue(answers[q.id], q.reversed));

    if (scored.length === 0) {
      result[dim] = 50; // default midt på
    } else {
      const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
      result[dim] = normalize(avg);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// RIASEC scoring
// ---------------------------------------------------------------------------

export function scoreRiasec(answers: RawAnswers): RiasecScores {
  validateAnswers(answers);

  const dimensions: RiasecDimension[] = [
    "realistic",
    "investigative",
    "artistic",
    "social",
    "enterprising",
    "conventional",
  ];

  const result = {} as RiasecScores;

  for (const dim of dimensions) {
    const qs = RIASEC_QUESTIONS.filter((q) => q.dimension === dim);
    const scored = qs
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => scoredValue(answers[q.id], q.reversed));

    if (scored.length === 0) {
      result[dim] = 50;
    } else {
      const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
      result[dim] = normalize(avg);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Styrke-scoring
// ---------------------------------------------------------------------------

export type StrengthScores = Record<StrengthCategory, number>;

export function scoreStrengths(answers: RawAnswers): StrengthScores {
  validateAnswers(answers);

  const categories: StrengthCategory[] = [
    "kreativitet",
    "nysgjerrighet",
    "lederskap",
    "empati",
    "utholdenhet",
    "humor",
    "rettferdighet",
  ];

  const result = {} as StrengthScores;

  for (const cat of categories) {
    const qs = STRENGTH_QUESTIONS.filter((q) => q.category === cat);
    const scored = qs
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => scoredValue(answers[q.id], q.reversed));

    if (scored.length === 0) {
      result[cat] = 50;
    } else {
      const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
      result[cat] = normalize(avg);
    }
  }

  return result;
}

/**
 * Returner topp-styrker sortert etter score (høyeste først)
 */
export function getTopStrengths(scores: StrengthScores, top = 3): StrengthCategory[] {
  return (Object.entries(scores) as [StrengthCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([cat]) => cat);
}

// ---------------------------------------------------------------------------
// RIASEC-kode — topp 3 bokstaver (f.eks. "SAI")
// ---------------------------------------------------------------------------

const RIASEC_LETTERS: Record<RiasecDimension, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

export function getRiasecCode(scores: RiasecScores, top = 3): string {
  return (Object.entries(scores) as [RiasecDimension, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([dim]) => RIASEC_LETTERS[dim])
    .join("");
}
