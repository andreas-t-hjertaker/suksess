import { describe, it, expect } from "vitest";
import { beregSjanse, beregTrend } from "@/lib/studiedata/samordna-opptak-live";
import { STUDY_PROGRAMS } from "@/lib/grades/calculator";

/**
 * Tests for useOpptaksdata hook logic (#107).
 *
 * Tester de rene funksjonene som hooken bruker internt.
 * Hook-rendering krever React-testmiljø som ikke er tilgjengelig her.
 */

describe("useOpptaksdata støttefunksjoner (#107)", () => {
  describe("fallback-konvertering", () => {
    it("STUDY_PROGRAMS har minst 10 programmer", () => {
      expect(STUDY_PROGRAMS.length).toBeGreaterThanOrEqual(10);
    });

    it("alle STUDY_PROGRAMS har nødvendige felter", () => {
      for (const sp of STUDY_PROGRAMS) {
        expect(sp.name).toBeTruthy();
        expect(sp.institution).toBeTruthy();
        expect(typeof sp.requiredPoints).toBe("number");
        expect(typeof sp.topPoints).toBe("number");
        expect(sp.requiredPoints).toBeLessThanOrEqual(sp.topPoints);
      }
    });

    it("beregSjanse fungerer for alle fallback-programmer", () => {
      const elevPoeng = 50;
      for (const sp of STUDY_PROGRAMS) {
        const { sjanse, diff } = beregSjanse(elevPoeng, sp.requiredPoints);
        expect(["god", "usikker", "lav", "ukjent"]).toContain(sjanse);
        expect(typeof diff).toBe("number");
      }
    });

    it("beregSjanse klassifiserer korrekt basert på poengdifferanse", () => {
      // Medisin UiO: 66.3 poeng → de fleste elever har lav sjanse
      const medisin = STUDY_PROGRAMS.find((p) => p.name === "Medisin" && p.institution === "UiO");
      expect(medisin).toBeDefined();

      const { sjanse: lavSjanse } = beregSjanse(55, medisin!.requiredPoints);
      expect(lavSjanse).toBe("lav");

      const { sjanse: godSjanse } = beregSjanse(70, medisin!.requiredPoints);
      expect(godSjanse).toBe("god");
    });
  });

  describe("trendberegning for opptaksdata", () => {
    it("stigende trend for programmer med økende popularitet", () => {
      const historikk = [
        { ordinaer: 50 },
        { ordinaer: 51.5 },
        { ordinaer: 53 },
      ];
      expect(beregTrend(historikk)).toBe("stigende");
    });

    it("synkende trend for programmer med minkende popularitet", () => {
      const historikk = [
        { ordinaer: 53 },
        { ordinaer: 51 },
        { ordinaer: 49 },
      ];
      expect(beregTrend(historikk)).toBe("synkende");
    });

    it("stabil trend for programmer med liten endring", () => {
      const historikk = [
        { ordinaer: 50.0 },
        { ordinaer: 50.1 },
        { ordinaer: 50.2 },
      ];
      expect(beregTrend(historikk)).toBe("stabil");
    });
  });

  describe("sjanse-differanse", () => {
    it("positiv diff betyr eleven er over grensen", () => {
      const { diff } = beregSjanse(55, 50);
      expect(diff).toBe(5);
    });

    it("negativ diff betyr eleven er under grensen", () => {
      const { diff } = beregSjanse(45, 50);
      expect(diff).toBe(-5);
    });

    it("null diff ved null poenggrense", () => {
      const { diff } = beregSjanse(50, null);
      expect(diff).toBeNull();
    });
  });
});
