import { describe, it, expect } from "vitest";
import { simulateGradeChange, calculateGradePoints } from "@/lib/grades/calculator";
import type { Grade } from "@/types/domain";

/**
 * Tests for useGradeSimulator hook logic (#180).
 *
 * Tester simulateGradeChange-funksjonen som hooken bruker
 * for å vise «hva-om»-resultat når eleven endrer en karakter.
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeGrade(
  subject: string,
  grade: Grade["grade"],
  overrides: Partial<Grade & { id: string }> = {}
): Grade & { id: string } {
  return {
    id: overrides.id ?? `grade-${subject}`,
    userId: "test-user",
    subject,
    fagkode: null,
    grade,
    term: "ht",
    year: 2025,
    programSubjectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

describe("simulateGradeChange (#180)", () => {
  const grades = [
    makeGrade("Norsk", 4),
    makeGrade("Matematikk R2", 3),
    makeGrade("Engelsk", 5),
  ];

  it("returnerer simulert poengberegning", () => {
    const result = simulateGradeChange(grades, {
      subject: "Matematikk R2",
      currentGrade: 3,
      simulatedGrade: 6,
    });
    expect(result).toBeDefined();
    expect(result.average).toBeGreaterThan(0);
    expect(typeof result.quotaPoints).toBe("number");
  });

  it("forbedret karakter gir høyere snitt", () => {
    const original = calculateGradePoints(grades);
    const simulated = simulateGradeChange(grades, {
      subject: "Matematikk R2",
      currentGrade: 3,
      simulatedGrade: 6,
    });
    expect(simulated.average).toBeGreaterThan(original.average);
  });

  it("senket karakter gir lavere snitt", () => {
    const original = calculateGradePoints(grades);
    const simulated = simulateGradeChange(grades, {
      subject: "Engelsk",
      currentGrade: 5,
      simulatedGrade: 2,
    });
    expect(simulated.average).toBeLessThan(original.average);
  });

  it("uendret karakter gir samme snitt", () => {
    const original = calculateGradePoints(grades);
    const simulated = simulateGradeChange(grades, {
      subject: "Norsk",
      currentGrade: 4,
      simulatedGrade: 4,
    });
    expect(simulated.average).toBeCloseTo(original.average, 5);
  });

  it("simulerer for fag med fagkode", () => {
    const gradesWithCode = [
      makeGrade("Matematikk R2", 3, { fagkode: "MAT3206" }),
      makeGrade("Fysikk 2", 4, { fagkode: "FYS2003" }),
    ];
    const result = simulateGradeChange(gradesWithCode, {
      subject: "Matematikk R2",
      currentGrade: 3,
      simulatedGrade: 5,
    });
    expect(result.average).toBeGreaterThan(3.5);
  });
});
