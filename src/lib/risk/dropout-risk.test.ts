/**
 * Unit-tester for frafallsrisiko-modell (Issue #23)
 */

import { describe, it, expect } from "vitest";
import { computeDropoutRisk, formatRiskSummary } from "./dropout-risk";
import type { DropoutRiskInput } from "./dropout-risk";

const BASE_INPUT: DropoutRiskInput = {
  userId: "test-user",
  daysSinceLastLogin: 1,
  loginsLast30Days: 10,
  onboardingCompletionPct: 100,
  bigFiveCompleted: true,
  gradesCount: 5,
  programfagSelected: true,
  careerPathsViewed: 5,
  hasUsedAiAssistant: true,
  gradeAverage: 4.0,
  neuroticism: 30,
  conscientiousness: 70,
};

describe("computeDropoutRisk", () => {
  it("returnerer lav risiko for aktiv og engasjert elev", () => {
    const result = computeDropoutRisk(BASE_INPUT);
    expect(result.level).toBe("low");
    expect(result.score).toBeLessThan(40);
    expect(result.userId).toBe("test-user");
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("returnerer høy risiko for inaktiv elev uten noe fullført", () => {
    const result = computeDropoutRisk({
      userId: "inaktiv",
      daysSinceLastLogin: 60,
      loginsLast30Days: 0,
      onboardingCompletionPct: 0,
      bigFiveCompleted: false,
      gradesCount: 0,
      programfagSelected: false,
      careerPathsViewed: 0,
      hasUsedAiAssistant: false,
      gradeAverage: null,
    });
    expect(result.level).toBe("high");
    expect(result.score).toBeGreaterThan(70);
  });

  it("returnerer moderat risiko for delvis engasjert elev", () => {
    const result = computeDropoutRisk({
      ...BASE_INPUT,
      daysSinceLastLogin: 25,
      loginsLast30Days: 1,
      onboardingCompletionPct: 30,
      bigFiveCompleted: false,
      gradesCount: 0,
      programfagSelected: false,
      hasUsedAiAssistant: false,
      gradeAverage: 2.8,
      neuroticism: 70,
    });
    expect(result.level).toBe("medium");
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
  });

  it("høy neuroticism øker risikoscoren", () => {
    const low = computeDropoutRisk({ ...BASE_INPUT, neuroticism: 20 });
    const high = computeDropoutRisk({ ...BASE_INPUT, neuroticism: 90 });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("lav conscientiousness øker risikoscoren", () => {
    const high = computeDropoutRisk({ ...BASE_INPUT, conscientiousness: 80 });
    const low = computeDropoutRisk({ ...BASE_INPUT, conscientiousness: 10 });
    expect(low.score).toBeGreaterThan(high.score);
  });

  it("dårlig karaktersnitt øker risikoscoren", () => {
    const good = computeDropoutRisk({ ...BASE_INPUT, gradeAverage: 5.0 });
    const bad = computeDropoutRisk({ ...BASE_INPUT, gradeAverage: 2.0 });
    expect(bad.score).toBeGreaterThan(good.score);
  });

  it("returnerer alltid score mellom 0 og 100", () => {
    for (const input of [BASE_INPUT, {
      userId: "x", daysSinceLastLogin: null, loginsLast30Days: 0,
      onboardingCompletionPct: 0, bigFiveCompleted: false, gradesCount: 0,
      programfagSelected: false, careerPathsViewed: 0, hasUsedAiAssistant: false,
      gradeAverage: null,
    }]) {
      const result = computeDropoutRisk(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it("inkluderer computedAt dato", () => {
    const result = computeDropoutRisk(BASE_INPUT);
    expect(result.computedAt).toBeInstanceOf(Date);
  });
});

describe("formatRiskSummary", () => {
  it("inkluderer risikonivå og score i sammendrag", () => {
    const result = computeDropoutRisk(BASE_INPUT);
    const summary = formatRiskSummary(result);
    expect(summary).toContain("Frafallsrisiko:");
    expect(summary).toContain(result.score.toString());
  });

  it("bruker norsk risikoetiketter", () => {
    const low = computeDropoutRisk(BASE_INPUT);
    expect(formatRiskSummary(low)).toContain("Lav");

    const high = computeDropoutRisk({
      userId: "x", daysSinceLastLogin: 60, loginsLast30Days: 0,
      onboardingCompletionPct: 0, bigFiveCompleted: false, gradesCount: 0,
      programfagSelected: false, careerPathsViewed: 0, hasUsedAiAssistant: false,
      gradeAverage: null,
    });
    expect(formatRiskSummary(high)).toContain("Høy");
  });
});
