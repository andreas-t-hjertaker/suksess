/**
 * XP- og nivåsystem for progressiv avsløring.
 *
 * Nivåer:
 *   Nybegynner (0–99 XP)   → grunnleggende funksjoner
 *   Utforsker (100–299 XP) → låser opp karrierestiutforsker
 *   Veiviser (300–599 XP)  → låser opp AI-veileder og jobbmatch
 *   Mester (600+ XP)       → låser opp CV-builder og all avansert funksjonalitet
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type UserLevel = "nybegynner" | "utforsker" | "veiviser" | "mester";

export type XpEvent =
  | "onboarding_complete"      // 50 XP — fullført onboarding
  | "personality_test"         // 30 XP — tatt personlighetstest
  | "riasec_test"              // 30 XP — tatt RIASEC-test
  | "grades_added"             // 10 XP per karakter (maks 50 XP totalt)
  | "profile_photo"            // 10 XP — lastet opp profilbilde
  | "daily_login"              // 5 XP per dag (maks 35 XP per uke)
  | "ai_chat"                  // 5 XP per samtale (maks 25 XP per dag)
  | "career_path_viewed"       // 3 XP per karrierevei-besøk
  | "study_program_saved"      // 8 XP per lagret studieprogram
  | "streak_7_days"            // 25 XP — 7 dagers streak
  | "streak_30_days";          // 75 XP — 30 dagers streak

export const XP_VALUES: Record<XpEvent, number> = {
  onboarding_complete: 50,
  personality_test: 30,
  riasec_test: 30,
  grades_added: 10,
  profile_photo: 10,
  daily_login: 5,
  ai_chat: 5,
  career_path_viewed: 3,
  study_program_saved: 8,
  streak_7_days: 25,
  streak_30_days: 75,
};

// ---------------------------------------------------------------------------
// Nivå-definisjon
// ---------------------------------------------------------------------------

export type LevelDefinition = {
  name: UserLevel;
  label: string;
  description: string;
  minXp: number;
  maxXp: number;
  color: string;
  /** Features som låses opp på dette nivået */
  unlockedFeatures: string[];
};

export const LEVELS: LevelDefinition[] = [
  {
    name: "nybegynner",
    label: "Nybegynner",
    description: "Du er i gang! Fullfør profilen for å låse opp mer.",
    minXp: 0,
    maxXp: 99,
    color: "text-slate-500",
    unlockedFeatures: ["karakterer", "personlighetstest"],
  },
  {
    name: "utforsker",
    label: "Utforsker",
    description: "Du utforsker mulighetene. Karrierestier er nå åpne!",
    minXp: 100,
    maxXp: 299,
    color: "text-blue-500",
    unlockedFeatures: ["karakterer", "personlighetstest", "karrierestiutforsker", "studieprogram-detaljer"],
  },
  {
    name: "veiviser",
    label: "Veiviser",
    description: "Du vet hva du vil. AI-veilederen er nå tilgjengelig!",
    minXp: 300,
    maxXp: 599,
    color: "text-violet-500",
    unlockedFeatures: ["karakterer", "personlighetstest", "karrierestiutforsker", "studieprogram-detaljer", "ai-veileder-full", "jobbmatch"],
  },
  {
    name: "mester",
    label: "Mester",
    description: "Du er klar for fremtiden. Alt er tilgjengelig!",
    minXp: 600,
    maxXp: Infinity,
    color: "text-amber-500",
    unlockedFeatures: [
      "karakterer", "personlighetstest", "karrierestiutforsker",
      "studieprogram-detaljer", "ai-veileder-full", "jobbmatch",
      "cv-builder", "avansert-analyse", "mentor-kobling",
    ],
  },
];

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type AchievementId =
  | "first_login"
  | "profile_complete"
  | "test_taker"
  | "grade_tracker"
  | "explorer"
  | "streak_starter"
  | "week_streak"
  | "month_streak"
  | "level_utforsker"
  | "level_veiviser"
  | "level_mester";

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  xpReward: number;
  icon: string; // emoji
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_login",
    title: "Første steg",
    description: "Logget inn for første gang",
    xpReward: 10,
    icon: "👋",
  },
  {
    id: "profile_complete",
    title: "Klar for start",
    description: "Fullført onboarding og personlighetstest",
    xpReward: 25,
    icon: "✅",
  },
  {
    id: "test_taker",
    title: "Selvinnsiktig",
    description: "Fullført både Big Five og RIASEC-testen",
    xpReward: 20,
    icon: "🧠",
  },
  {
    id: "grade_tracker",
    title: "Karakterjeger",
    description: "Registrert minst 5 karakterer",
    xpReward: 15,
    icon: "📊",
  },
  {
    id: "explorer",
    title: "Nysgjerrig",
    description: "Utforsket 10 karrierestier",
    xpReward: 20,
    icon: "🔭",
  },
  {
    id: "streak_starter",
    title: "Rutinebygger",
    description: "3 dager på rad",
    xpReward: 10,
    icon: "🔥",
  },
  {
    id: "week_streak",
    title: "Uke-kriger",
    description: "7 dager på rad",
    xpReward: 25,
    icon: "⚡",
  },
  {
    id: "month_streak",
    title: "Månedshelt",
    description: "30 dager på rad",
    xpReward: 75,
    icon: "🏆",
  },
  {
    id: "level_utforsker",
    title: "Utforsker",
    description: "Nådd Utforsker-nivå (100 XP)",
    xpReward: 0,
    icon: "🗺️",
  },
  {
    id: "level_veiviser",
    title: "Veiviser",
    description: "Nådd Veiviser-nivå (300 XP)",
    xpReward: 0,
    icon: "🧭",
  },
  {
    id: "level_mester",
    title: "Mester",
    description: "Nådd Mester-nivå (600 XP)",
    xpReward: 0,
    icon: "⭐",
  },
];

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

export function getLevelForXp(xp: number): LevelDefinition {
  return (
    [...LEVELS].reverse().find((l) => xp >= l.minXp) ?? LEVELS[0]
  );
}

export function getNextLevel(current: UserLevel): LevelDefinition | null {
  const idx = LEVELS.findIndex((l) => l.name === current);
  return LEVELS[idx + 1] ?? null;
}

export function getXpProgress(xp: number): { current: number; needed: number; percent: number } {
  const level = getLevelForXp(xp);
  const next = getNextLevel(level.name);
  if (!next) return { current: xp - level.minXp, needed: 0, percent: 100 };
  const current = xp - level.minXp;
  const needed = next.minXp - level.minXp;
  return { current, needed, percent: Math.min(Math.round((current / needed) * 100), 100) };
}

export function isFeatureUnlocked(feature: string, xp: number): boolean {
  const level = getLevelForXp(xp);
  return level.unlockedFeatures.includes(feature);
}
