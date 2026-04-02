/**
 * Tester for Samordna Opptak 2028-reform dual poengberegning (Issue #98, #114)
 *
 * Kritisk forretningslogikk — feil her vil gi elever feil informasjon
 * om hvilke studier de kan komme inn på.
 */

import { describe, it, expect } from "vitest";
import {
  getAdmissionSystem,
  calculateBonusPointsLegacy,
  calculateBonusPointsReform,
  calculateDualSystemPoints,
  calculateGradePoints,
  type GradeWithId,
} from "./calculator";

// ─── Testdata ─────────────────────────────────────────────────────────────────

const makeGrade = (
  subject: string,
  grade: 1 | 2 | 3 | 4 | 5 | 6,
  fagkode?: string
): GradeWithId => ({
  id: subject,
  userId: "test-user",
  subject,
  grade,
  term: "ht",
  year: 2024,
  programSubjectId: null,
  fagkode: fagkode ?? null,
  createdAt: null,
  updatedAt: null,
});

const SAMPLE_GRADES: GradeWithId[] = [
  makeGrade("Matematikk R2", 5, "MAT3206"),
  makeGrade("Norsk", 5),
  makeGrade("Engelsk", 4),
  makeGrade("Historie", 4),
  makeGrade("Samfunnsfag", 5),
];

// ─── getAdmissionSystem ───────────────────────────────────────────────────────

describe("getAdmissionSystem", () => {
  it("returnerer 'legacy' for avgangskull 2026", () => {
    expect(getAdmissionSystem(2026)).toBe("legacy");
  });

  it("returnerer 'legacy' for avgangskull 2027", () => {
    expect(getAdmissionSystem(2027)).toBe("legacy");
  });

  it("returnerer 'reform-2028' for avgangskull 2028", () => {
    expect(getAdmissionSystem(2028)).toBe("reform-2028");
  });

  it("returnerer 'reform-2028' for avgangskull 2030", () => {
    expect(getAdmissionSystem(2030)).toBe("reform-2028");
  });
});

// ─── calculateBonusPointsLegacy ───────────────────────────────────────────────

describe("calculateBonusPointsLegacy", () => {
  it("beregner kun realfagspoeng uten tilleggalternativer", () => {
    const result = calculateBonusPointsLegacy(3);
    expect(result.sciencePoints).toBe(3);
    expect(result.agePoints).toBe(0);
    expect(result.folkHighSchool).toBe(0);
    expect(result.military).toBe(0);
    expect(result.total).toBe(3);
  });

  it("begrenser realfagspoeng til maks 4", () => {
    const result = calculateBonusPointsLegacy(10);
    expect(result.sciencePoints).toBe(4);
  });

  it("beregner alderspoeng: 21 år = 4 poeng (2 år over 19)", () => {
    const result = calculateBonusPointsLegacy(0, { age: 21 });
    expect(result.agePoints).toBe(4);
  });

  it("beregner alderspoeng maks 8 for alder ≥ 23", () => {
    const result = calculateBonusPointsLegacy(0, { age: 25 });
    expect(result.agePoints).toBe(8);
  });

  it("gir 2 poeng for folkehøgskole", () => {
    const result = calculateBonusPointsLegacy(0, { folkHighSchool: true });
    expect(result.folkHighSchool).toBe(2);
    expect(result.total).toBe(2);
  });

  it("gir 2 poeng for militærtjeneste", () => {
    const result = calculateBonusPointsLegacy(0, { military: true });
    expect(result.military).toBe(2);
    expect(result.total).toBe(2);
  });

  it("begrenser totalt til maks 14 poeng", () => {
    // 4 realfag + 8 alderspoeng + 2 folkehøgskole + 2 militær = 16 → maks 14
    const result = calculateBonusPointsLegacy(4, {
      age: 25,
      folkHighSchool: true,
      military: true,
    });
    expect(result.total).toBe(14);
  });

  it("total med realfag + militær + folkehøgskole", () => {
    const result = calculateBonusPointsLegacy(3, {
      folkHighSchool: true,
      military: true,
    });
    expect(result.total).toBe(7); // 3 + 2 + 2
  });
});

