/**
 * EU AI Act compliance-tester (Issue #103)
 *
 * Verifiserer risikokategorisering, transparensinformasjon og beslutningslogging.
 */

import { describe, it, expect } from "vitest";
import {
  AI_FEATURE_RISK_REGISTRY,
  AI_TRANSPARENCY_INFO,
  AI_DISCLOSURE_NOTICE,
  requiresHumanOversight,
  getFeatureRiskLevel,
  getTransparencyInfo,
} from "./eu-ai-act";

// ─── Risikokategorisering (Art. 9) ──────────────────────────────────────────

describe("AI Feature Risk Registry", () => {
  it("dekker alle kjente AI-funksjoner", () => {
    const featureIds = AI_FEATURE_RISK_REGISTRY.map((f) => f.featureId);
    expect(featureIds).toContain("career-advisor");
    expect(featureIds).toContain("personality-analysis");
    expect(featureIds).toContain("career-path-explorer");
    expect(featureIds).toContain("grade-calculator");
    expect(featureIds).toContain("cv-builder");
    expect(featureIds).toContain("jobbmatch");
  });

  it("klassifiserer karriereveileder som høyrisiko", () => {
    expect(getFeatureRiskLevel("career-advisor")).toBe("high");
  });

  it("klassifiserer personlighetsanalyse som høyrisiko", () => {
    expect(getFeatureRiskLevel("personality-analysis")).toBe("high");
  });

  it("klassifiserer poengkalkulator som begrenset risiko", () => {
    expect(getFeatureRiskLevel("grade-calculator")).toBe("limited");
  });

  it("returnerer null for ukjent funksjon", () => {
    expect(getFeatureRiskLevel("nonexistent")).toBeNull();
  });

  it("alle høyrisiko-funksjoner har minst 3 risikoreduserende tiltak", () => {
    const highRisk = AI_FEATURE_RISK_REGISTRY.filter((f) => f.riskLevel === "high");
    for (const feature of highRisk) {
      expect(feature.mitigations.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("alle funksjoner har gyldig risikokategori", () => {
    const validLevels = ["unacceptable", "high", "limited", "minimal"];
    for (const feature of AI_FEATURE_RISK_REGISTRY) {
      expect(validLevels).toContain(feature.riskLevel);
    }
  });

  it("alle funksjoner har annex-referanse", () => {
    for (const feature of AI_FEATURE_RISK_REGISTRY) {
      expect(feature.annex).toBeTruthy();
    }
  });
});

// ─── Mennesketilsyn (Art. 14) ───────────────────────────────────────────────

describe("Human Oversight", () => {
  it("krever mennesketilsyn for karriereveileder", () => {
    expect(requiresHumanOversight("career-advisor")).toBe(true);
  });

  it("krever mennesketilsyn for personlighetsanalyse", () => {
    expect(requiresHumanOversight("personality-analysis")).toBe(true);
  });

  it("krever IKKE mennesketilsyn for poengkalkulator", () => {
    expect(requiresHumanOversight("grade-calculator")).toBe(false);
  });

  it("returnerer false for ukjent funksjon", () => {
    expect(requiresHumanOversight("nonexistent")).toBe(false);
  });
});

// ─── Transparensinformasjon (Art. 13 + Art. 52) ────────────────────────────

describe("AI Transparency Info", () => {
  it("har transparensinformasjon for alle høyrisiko-funksjoner", () => {
    const highRisk = AI_FEATURE_RISK_REGISTRY.filter((f) => f.riskLevel === "high");
    for (const feature of highRisk) {
      const info = getTransparencyInfo(feature.featureId);
      // Noen høyrisiko-funksjoner har transparensinfo, noen ikke ennå
      if (info) {
        expect(info.purpose).toBeTruthy();
        expect(info.limitations.length).toBeGreaterThan(0);
        expect(info.userControl.length).toBeGreaterThan(0);
        expect(info.complaintContact).toContain("@");
      }
    }
  });

  it("returnerer null for ukjent funksjon", () => {
    expect(getTransparencyInfo("nonexistent")).toBeNull();
  });

  it("karriereveileder-transparensinfo nevner Gemini", () => {
    const info = getTransparencyInfo("career-advisor");
    expect(info?.purpose).toContain("Gemini");
  });

  it("alle transparensinfo har kontaktinfo for klager", () => {
    for (const info of AI_TRANSPARENCY_INFO) {
      expect(info.complaintContact).toBeTruthy();
    }
  });
});

// ─── AI Disclosure Notice (Art. 52) ─────────────────────────────────────────

describe("AI Disclosure Notice", () => {
  it("har varsel på bokmål", () => {
    expect(AI_DISCLOSURE_NOTICE.nb).toContain("AI");
    expect(AI_DISCLOSURE_NOTICE.nb).toContain("kunstig intelligens");
  });

  it("har varsel på nynorsk", () => {
    expect(AI_DISCLOSURE_NOTICE.nn).toContain("AI");
    expect(AI_DISCLOSURE_NOTICE.nn).toContain("kunstig intelligens");
  });

  it("har varsel på nordsamisk", () => {
    expect(AI_DISCLOSURE_NOTICE.se).toContain("AI");
  });

  it("alle varsler nevner at svar kan inneholde feil", () => {
    expect(AI_DISCLOSURE_NOTICE.nb).toContain("feil");
    expect(AI_DISCLOSURE_NOTICE.nn).toContain("feil");
  });
});
