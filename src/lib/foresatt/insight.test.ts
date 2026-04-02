/**
 * Tester for foresatt-innsikt og GDPR-filtrering (#106)
 *
 * Verifiserer at:
 * - Rå Big Five/RIASEC-tall aldri eksponeres
 * - Topp RIASEC kun returnerer kategorinavn
 * - Karriereliste er begrenset og deduplisert
 * - Achievements er sortert og begrenset
 * - Onboarding-fremdrift beregnes korrekt
 */

import { describe, it, expect } from "vitest";
import type { RiasecScores } from "@/types/domain";
import {
  getTopRiasecCategories,
  emptyInsight,
  calculateOnboardingProgress,
  filterRecentCareers,
  filterRecentAchievements,
  RIASEC_LABELS,
} from "./insight";

// ─── RIASEC-filtrering (GDPR-kritisk) ──────────────────────────────────────

describe("getTopRiasecCategories (#106)", () => {
  const riasec: RiasecScores = {
    realistic: 30,
    investigative: 90,
    artistic: 70,
    social: 85,
    enterprising: 40,
    conventional: 20,
  };

  it("returnerer topp 3 kategorier sortert etter verdi", () => {
    const top = getTopRiasecCategories(riasec);
    expect(top).toEqual(["Analytisk", "Sosial", "Kreativ"]);
  });

  it("returnerer KUN norske kategorinavn, aldri tallverdier", () => {
    const top = getTopRiasecCategories(riasec);
    for (const name of top) {
      expect(typeof name).toBe("string");
      // Ingen tall i resultatet
      expect(name).not.toMatch(/\d/);
      // Må være en gyldig norsk label
      expect(Object.values(RIASEC_LABELS)).toContain(name);
    }
  });

  it("returnerer tom liste for null RIASEC", () => {
    expect(getTopRiasecCategories(null)).toEqual([]);
    expect(getTopRiasecCategories(undefined)).toEqual([]);
  });

  it("returnerer 3 kategorier selv med like verdier", () => {
    const equal: RiasecScores = {
      realistic: 50,
      investigative: 50,
      artistic: 50,
      social: 50,
      enterprising: 50,
      conventional: 50,
    };
    const top = getTopRiasecCategories(equal);
    expect(top).toHaveLength(3);
  });

  it("eksponerer aldri rå tallverdier i return-typen", () => {
    const top = getTopRiasecCategories(riasec);
    // Sjekk at input-tallene (90, 85, 70) ikke finnes i output
    const topStr = JSON.stringify(top);
    expect(topStr).not.toContain("90");
    expect(topStr).not.toContain("85");
    expect(topStr).not.toContain("70");
    expect(topStr).not.toContain("30");
  });
});

// ─── emptyInsight ───────────────────────────────────────────────────────────

describe("emptyInsight (#106)", () => {
  it("returnerer alle felt med null/0/false/tom verdi", () => {
    const insight = emptyInsight();
    expect(insight.xpTotal).toBe(0);
    expect(insight.streak).toBe(0);
    expect(insight.personalityTestComplete).toBe(false);
    expect(insight.topRiasecCategories).toEqual([]);
    expect(insight.recentCareers).toEqual([]);
    expect(insight.lastActiveAt).toBeNull();
  });

  it("har totalOnboardingSteps = 5", () => {
    expect(emptyInsight().totalOnboardingSteps).toBe(5);
  });
});

// ─── Onboarding-fremdrift ───────────────────────────────────────────────────

describe("calculateOnboardingProgress (#106)", () => {
  it("returnerer 0/5 for helt ny bruker", () => {
    const result = calculateOnboardingProgress({
      hasProfile: false,
      hasGrades: false,
      hasCareerExplored: false,
      hasAiChat: false,
      onboardingComplete: false,
    });
    expect(result).toEqual({ completed: 0, total: 5 });
  });

  it("returnerer 5/5 for fullført bruker", () => {
    const result = calculateOnboardingProgress({
      hasProfile: true,
      hasGrades: true,
      hasCareerExplored: true,
      hasAiChat: true,
      onboardingComplete: true,
    });
    expect(result).toEqual({ completed: 5, total: 5 });
  });

  it("teller delvis fremdrift", () => {
    const result = calculateOnboardingProgress({
      hasProfile: true,
      hasGrades: true,
      hasCareerExplored: false,
      hasAiChat: false,
      onboardingComplete: false,
    });
    expect(result.completed).toBe(2);
  });
});

// ─── Karrierefiltrering ─────────────────────────────────────────────────────

describe("filterRecentCareers (#106)", () => {
  it("begrenser til maks 5 karrierer", () => {
    const careers = [
      "Lege", "Sykepleier", "Programvareutvikler", "Psykolog",
      "Arkitekt", "Lærer", "Journalist",
    ];
    expect(filterRecentCareers(careers)).toHaveLength(5);
  });

  it("fjerner duplikater", () => {
    const careers = ["Lege", "Lege", "Sykepleier", "Lege"];
    expect(filterRecentCareers(careers)).toEqual(["Lege", "Sykepleier"]);
  });

  it("returnerer tom liste for tom input", () => {
    expect(filterRecentCareers([])).toEqual([]);
  });
});

// ─── Achievement-filtrering ─────────────────────────────────────────────────

describe("filterRecentAchievements (#106)", () => {
  it("begrenser til maks 3 achievements", () => {
    const achievements = [
      { title: "Nybegynner", earnedAt: new Date("2026-01-01") },
      { title: "Utforsker", earnedAt: new Date("2026-02-01") },
      { title: "Karriereklar", earnedAt: new Date("2026-03-01") },
      { title: "Veteran", earnedAt: new Date("2026-04-01") },
    ];
    expect(filterRecentAchievements(achievements)).toHaveLength(3);
  });

  it("sorterer nyeste først", () => {
    const achievements = [
      { title: "Eldst", earnedAt: new Date("2025-01-01") },
      { title: "Nyest", earnedAt: new Date("2026-04-01") },
      { title: "Midt", earnedAt: new Date("2026-02-01") },
    ];
    expect(filterRecentAchievements(achievements)[0]).toBe("Nyest");
  });

  it("returnerer kun titler (strenger)", () => {
    const achievements = [{ title: "Test", earnedAt: new Date() }];
    const result = filterRecentAchievements(achievements);
    expect(result).toEqual(["Test"]);
  });

  it("håndterer manglende earnedAt", () => {
    const achievements = [{ title: "Uten dato" }];
    expect(filterRecentAchievements(achievements)).toEqual(["Uten dato"]);
  });
});
