/**
 * Tester for personalityzation-basert tema-forslag (#148)
 */

import { describe, it, expect } from "vitest";
import { suggestThemeFromPersonality, isNightTime } from "./theme-suggestion";
import type { BigFiveScores } from "@/types/domain";

const BASE_SCORES: BigFiveScores = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
};

describe("suggestThemeFromPersonality (#148)", () => {
  it("returnerer system uten profil", () => {
    expect(suggestThemeFromPersonality(null).suggestedTheme).toBe("system");
    expect(suggestThemeFromPersonality(undefined).suggestedTheme).toBe("system");
  });

  it("foreslår dark mode ved høy neuroticism og lav extraversion", () => {
    const result = suggestThemeFromPersonality({
      ...BASE_SCORES,
      neuroticism: 70,
      extraversion: 40,
    });
    expect(result.suggestedTheme).toBe("dark");
    expect(result.reason).not.toBeNull();
  });

  it("foreslår dark mode ved veldig lav extraversion", () => {
    const result = suggestThemeFromPersonality({
      ...BASE_SCORES,
      extraversion: 30,
    });
    expect(result.suggestedTheme).toBe("dark");
    expect(result.reason).toContain("dark mode");
  });

  it("foreslår light mode ved høy extraversion og lav neuroticism", () => {
    const result = suggestThemeFromPersonality({
      ...BASE_SCORES,
      extraversion: 80,
      neuroticism: 25,
    });
    expect(result.suggestedTheme).toBe("light");
  });

  it("returnerer system for balansert profil", () => {
    const result = suggestThemeFromPersonality(BASE_SCORES);
    expect(result.suggestedTheme).toBe("system");
    expect(result.reason).toBeNull();
  });

  it("returnerer system for moderat introvert", () => {
    const result = suggestThemeFromPersonality({
      ...BASE_SCORES,
      extraversion: 40,
    });
    expect(result.suggestedTheme).toBe("system");
  });
});

describe("isNightTime", () => {
  it("returnerer en boolean", () => {
    expect(typeof isNightTime()).toBe("boolean");
  });
});
