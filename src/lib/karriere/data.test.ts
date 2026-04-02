import { describe, it, expect } from "vitest";
import {
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  CAREER_NODES,
  SECTOR_COLORS,
  AI_RISK_LABELS,
  GROWTH_TREND_LABELS,
  GROWTH_TREND_ICONS,
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

  it("minst 70 karrierenoder", () => {
    expect(CAREER_NODES.length).toBeGreaterThanOrEqual(70);
  });
});

// ─── Nye metadata-felt (#115) ─────────────────────────────────────────────

describe("Karrieredata-metadata (#115)", () => {
  it("alle karrierenoder har aiDisruptionRisk", () => {
    for (const node of CAREER_NODES) {
      expect(
        ["low", "medium", "high"],
        `${node.id} har ugyldig aiDisruptionRisk`
      ).toContain(node.aiDisruptionRisk);
    }
  });

  it("alle karrierenoder har growthTrend", () => {
    for (const node of CAREER_NODES) {
      expect(
        ["declining", "stable", "growing", "booming"],
        `${node.id} har ugyldig growthTrend`
      ).toContain(node.growthTrend);
    }
  });

  it("alle karrierenoder har sustainability (boolean)", () => {
    for (const node of CAREER_NODES) {
      expect(typeof node.sustainability).toBe("boolean");
    }
  });

  it("alle karrierenoder har workLifeBalance (1-5)", () => {
    for (const node of CAREER_NODES) {
      expect(node.workLifeBalance).toBeGreaterThanOrEqual(1);
      expect(node.workLifeBalance).toBeLessThanOrEqual(5);
    }
  });

  it("energi/bærekraft-karrierer er merket som bærekraftige", () => {
    const green = CAREER_NODES.filter(
      (n) => n.sector === "Energi" || n.sector === "Bærekraft"
    );
    for (const node of green) {
      expect(node.sustainability, `${node.id} bør være bærekraftig`).toBe(true);
    }
  });

  it("har ≥8 bærekraftige karrierer", () => {
    const sustainable = CAREER_NODES.filter((n) => n.sustainability);
    expect(sustainable.length).toBeGreaterThanOrEqual(8);
  });

  it("har karrierer med høy AI-risiko (grafisk-designer, revisor)", () => {
    const highRisk = CAREER_NODES.filter((n) => n.aiDisruptionRisk === "high");
    expect(highRisk.length).toBeGreaterThanOrEqual(2);
  });

  it("har ≥5 karrierer med 'booming' vekst", () => {
    const booming = CAREER_NODES.filter((n) => n.growthTrend === "booming");
    expect(booming.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── Nye karrierenoder (#115) ─────────────────────────────────────────────

describe("Nye karrierer (#115)", () => {
  it("cloud-arkitekt finnes og har booming vekst", () => {
    const node = CAREER_NODES.find((n) => n.id === "cloud-arkitekt");
    expect(node).toBeDefined();
    expect(node!.growthTrend).toBe("booming");
    expect(node!.sector).toBe("Teknologi");
  });

  it("dataingeniør finnes", () => {
    expect(CAREER_NODES.find((n) => n.id === "dataingeniør")).toBeDefined();
  });

  it("klimaanalytiker finnes og er bærekraftig", () => {
    const node = CAREER_NODES.find((n) => n.id === "klimaanalytiker");
    expect(node).toBeDefined();
    expect(node!.sustainability).toBe(true);
  });

  it("energirådgiver finnes", () => {
    expect(CAREER_NODES.find((n) => n.id === "energiradgiver")).toBeDefined();
  });

  it("AI Agent-utvikler finnes med booming vekst", () => {
    const node = CAREER_NODES.find((n) => n.id === "ai-agent-utvikler");
    expect(node).toBeDefined();
    expect(node!.growthTrend).toBe("booming");
  });

  it("har ≥5 yrkesfag-karrierer (fagbrev)", () => {
    const yrkesfag = CAREER_NODES.filter((n) => n.educationLevel === "fagbrev");
    expect(yrkesfag.length).toBeGreaterThanOrEqual(5);
  });

  it("elektriker finnes med riktig data", () => {
    const node = CAREER_NODES.find((n) => n.id === "elektriker");
    expect(node).toBeDefined();
    expect(node!.educationLevel).toBe("fagbrev");
    expect(node!.sustainability).toBe(true);
  });

  it("helsefagarbeider finnes", () => {
    expect(CAREER_NODES.find((n) => n.id === "helsefagarbeider")).toBeDefined();
  });
});

// ─── Labels og hjelpefunksjoner (#115) ──────────────────────────────────

describe("Karriere-labels (#115)", () => {
  it("AI-risiko labels dekker alle verdier", () => {
    expect(Object.keys(AI_RISK_LABELS)).toEqual(["low", "medium", "high"]);
  });

  it("veksttrend labels dekker alle verdier", () => {
    expect(Object.keys(GROWTH_TREND_LABELS)).toEqual(
      ["declining", "stable", "growing", "booming"]
    );
  });

  it("veksttrend ikoner finnes", () => {
    expect(GROWTH_TREND_ICONS.booming).toBe("↑↑");
    expect(GROWTH_TREND_ICONS.declining).toBe("↓");
  });

  it("alle sektorer har definerte farger", () => {
    const sectors = new Set(CAREER_NODES.map((n) => n.sector));
    for (const sector of sectors) {
      expect(SECTOR_COLORS[sector], `Farge mangler: ${sector}`).toBeDefined();
    }
  });

  it("advancesTo refererer til eksisterende karrierer", () => {
    const ids = new Set(CAREER_NODES.map((n) => n.id));
    for (const node of CAREER_NODES) {
      if (node.advancesTo) {
        for (const target of node.advancesTo) {
          expect(ids.has(target), `${node.id} → ${target} finnes ikke`).toBe(true);
        }
      }
    }
  });
});
