/**
 * PersonalityEngine — mapper Big Five-profil til CSS design-tokens og UI-konfigurasjon.
 *
 * Produserer:
 * - cssVars: CSS custom properties (injiseres i <html>-elementet)
 * - uiConfig: React-tilgjengelig konfigurasjon for layouts, animasjoner, tone
 */

import type { BigFiveScores, RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type AnimationIntensity = "none" | "subtle" | "moderate" | "rich";
export type LayoutDensity = "compact" | "comfortable" | "spacious";
export type InfoDensity = "minimal" | "standard" | "detailed";
export type ToneOfVoice = "formal" | "friendly" | "direct" | "encouraging";
export type NavigationStyle = "linear" | "exploratory";

export type PersonalityUIConfig = {
  /** Navn på den beregnede profilen (én av 4) */
  profileName: string;
  /** Profilbeskrivelse til bruk i UI */
  profileDescription: string;
  animationIntensity: AnimationIntensity;
  layoutDensity: LayoutDensity;
  infoDensity: InfoDensity;
  toneOfVoice: ToneOfVoice;
  navigationStyle: NavigationStyle;
  /** CSS custom properties å sette på :root */
  cssVars: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

/** Lineær interpolasjon mellom to verdier basert på score 0–100 */
function lerp(score: number, low: number, high: number): number {
  return low + (score / 100) * (high - low);
}

/** Rund til 2 desimaler */
function r(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Fargepaletter (OKLCH-hue per profil)
// ---------------------------------------------------------------------------

// OKLCH-farger: (L, C, H) — H er hue i grader
// Fargene er designet for WCAG AA-kontrast

const PALETTES = {
  // Blå/indigo — analytisk, rolig
  analytic: {
    primaryL: 0.55,
    primaryC: 0.18,
    primaryH: 250,
    accentH: 220,
  },
  // Fiolett/magenta — kreativ, ekspressiv
  creative: {
    primaryL: 0.52,
    primaryC: 0.2,
    primaryH: 295,
    accentH: 330,
  },
  // Varm grønn/teal — sosial, varm
  social: {
    primaryL: 0.52,
    primaryC: 0.16,
    primaryH: 170,
    accentH: 145,
  },
  // Slate blå — strukturert, pålitelig
  structured: {
    primaryL: 0.48,
    primaryC: 0.14,
    primaryH: 230,
    accentH: 210,
  },
} as const;

type PaletteKey = keyof typeof PALETTES;

// ---------------------------------------------------------------------------
// Kjernealgoritme
// ---------------------------------------------------------------------------

export function computePersonalityUI(
  bigFive: BigFiveScores,
  riasec?: RiasecScores | null
): PersonalityUIConfig {
  const { openness, conscientiousness, extraversion, agreeableness, neuroticism } = bigFive;

  // --- Velg profil ---
  let profileKey: PaletteKey;
  let profileName: string;
  let profileDescription: string;

  const isCreative = openness > 65 && conscientiousness < 55;
  const isSocial = extraversion > 60 && agreeableness > 60;
  const isAnalytic = openness > 55 && conscientiousness > 60;

  if (isCreative) {
    profileKey = "creative";
    profileName = "Den kreative";
    profileDescription = "Utforskende layout med rik visuell presentasjon.";
  } else if (isSocial) {
    profileKey = "social";
    profileName = "Den sosiale";
    profileDescription = "Varm tone med samarbeidselementer i fokus.";
  } else if (isAnalytic) {
    profileKey = "analytic";
    profileName = "Den analytiske";
    profileDescription = "Detaljert informasjon med strukturerte oversikter.";
  } else {
    profileKey = "structured";
    profileName = "Den strukturerte";
    profileDescription = "Ryddig, forutsigbar navigasjon med klare steg.";
  }

  const palette = PALETTES[profileKey];

  // --- Animasjonsintensitet: reduseres av høy nevrotisisme, økes av høy extraversjon ---
  const rawAnimScore = (extraversion * 0.5 + openness * 0.3 - neuroticism * 0.2) / 100;
  let animationIntensity: AnimationIntensity;
  if (rawAnimScore > 0.65) animationIntensity = "rich";
  else if (rawAnimScore > 0.45) animationIntensity = "moderate";
  else if (rawAnimScore > 0.25) animationIntensity = "subtle";
  else animationIntensity = "none";

  // --- Layout-tetthet: høy conscientiousness → kompakt ---
  let layoutDensity: LayoutDensity;
  if (conscientiousness > 65) layoutDensity = "compact";
  else if (conscientiousness < 40) layoutDensity = "spacious";
  else layoutDensity = "comfortable";

  // --- Informasjonstetthet ---
  let infoDensity: InfoDensity;
  if (conscientiousness > 65 && openness > 55) infoDensity = "detailed";
  else if (conscientiousness < 40 || openness < 40) infoDensity = "minimal";
  else infoDensity = "standard";

  // --- Tone-of-voice ---
  let toneOfVoice: ToneOfVoice;
  if (agreeableness > 65 && extraversion > 55) toneOfVoice = "encouraging";
  else if (extraversion > 65) toneOfVoice = "friendly";
  else if (conscientiousness > 65 && agreeableness < 50) toneOfVoice = "direct";
  else toneOfVoice = "formal";

  // --- Navigasjonsstil ---
  const navigationStyle: NavigationStyle =
    openness > 60 && conscientiousness < 60 ? "exploratory" : "linear";

  // --- CSS custom properties ---

  // Primærfarge
  const primaryLight = `oklch(${palette.primaryL} ${palette.primaryC} ${palette.primaryH})`;
  const primaryDark = `oklch(${r(palette.primaryL + 0.2)} ${r(palette.primaryC - 0.03)} ${palette.primaryH})`;

  // Border-radius: runder for høy agreeableness
  const baseRadius = r(lerp(agreeableness, 0.25, 0.875));
  const radiusRem = `${baseRadius}rem`;

  // Animasjonshastighet (transition-duration i sekunder)
  const animSpeedMap: Record<AnimationIntensity, string> = {
    none: "0ms",
    subtle: "150ms",
    moderate: "250ms",
    rich: "400ms",
  };
  const animSpeed = animSpeedMap[animationIntensity];

  // Bokstavavstand: høyere for formell/analytisk
  const letterSpacing = toneOfVoice === "formal" || toneOfVoice === "direct"
    ? "-0.01em"
    : "0em";

  const cssVars: Record<string, string> = {
    // Primærfarge (light)
    "--personality-primary": primaryLight,
    "--personality-primary-dark": primaryDark,

    // Border radius
    "--personality-radius": radiusRem,

    // Animasjonshastighet
    "--personality-transition": animSpeed,

    // Typografi
    "--personality-letter-spacing": letterSpacing,

    // Info-tetthet: linjehøyde
    "--personality-line-height": infoDensity === "minimal" ? "1.5" : infoDensity === "detailed" ? "1.7" : "1.6",

    // Layout-padding-multiplier som data-attributt (brukes av komponenter)
    "--personality-spacing-scale": layoutDensity === "compact" ? "0.85" : layoutDensity === "spacious" ? "1.2" : "1",
  };

  return {
    profileName,
    profileDescription,
    animationIntensity,
    layoutDensity,
    infoDensity,
    toneOfVoice,
    navigationStyle,
    cssVars,
  };
}

// ---------------------------------------------------------------------------
// Standardprofil (brukes som fallback før profil er lastet)
// ---------------------------------------------------------------------------

export const DEFAULT_UI_CONFIG: PersonalityUIConfig = computePersonalityUI({
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
});

// ---------------------------------------------------------------------------
// Animasjonsvarighet i ms for framer-motion
// ---------------------------------------------------------------------------

export function getAnimDuration(intensity: AnimationIntensity): number {
  return { none: 0, subtle: 0.15, moderate: 0.25, rich: 0.4 }[intensity];
}