// ─── calculateBonusPointsReform ───────────────────────────────────────────────

describe("calculateBonusPointsReform", () => {
  it("beregner kun realfagspoeng uten militær", () => {
    const result = calculateBonusPointsReform(3);
    expect(result.sciencePoints).toBe(3);
    expect(result.military).toBe(0);
    expect(result.total).toBe(3);
  });

  it("begrenser til maks 4 totalt (4 realfag, ingen militær)", () => {
    const result = calculateBonusPointsReform(4);
    expect(result.total).toBe(4);
  });

  it("gir 2 poeng for militærtjeneste", () => {
    const result = calculateBonusPointsReform(0, { military: true });
    expect(result.military).toBe(2);
    expect(result.total).toBe(2);
  });

  it("begrenser totalt til maks 4 med realfag + militær", () => {
    // 4 realfag + 2 militær = 6 → maks 4
    const result = calculateBonusPointsReform(4, { military: true });
    expect(result.total).toBe(4);
  });

  it("legger IKKE til alderspoeng (fjernet i reform)", () => {
    // Reform-2028 har ingen age-parameter
    const result = calculateBonusPointsReform(2);
    // Ingen age-felt i resultatet
    expect("agePoints" in result).toBe(false);
  });

  it("legger IKKE til folkehøgskolepoeng (fjernet i reform)", () => {
    const result = calculateBonusPointsReform(2);
    expect("folkHighSchool" in result).toBe(false);
  });
});

// ─── calculateDualSystemPoints ────────────────────────────────────────────────

describe("calculateDualSystemPoints", () => {
  it("legacy-total er større enn reform-total med alderspoeng", () => {
    const dual = calculateDualSystemPoints(SAMPLE_GRADES, "legacy", { age: 22 });
    expect(dual.totalLegacy).toBeGreaterThan(dual.totalReform);
  });

  it("activeTotal bruker legacy-system når system er 'legacy'", () => {
    const dual = calculateDualSystemPoints(SAMPLE_GRADES, "legacy");
    expect(dual.activeTotal).toBe(dual.totalLegacy);
    expect(dual.activeSystem).toBe("legacy");
  });

  it("activeTotal bruker reform-system når system er 'reform-2028'", () => {
    const dual = calculateDualSystemPoints(SAMPLE_GRADES, "reform-2028");
    expect(dual.activeTotal).toBe(dual.totalReform);
    expect(dual.activeSystem).toBe("reform-2028");
  });

  it("quotaPoints er lik i begge systemer (karakterer endres ikke)", () => {
    const dual = calculateDualSystemPoints(SAMPLE_GRADES, "legacy");
    const base = calculateGradePoints(SAMPLE_GRADES);
    expect(dual.quotaPoints).toBe(base.quotaPoints);
  });

  it("reform totalReform ≤ 64 poeng (maks)", () => {
    // Lag et datasett med alle 6-ere
    const maxGrades = Array.from({ length: 10 }, (_, i) =>
      makeGrade(`Fag ${i}`, 6)
    );
    const dual = calculateDualSystemPoints(maxGrades, "reform-2028");
    expect(dual.totalReform).toBeLessThanOrEqual(64);
  });

  it("legacy totalLegacy ≤ 74 poeng (60 + 14 maks)", () => {
    const maxGrades = Array.from({ length: 10 }, (_, i) =>
      makeGrade(`Fag ${i}`, 6)
    );
    const dual = calculateDualSystemPoints(maxGrades, "legacy", {
      age: 25, folkHighSchool: true, military: true,
    });
    expect(dual.totalLegacy).toBeLessThanOrEqual(74);
  });

  it("realfagspoeng (R2 = 3p) telles i begge systemer", () => {
    const dual = calculateDualSystemPoints(SAMPLE_GRADES, "legacy");
    expect(dual.sciencePoints).toBe(3); // MAT3206 = R2 = 3p
    expect(dual.legacy.sciencePoints).toBe(3);
    expect(dual.reform.sciencePoints).toBe(3);
  });
});
