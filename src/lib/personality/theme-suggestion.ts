/**
 * Personalityzation-basert tema-forslag (#148)
 *
 * Bruker Big Five-profil til å foreslå dark/light mode:
 * - Høy Neuroticism (N > 65) → Foreslå dark mode (demper visuell stimulering)
 * - Lav Extraversion (E < 35) → Foreslå dark mode (introverte foretrekker rolige grensesnitt)
 * - Ellers: respekter systeminnstilling
 */

import type { BigFiveScores } from "@/types/domain";

export type ThemeSuggestion = {
  suggestedTheme: "dark" | "light" | "system";
  reason: string | null;
};

/**
 * Foreslå tema basert på personlighetsprofil.
 * Returnerer "system" hvis ingen sterk anbefaling.
 */
export function suggestThemeFromPersonality(
  bigFive: BigFiveScores | null | undefined
): ThemeSuggestion {
  if (!bigFive) {
    return { suggestedTheme: "system", reason: null };
  }

  // Høy neuroticism → dark mode reduserer visuelt stress
  if (bigFive.neuroticism > 65 && bigFive.extraversion < 50) {
    return {
      suggestedTheme: "dark",
      reason: "Basert på profilen din kan et roligere, mørkere grensesnitt passe bedre for deg.",
    };
  }

  // Veldig introvert → foretrekker ofte dempede grensesnitt
  if (bigFive.extraversion < 35) {
    return {
      suggestedTheme: "dark",
      reason: "Mange med din profil foretrekker dark mode — vil du prøve?",
    };
  }

  // Veldig ekstrovert → light mode med mer energi
  if (bigFive.extraversion > 75 && bigFive.neuroticism < 35) {
    return {
      suggestedTheme: "light",
      reason: null, // Ikke vis forslag for light (det er standard for mange)
    };
  }

  return { suggestedTheme: "system", reason: null };
}

/**
 * Sjekk om det er nattetid (22:00–06:00) for automatisk dark mode.
 */
export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}
