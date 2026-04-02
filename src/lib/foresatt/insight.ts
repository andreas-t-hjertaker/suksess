/**
 * Foresatt-innsikt — GDPR-filtrert datahenting for foresatt-portalen (#106)
 *
 * Returnerer kun aggregerte og anonymiserte data:
 * - XP, streak, achievements (tall)
 * - Topp RIASEC-kategorier (kun navn, aldri rå tallverdier)
 * - Karrierer utforsket (kun titler)
 * - Onboarding-fremdrift
 *
 * ALDRI eksponeres:
 * - AI-samtaler
 * - Rå Big Five- eller RIASEC-tall
 * - Personlige refleksjoner
 * - CV-innhold
 * - Søknadsnotater
 */

import type { RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type StudentInsight = {
  xpTotal: number;
  achievementCount: number;
  streak: number;
  personalityTestComplete: boolean;
  careersExplored: number;
  onboardingStepsCompleted: number;
  totalOnboardingSteps: number;
  /** Topp 3 RIASEC-kategorier (kun norske navn, ikke tallverdier) */
  topRiasecCategories: string[];
  /** Siste 5 karrierer utforsket (kun titler) */
  recentCareers: string[];
  /** Sist aktiv */
  lastActiveAt: Date | null;
  /** XP opptjent siste 7 dager */
  weeklyXpChange: number;
  /** Siste 3 achievements (kun titler) */
  recentAchievements: string[];
};

// ---------------------------------------------------------------------------
// RIASEC-kategorinavn (norsk bokmål)
// ---------------------------------------------------------------------------

export const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "Praktisk",
  investigative: "Analytisk",
  artistic: "Kreativ",
  social: "Sosial",
  enterprising: "Initiativrik",
  conventional: "Systematisk",
};

// ---------------------------------------------------------------------------
// Pure functions — GDPR-filtrering
// ---------------------------------------------------------------------------

/**
 * Konverter RIASEC-profil til topp 3 kategorinavn.
 * Returnerer KUN norske kategorinavn, aldri tallverdier.
 * Dette er GDPR-sikkert for foresatt-innsyn.
 */
export function getTopRiasecCategories(
  riasec: RiasecScores | null | undefined
): string[] {
  if (!riasec) return [];

  const entries = Object.entries(riasec) as [keyof RiasecScores, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => RIASEC_LABELS[key]);
}

/**
 * Bygg en tom StudentInsight for når data ikke er tilgjengelig.
 */
export function emptyInsight(): StudentInsight {
  return {
    xpTotal: 0,
    achievementCount: 0,
    streak: 0,
    personalityTestComplete: false,
    careersExplored: 0,
    onboardingStepsCompleted: 0,
    totalOnboardingSteps: 5,
    topRiasecCategories: [],
    recentCareers: [],
    lastActiveAt: null,
    weeklyXpChange: 0,
    recentAchievements: [],
  };
}

/**
 * Beregn onboarding-fremdritt basert på tilgjengelige data.
 */
export function calculateOnboardingProgress(opts: {
  hasProfile: boolean;
  hasGrades: boolean;
  hasCareerExplored: boolean;
  hasAiChat: boolean;
  onboardingComplete: boolean;
}): { completed: number; total: number } {
  const total = 5;
  let completed = 0;
  if (opts.onboardingComplete) completed++;
  if (opts.hasProfile) completed++;
  if (opts.hasGrades) completed++;
  if (opts.hasCareerExplored) completed++;
  if (opts.hasAiChat) completed++;
  return { completed, total };
}

/**
 * Filtrer og begrenset en liste av karrieretitler for foresatt-innsyn.
 * Maks 5 titler, ingen duplikater.
 */
export function filterRecentCareers(
  careers: string[]
): string[] {
  const unique = [...new Set(careers)];
  return unique.slice(0, 5);
}

/**
 * Filtrer achievements for foresatt-innsyn.
 * Maks 3 titler.
 */
export function filterRecentAchievements(
  achievements: { title: string; earnedAt?: Date }[]
): string[] {
  return achievements
    .sort((a, b) => (b.earnedAt?.getTime() ?? 0) - (a.earnedAt?.getTime() ?? 0))
    .slice(0, 3)
    .map((a) => a.title);
}
