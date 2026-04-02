import { describe, it, expect } from "vitest";
import { beregSjanse, beregTrend } from "./samordna-opptak-live";

describe("Samordna Opptak live-data (#107)", () => {
  describe("beregSjanse", () => {
    it("returnerer 'god' når elevpoeng er minst 2 over grensen", () => {
      expect(beregSjanse(50, 47).sjanse).toBe("god");
      expect(beregSjanse(50, 48).sjanse).toBe("god");
      expect(beregSjanse(60, 40).sjanse).toBe("god");
    });

    it("returnerer 'usikker' innenfor ±2 poeng", () => {
      expect(beregSjanse(50, 49).sjanse).toBe("usikker");
      expect(beregSjanse(50, 50).sjanse).toBe("usikker");
      expect(beregSjanse(50, 51).sjanse).toBe("usikker");
      expect(beregSjanse(50, 52).sjanse).toBe("usikker");
    });

    it("returnerer 'lav' når eleven er mer enn 2 under", () => {
      expect(beregSjanse(45, 48).sjanse).toBe("lav");
      expect(beregSjanse(40, 50).sjanse).toBe("lav");
    });

    it("returnerer 'ukjent' ved null poenggrense", () => {
      expect(beregSjanse(50, null).sjanse).toBe("ukjent");
      expect(beregSjanse(50, null).diff).toBeNull();
    });

    it("beregner korrekt differanse", () => {
      expect(beregSjanse(52, 48).diff).toBe(4);
      expect(beregSjanse(45, 50).diff).toBe(-5);
      expect(beregSjanse(50, 50).diff).toBe(0);
    });
  });

  describe("beregTrend", () => {
    it("returnerer 'stigende' for økende poenggrenser", () => {
      expect(
        beregTrend([{ ordinaer: 40 }, { ordinaer: 43 }, { ordinaer: 46 }])
      ).toBe("stigende");
    });

    it("returnerer 'synkende' for minkende poenggrenser", () => {
      expect(
        beregTrend([{ ordinaer: 50 }, { ordinaer: 47 }, { ordinaer: 44 }])
      ).toBe("synkende");
    });

    it("returnerer 'stabil' for jevne poenggrenser", () => {
      expect(
        beregTrend([{ ordinaer: 45 }, { ordinaer: 45.2 }, { ordinaer: 45.4 }])
      ).toBe("stabil");
    });

    it("returnerer 'ukjent' med for lite data", () => {
      expect(beregTrend([{ ordinaer: 45 }])).toBe("ukjent");
      expect(beregTrend([])).toBe("ukjent");
    });

    it("ignorerer null-verdier", () => {
      expect(
        beregTrend([{ ordinaer: null }, { ordinaer: 45 }, { ordinaer: null }])
      ).toBe("ukjent");
    });
  });
});
