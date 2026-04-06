import { describe, it, expect } from "vitest";
import { STUDY_PROGRAMS, type StudyProgramEntry } from "@/lib/grades/calculator";

/**
 * Tests for useStudySearch hook logic (#180).
 *
 * Tester filterings- og kategoriseringslogikken som hooken bruker.
 */

// ---------------------------------------------------------------------------
// Reprodusert filterlogikk fra use-study-search.ts
// ---------------------------------------------------------------------------

function filterPrograms(programs: StudyProgramEntry[], query: string): StudyProgramEntry[] {
  const q = query.toLowerCase();
  return programs.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.institution.toLowerCase().includes(q)
  );
}

function categorize(programs: StudyProgramEntry[], activeTotal: number) {
  return {
    reachable: programs.filter((p) => activeTotal >= p.requiredPoints),
    almostReachable: programs.filter(
      (p) => activeTotal < p.requiredPoints && activeTotal >= p.requiredPoints - 5
    ),
    outOfReach: programs.filter((p) => activeTotal < p.requiredPoints - 5),
  };
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

describe("useStudySearch filterlogikk (#180)", () => {
  it("STUDY_PROGRAMS er ikke tom", () => {
    expect(STUDY_PROGRAMS.length).toBeGreaterThan(0);
  });

  it("filtrerer på programnavn", () => {
    const result = filterPrograms(STUDY_PROGRAMS, "medisin");
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(
        p.name.toLowerCase().includes("medisin") ||
        p.institution.toLowerCase().includes("medisin")
      ).toBe(true);
    }
  });

  it("filtrerer på institusjon", () => {
    const result = filterPrograms(STUDY_PROGRAMS, "uio");
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(
        p.name.toLowerCase().includes("uio") ||
        p.institution.toLowerCase().includes("uio")
      ).toBe(true);
    }
  });

  it("returnerer alle ved tomt søk", () => {
    const result = filterPrograms(STUDY_PROGRAMS, "");
    expect(result.length).toBe(STUDY_PROGRAMS.length);
  });

  it("returnerer tomt for søk uten treff", () => {
    const result = filterPrograms(STUDY_PROGRAMS, "xyznonexistent");
    expect(result.length).toBe(0);
  });

  it("søk er case-insensitive", () => {
    const lower = filterPrograms(STUDY_PROGRAMS, "medisin");
    const upper = filterPrograms(STUDY_PROGRAMS, "MEDISIN");
    expect(lower.length).toBe(upper.length);
  });
});

describe("useStudySearch kategorisering (#180)", () => {
  const testPrograms: StudyProgramEntry[] = [
    { name: "Lett", institution: "UiO", requiredPoints: 40, topPoints: 50, category: "Realfag" },
    { name: "Middels", institution: "UiO", requiredPoints: 50, topPoints: 60, category: "Realfag" },
    { name: "Nær", institution: "UiO", requiredPoints: 53, topPoints: 63, category: "Realfag" },
    { name: "Vanskelig", institution: "UiO", requiredPoints: 65, topPoints: 70, category: "Medisin" },
  ];

  it("kategoriserer reachable korrekt", () => {
    const { reachable } = categorize(testPrograms, 50);
    expect(reachable.map((p) => p.name)).toEqual(["Lett", "Middels"]);
  });

  it("kategoriserer almostReachable korrekt (innen 5 poeng)", () => {
    const { almostReachable } = categorize(testPrograms, 50);
    expect(almostReachable.map((p) => p.name)).toEqual(["Nær"]);
  });

  it("kategoriserer outOfReach korrekt (mer enn 5 poeng unna)", () => {
    const { outOfReach } = categorize(testPrograms, 50);
    expect(outOfReach.map((p) => p.name)).toEqual(["Vanskelig"]);
  });

  it("alle programmer er med 0 poeng", () => {
    const { reachable, almostReachable, outOfReach } = categorize(testPrograms, 0);
    expect(reachable).toHaveLength(0);
    expect(almostReachable).toHaveLength(0);
    expect(outOfReach).toHaveLength(testPrograms.length);
  });

  it("alle programmer reachable med høye poeng", () => {
    const { reachable, almostReachable, outOfReach } = categorize(testPrograms, 100);
    expect(reachable).toHaveLength(testPrograms.length);
    expect(almostReachable).toHaveLength(0);
    expect(outOfReach).toHaveLength(0);
  });

  it("grenseverdi: nøyaktig på kravpoeng er reachable", () => {
    const { reachable } = categorize(testPrograms, 53);
    expect(reachable.map((p) => p.name)).toContain("Nær");
  });

  it("grenseverdi: 1 under kravpoeng er almostReachable", () => {
    const { almostReachable } = categorize(testPrograms, 52);
    expect(almostReachable.map((p) => p.name)).toContain("Nær");
  });
});
