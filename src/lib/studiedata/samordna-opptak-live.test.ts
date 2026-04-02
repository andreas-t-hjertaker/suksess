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

    it("grenseverdier: nøyaktig ±2 er 'usikker'", () => {
      expect(beregSjanse(48, 50).sjanse).toBe("usikker"); // diff = -2
      expect(beregSjanse(52, 50).sjanse).toBe("god");     // diff = +2
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

    it("beregner korrekt for 5-årsperiode", () => {
      const result = beregTrend([
        { ordinaer: 50 },
        { ordinaer: 50.5 },
        { ordinaer: 51 },
        { ordinaer: 51.5 },
        { ordinaer: 52 },
      ]);
      expect(result).toBe("stabil"); // 0.5 per år = på grensen
    });

    it("returnerer 'stigende' for >0.5 per år endring", () => {
      const result = beregTrend([
        { ordinaer: 50 },
        { ordinaer: 51 },
        { ordinaer: 52 },
        { ordinaer: 53 },
        { ordinaer: 54 },
      ]);
      expect(result).toBe("stigende"); // 1.0 per år
    });
  });

  describe("beregSjanse grenseverdier", () => {
    it("returnerer 'god' for stor positiv differanse", () => {
      const result = beregSjanse(70, 40);
      expect(result.sjanse).toBe("god");
      expect(result.diff).toBe(30);
    });

    it("returnerer 'lav' for stor negativ differanse", () => {
      const result = beregSjanse(30, 60);
      expect(result.sjanse).toBe("lav");
      expect(result.diff).toBe(-30);
    });
  });
});
