/**
 * Tester for PersonalityEngine — UI-tilpasning basert på Big Five (#98)
 *
 * Verifiserer at ulike Big Five-profiler gir korrekt UI-konfigurasjon:
 * farger, animasjoner, layout, tone og navigasjon.
 */

import { describe, it, expect } from "vitest";
import {
  computePersonalityUI,
  DEFAULT_UI_CONFIG,
  getAnimDuration,
  type PersonalityProfile,
} from "./engine";
import type { BigFiveScores } from "@/types/domain";

// Hjelpefunksjon for å lage profiler
function scores(o: number, c: number, e: number, a: number, n: number): BigFiveScores {
  return { openness: o, conscientiousness: c, extraversion: e, agreeableness: a, neuroticism: n };
}

describe("computePersonalityUI", () => {
  // ─── Profilvalg ──────────────────────────────────────────────────────────

  it("velger 'creative' for høy openness + lav conscientiousness", () => {
    const result = computePersonalityUI(scores(80, 40, 50, 50, 50));
    expect(result.profileKey).toBe("creative");
    expect(result.profileName).toBe("Den kreative");
  });

  it("velger 'social' for høy extraversion + høy agreeableness", () => {
    const result = computePersonalityUI(scores(40, 50, 70, 70, 50));
    expect(result.profileKey).toBe("social");
    expect(result.profileName).toBe("Den sosiale");
  });

  it("velger 'analytic' for høy openness + høy conscientiousness", () => {
    const result = computePersonalityUI(scores(70, 70, 40, 50, 50));
    expect(result.profileKey).toBe("analytic");
    expect(result.profileName).toBe("Den analytiske");
  });

  it("velger 'structured' som fallback", () => {
    const result = computePersonalityUI(scores(40, 40, 40, 40, 50));
    expect(result.profileKey).toBe("structured");
    expect(result.profileName).toBe("Den strukturerte");
  });

  // Prioritet: creative > social > analytic > structured
  it("prioriterer creative over social", () => {
    // Høy openness + lav C, men også høy E + høy A
    const result = computePersonalityUI(scores(80, 40, 70, 70, 50));
    expect(result.profileKey).toBe("creative");
  });

  // ─── Animasjonsintensitet ────────────────────────────────────────────────

  it("gir 'rich' animasjon for ekstravert + åpen person", () => {
    const result = computePersonalityUI(scores(80, 50, 95, 50, 10));
    expect(result.animationIntensity).toBe("rich");
  });

  it("gir 'none' animasjon for høy nevrotisisme + lav ekstraversjon", () => {
    const result = computePersonalityUI(scores(20, 50, 20, 50, 80));
    expect(result.animationIntensity).toBe("none");
  });

  // ─── Layout-tetthet ──────────────────────────────────────────────────────

  it("gir 'compact' layout for samvittighetsfull person", () => {
    const result = computePersonalityUI(scores(70, 80, 50, 50, 50));
    expect(result.layoutDensity).toBe("compact");
  });

  it("gir 'spacious' layout for lav conscientiousness", () => {
    const result = computePersonalityUI(scores(70, 30, 50, 50, 50));
    expect(result.layoutDensity).toBe("spacious");
  });

  // ─── Tone-of-voice ──────────────────────────────────────────────────────

  it("gir 'encouraging' tone for høy agreeableness + extraversion", () => {
    const result = computePersonalityUI(scores(40, 40, 70, 70, 50));
    expect(result.toneOfVoice).toBe("encouraging");
  });

  it("gir 'direct' tone for høy C + lav A", () => {
    const result = computePersonalityUI(scores(40, 80, 40, 40, 50));
    expect(result.toneOfVoice).toBe("direct");
  });

  // ─── Navigasjonsstil ─────────────────────────────────────────────────────

  it("gir 'exploratory' navigasjon for åpen, ustrukturert person", () => {
    const result = computePersonalityUI(scores(80, 40, 50, 50, 50));
    expect(result.navigationStyle).toBe("exploratory");
  });

  it("gir 'linear' navigasjon for strukturert person", () => {
    const result = computePersonalityUI(scores(40, 80, 50, 50, 50));
    expect(result.navigationStyle).toBe("linear");
  });

  // ─── CSS Variables ───────────────────────────────────────────────────────

  it("genererer CSS custom properties", () => {
    const result = computePersonalityUI(scores(50, 50, 50, 50, 50));
    expect(result.cssVars["--personality-primary"]).toBeDefined();
    expect(result.cssVars["--personality-radius"]).toBeDefined();
    expect(result.cssVars["--personality-transition"]).toBeDefined();
    expect(result.cssVars["--personality-spacing-scale"]).toBeDefined();
  });

  it("bruker oklch-format for primærfarge", () => {
    const result = computePersonalityUI(scores(50, 50, 50, 50, 50));
    expect(result.cssVars["--personality-primary"]).toMatch(/^oklch\(/);
  });

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it("håndterer alle scores på 0", () => {
    const result = computePersonalityUI(scores(0, 0, 0, 0, 0));
    expect(result.profileKey).toBe("structured");
    expect(result.animationIntensity).toBeDefined();
  });

  it("håndterer alle scores på 100", () => {
    const result = computePersonalityUI(scores(100, 100, 100, 100, 100));
    expect(result.profileKey).toBeDefined();
    expect(["creative", "social", "analytic", "structured"] as PersonalityProfile[]).toContain(result.profileKey);
  });

  it("returnerer profileDescription for alle profiler", () => {
    for (const profile of [scores(80, 40, 50, 50, 50), scores(40, 50, 70, 70, 50), scores(70, 70, 40, 50, 50), scores(40, 40, 40, 40, 50)]) {
      const result = computePersonalityUI(profile);
      expect(result.profileDescription.length).toBeGreaterThan(10);
    }
  });
});

describe("DEFAULT_UI_CONFIG", () => {
  it("er beregnet fra nøytral profil (50/50/50/50/50)", () => {
    expect(DEFAULT_UI_CONFIG.profileKey).toBe("structured");
    expect(DEFAULT_UI_CONFIG.cssVars).toBeDefined();
  });
});

describe("getAnimDuration", () => {
  it("returnerer 0 for 'none'", () => {
    expect(getAnimDuration("none")).toBe(0);
  });

  it("returnerer riktige verdier for alle intensiteter", () => {
    expect(getAnimDuration("subtle")).toBe(0.15);
    expect(getAnimDuration("moderate")).toBe(0.25);
    expect(getAnimDuration("rich")).toBe(0.4);
  });
});
