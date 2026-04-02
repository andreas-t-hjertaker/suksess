/**
 * Tester for karrierekompetanse-rammeverk (Issue #133)
 */

import { describe, it, expect } from "vitest";
import {
  COMPETENCE_AREAS,
  calculateCompetenceLevel,
  getSkillsByFeature,
  getCompetenceArea,
  calculateOverallProgress,
} from "./karrierekompetanse";

describe("Karrierekompetanse-rammeverk", () => {
  it("har 4 kompetanseområder", () => {
    expect(COMPETENCE_AREAS).toHaveLength(4);
  });

  it("dekker alle HK-dir områder", () => {
    const ids = COMPETENCE_AREAS.map((a) => a.id);
    expect(ids).toContain("meg-selv");
    expect(ids).toContain("muligheter");
    expect(ids).toContain("valg");
    expect(ids).toContain("kontekst");
  });

  it("hvert område har minst 3 ferdigheter", () => {
    for (const area of COMPETENCE_AREAS) {
      expect(area.skills.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("alle ferdigheter har eksempler", () => {
    for (const area of COMPETENCE_AREAS) {
      for (const skill of area.skills) {
        expect(skill.examples.length).toBeGreaterThan(0);
      }
    }
  });

  it("alle ferdigheter er koblet til Suksess-funksjoner", () => {
    for (const area of COMPETENCE_AREAS) {
      for (const skill of area.skills) {
        expect(skill.relatedFeatures.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("calculateCompetenceLevel", () => {
  it("returnerer 'begynner' for under 30% fullført", () => {
    expect(calculateCompetenceLevel(0, 10)).toBe("begynner");
    expect(calculateCompetenceLevel(2, 10)).toBe("begynner");
  });

  it("returnerer 'underveis' for 30-69% fullført", () => {
    expect(calculateCompetenceLevel(3, 10)).toBe("underveis");
    expect(calculateCompetenceLevel(6, 10)).toBe("underveis");
  });

  it("returnerer 'kompetent' for 70%+ fullført", () => {
    expect(calculateCompetenceLevel(7, 10)).toBe("kompetent");
    expect(calculateCompetenceLevel(10, 10)).toBe("kompetent");
  });

  it("returnerer 'begynner' for 0/0", () => {
    expect(calculateCompetenceLevel(0, 0)).toBe("begynner");
  });
});

describe("getSkillsByFeature", () => {
  it("finner ferdigheter for career-advisor", () => {
    const skills = getSkillsByFeature("career-advisor");
    expect(skills.length).toBeGreaterThan(0);
  });

  it("finner ferdigheter for personality-analysis", () => {
    const skills = getSkillsByFeature("personality-analysis");
    expect(skills.length).toBeGreaterThan(0);
  });

  it("returnerer tom liste for ukjent funksjon", () => {
    expect(getSkillsByFeature("nonexistent")).toHaveLength(0);
  });
});

describe("getCompetenceArea", () => {
  it("returnerer riktig område", () => {
    const area = getCompetenceArea("meg-selv");
    expect(area?.title).toBe("Meg selv");
  });

  it("returnerer null for ukjent id", () => {
    expect(getCompetenceArea("nonexistent" as never)).toBeNull();
  });
});

describe("calculateOverallProgress", () => {
  it("returnerer 0% for ingen vurderinger", () => {
    const result = calculateOverallProgress([]);
    expect(result.completed).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("beregner korrekt med aktiviteter", () => {
    const result = calculateOverallProgress([
      {
        areaId: "meg-selv",
        level: "underveis",
        selfAssessment: 3,
        completedActivities: ["ms-1", "ms-2"],
        notes: "",
      },
    ]);
    expect(result.completed).toBe(2);
    expect(result.percent).toBeGreaterThan(0);
  });
});
