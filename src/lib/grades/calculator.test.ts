import { describe, it, expect } from "vitest";
import { calculateGradePoints } from "./calculator";
import type { GradeWithId } from "./calculator";

function makeGrade(
  overrides: Partial<GradeWithId> & { grade: number; subject: string }
): GradeWithId {
  return {
    id: Math.random().toString(36),
    userId: overrides.userId ?? "test-user",
    subject: overrides.subject,
    grade: overrides.grade,
    term: overrides.term ?? "vt",
    year: overrides.year ?? 2024,
    fagkode: overrides.fagkode ?? null,
    programSubjectId: overrides.programSubjectId ?? null,
    createdAt: null,
    updatedAt: null,
  };
}

describe("calculateGradePoints", () => {
  it("returnerer nullverdier for tom liste", () => {
    const result = calculateGradePoints([]);
    expect(result.average).toBe(0);
    expect(result.quotaPoints).toBe(0);
    expect(result.sciencePoints).toBe(0);
    expect(result.totalPoints).toBe(0);
    expect(result.subjectCount).toBe(0);
  });

  it("beregner gjennomsnitt og SO-poeng korrekt", () => {
    const grades = [
      makeGrade({ subject: "Norsk", grade: 5 }),
      makeGrade({ subject: "Matematikk", grade: 4 }),
      makeGrade({ subject: "Engelsk", grade: 6 }),
    ];
    const result = calculateGradePoints(grades);
    // Gjennomsnitt = (5+4+6)/3 = 5.0
    expect(result.average).toBeCloseTo(5.0, 1);
    // SO-poeng = 5.0 * 10 = 50
    expect(result.quotaPoints).toBe(50);
    expect(result.sciencePoints).toBe(0);
    expect(result.totalPoints).toBe(50);
  });

  it("legger til realfagspoeng for MAT3206 (R2 = 3p)", () => {
    const grades = [
      makeGrade({ subject: "Matematikk R2", grade: 5, fagkode: "MAT3206" }),
      makeGrade({ subject: "Norsk", grade: 4 }),
    ];
    const result = calculateGradePoints(grades);
    expect(result.sciencePoints).toBe(3);
    expect(result.totalPoints).toBe(result.quotaPoints + 3);
  });

  it("begrenser realfagspoeng til 4", () => {
    const grades = [
      makeGrade({ subject: "Matematikk R2", grade: 6, fagkode: "MAT3206" }), // 3p
      makeGrade({ subject: "Fysikk 2", grade: 6, fagkode: "FYS3101" }),       // 2p
      makeGrade({ subject: "Kjemi 2", grade: 6, fagkode: "KJE3101" }),        // 2p
    ];
    const result = calculateGradePoints(grades);
    // Totalt realfagspoeng = 3+2+2 = 7, men begrenses til 4
    expect(result.sciencePoints).toBe(4);
  });

  it("bruker nyeste karakter når samme fag er tatt to ganger", () => {
    const grades = [
      makeGrade({ subject: "Norsk", grade: 3, year: 2023, term: "vt", fagkode: "NOR3101" }),
      makeGrade({ subject: "Norsk", grade: 5, year: 2024, term: "vt", fagkode: "NOR3101" }),
    ];
    const result = calculateGradePoints(grades);
    // Kun nyeste (5) skal brukes
    expect(result.average).toBe(5);
    expect(result.subjectCount).toBe(1);
  });

  it("foretrekker ht fremfor vt samme år", () => {
    const grades = [
      makeGrade({ subject: "Norsk", grade: 3, year: 2024, term: "vt", fagkode: "NOR3101" }),
      makeGrade({ subject: "Norsk", grade: 5, year: 2024, term: "ht", fagkode: "NOR3101" }),
    ];
    const result = calculateGradePoints(grades);
    expect(result.average).toBe(5);
  });

  it("begrenser SO-poeng til 60 (maks karakter 6)", () => {
    const grades = Array.from({ length: 10 }, (_, i) =>
      makeGrade({ subject: `Fag${i}`, grade: 6 })
    );
    const result = calculateGradePoints(grades);
    expect(result.quotaPoints).toBe(60);
  });

  it("begrenser totalpoeng til 64", () => {
    const grades = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeGrade({ subject: `Fag${i}`, grade: 6 })
      ),
      makeGrade({ subject: "Matematikk R2", grade: 6, fagkode: "MAT3206" }),
      makeGrade({ subject: "Fysikk 2", grade: 6, fagkode: "FYS3101" }),
    ];
    const result = calculateGradePoints(grades);
    expect(result.totalPoints).toBeLessThanOrEqual(64);
  });

  it("ignorerer fag uten fagkode i realfagsberegning", () => {
    const grades = [
      makeGrade({ subject: "Matematikk R2", grade: 6, fagkode: undefined }),
    ];
    const result = calculateGradePoints(grades);
    expect(result.sciencePoints).toBe(0);
  });
});
