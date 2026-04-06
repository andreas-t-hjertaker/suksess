import { describe, it, expect } from "vitest";
import { calculateJobMatchScore } from "./nav-stillinger";
import { styrkToRiasec } from "@/lib/mappings/styrk-riasec";
import type { RiasecScores } from "@/types/domain";

describe("NAV stillinger jobbmatch (#129)", () => {
  describe("styrkToRiasec", () => {
    it("mapper IT-yrker (25xx) til investigative+realistic+conventional", () => {
      const codes = styrkToRiasec("2511");
      expect(codes).toContain("investigative");
      expect(codes).toContain("realistic");
    });

    it("mapper helseyrker (22xx) til investigative+social", () => {
      const codes = styrkToRiasec("2211");
      expect(codes).toContain("investigative");
      expect(codes).toContain("social");
    });

    it("mapper håndverkere (7xxx) til realistic", () => {
      const codes = styrkToRiasec("7231");
      expect(codes).toContain("realistic");
    });

    it("mapper undervisning (23xx) til social+artistic", () => {
      const codes = styrkToRiasec("2341");
      expect(codes).toContain("social");
      expect(codes).toContain("artistic");
    });

    it("returnerer tom liste for null", () => {
      expect(styrkToRiasec(null)).toEqual([]);
    });

    it("returnerer tom liste for ukjent kode", () => {
      expect(styrkToRiasec("")).toEqual([]);
    });

    it("bruker 2-sifret mapping når tilgjengelig", () => {
      // 25 (IT) gir mer spesifikk mapping enn 2 (akademiske yrker)
      const itCodes = styrkToRiasec("2511");
      const genericCodes = styrkToRiasec("2999"); // Faller tilbake til 1-sifret "2"
      expect(itCodes).not.toEqual(genericCodes);
    });
  });

  describe("calculateJobMatchScore", () => {
    const techProfile: RiasecScores = {
      realistic: 70,
      investigative: 85,
      artistic: 30,
      social: 40,
      enterprising: 50,
      conventional: 65,
    };

    it("gir høy score for matchende RIASEC-koder", () => {
      const score = calculateJobMatchScore(
        ["investigative", "realistic"],
        techProfile
      );
      expect(score).toBeGreaterThan(70);
    });

    it("gir lav score for ikke-matchende koder", () => {
      const score = calculateJobMatchScore(
        ["artistic", "social"],
        techProfile
      );
      expect(score).toBeLessThan(40);
    });

    it("returnerer 50 for ukjent (tom RIASEC)", () => {
      expect(calculateJobMatchScore([], techProfile)).toBe(50);
    });

    it("beregner gjennomsnitt av matchende koder", () => {
      const score = calculateJobMatchScore(
        ["investigative", "conventional"],
        techProfile
      );
      expect(score).toBe(Math.round((85 + 65) / 2));
    });
  });
});
