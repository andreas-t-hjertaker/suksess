import { describe, it, expect } from "vitest";
import {
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  CAREER_NODES,
} from "./data";
import type { RiasecScores } from "@/types/domain";

const fullRiasec: RiasecScores = {
  realistic: 80,
  investigative: 90,
  artistic: 60,
  social: 70,
  enterprising: 50,
  conventional: 40,
};

describe("calcFitScore", () => {
  it("returnerer 50 for null RIASEC", () => {
    const career = CAREER_NODES[0];
    // @ts-expect-error tester null-guard
    expect(calcFitScore(career, null)).toBe(50);
  });

  it("beregner gjennomsnittet av karrierens RIASEC-koder", () => {
    const riasec: RiasecScores = {
      realistic: 100,
      investigative: 100,
      artistic: 100,
      social: 100,
      enterprising: 100,
      conventional: 100,
    };
    // Alle koder = 100, gjennomsnitt = 100
    for (const career of CAREER_NODES) {
      expect(calcFitScore(career, riasec)).toBe(100);
    }
  });

  it("beregner 0 for alle koder = 0", () => {
    const riasec: RiasecScores = {
      realistic: 0,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0,
    };
    for (const career of CAREER_NODES) {
      expect(calcFitScore(career, riasec)).toBe(0);
    }
  });

  it("beregner riktig gjennomsnittscore", () => {
    // programvareutvikler: ["investigative", "realistic", "conventional"]
    const sw = CAREER_NODES.find((c) => c.id === "software-engineer")!;
    const riasec: RiasecScores = {
      realistic: 60,
      investigative: 90,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 30,
    };
    // (90+60+30)/3 = 60
    expect(calcFitScore(sw, riasec)).toBe(60);
  });

  it("returnerer et heltall", () => {
    const career = CAREER_NODES[0];
    const score = calcFitScore(career, fullRiasec);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("score er i intervallet 0–100", () => {
    for (const career of CAREER_NODES) {
      const score = calcFitScore(career, fullRiasec);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("fitScoreColor", () => {
  it("grønn for score >= 70", () => {
    expect(fitScoreColor(70)).toContain("green");
    expect(fitScoreColor(100)).toContain("green");
  });

  it("amber for score 45–69", () => {
    expect(fitScoreColor(45)).toContain("amber");
    expect(fitScoreColor(69)).toContain("amber");
  });

  it("muted for score < 45", () => {
    expect(fitScoreColor(44)).toContain("muted");
    expect(fitScoreColor(0)).toContain("muted");
  });
});

describe("fitScoreBg", () => {
  it("grønn bakgrunn for score >= 70", () => {
    expect(fitScoreBg(70)).toContain("green");
  });

  it("amber bakgrunn for score 45–69", () => {
    expect(fitScoreBg(50)).toContain("amber");
  });

  it("muted bakgrunn for score < 45", () => {
    expect(fitScoreBg(44)).toContain("muted");
  });
});

describe("CAREER_NODES data-integritet", () => {
  it("alle noder har påkrevde felt", () => {
    for (const node of CAREER_NODES) {
      expect(node.id).toBeTruthy();
      expect(node.title).toBeTruthy();
      expect(node.sector).toBeTruthy();
      expect(node.riasecCodes.length).toBeGreaterThan(0);
      expect(node.medianSalary).toBeGreaterThan(0);
      expect(["vgs", "fagbrev", "bachelor", "master", "phd"]).toContain(node.educationLevel);
      expect(["high", "medium", "low"]).toContain(node.demand);
    }
  });

  it("unike IDer", () => {
    const ids = CAREER_NODES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("minst 20 karrierenoder", () => {
    expect(CAREER_NODES.length).toBeGreaterThanOrEqual(20);
  });
});
