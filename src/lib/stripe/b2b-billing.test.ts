import { describe, it, expect } from "vitest";
import {
  calculateLicenseCost,
  validateOrganizationNumber,
  formatOrganizationNumber,
  schoolLicensePlans,
} from "./b2b-billing";

describe("B2B fakturering (#110)", () => {
  describe("schoolLicensePlans", () => {
    it("har 3 planer: pilot, school, municipality", () => {
      expect(schoolLicensePlans).toHaveLength(3);
      expect(schoolLicensePlans.map((p) => p.id)).toEqual(["pilot", "school", "municipality"]);
    });

    it("pilot er gratis", () => {
      const pilot = schoolLicensePlans.find((p) => p.id === "pilot")!;
      expect(pilot.pricePerStudentPerMonth).toBe(0);
    });

    it("municipality har volumrabatt vs school", () => {
      const school = schoolLicensePlans.find((p) => p.id === "school")!;
      const muni = schoolLicensePlans.find((p) => p.id === "municipality")!;
      expect(muni.pricePerStudentPerMonth).toBeLessThan(school.pricePerStudentPerMonth);
    });
  });

  describe("calculateLicenseCost", () => {
    const schoolPlan = schoolLicensePlans.find((p) => p.id === "school")!;

    it("beregner korrekt månedspris ex. MVA", () => {
      const cost = calculateLicenseCost(schoolPlan, 200);
      expect(cost.monthlyExVat).toBe(29 * 200);
    });

    it("beregner 25% MVA", () => {
      const cost = calculateLicenseCost(schoolPlan, 100);
      expect(cost.monthlyVat).toBe(Math.round(29 * 100 * 0.25));
      expect(cost.vatRate).toBe(0.25);
    });

    it("beregner korrekt totalpris inkl. MVA", () => {
      const cost = calculateLicenseCost(schoolPlan, 100);
      expect(cost.monthlyTotal).toBe(cost.monthlyExVat + cost.monthlyVat);
    });

    it("beregner årsbeløp som 12x månedlig", () => {
      const cost = calculateLicenseCost(schoolPlan, 100);
      expect(cost.yearlyExVat).toBe(cost.monthlyExVat * 12);
      expect(cost.yearlyTotal).toBe(cost.monthlyTotal * 12);
    });

    it("respekterer minStudents-grensen", () => {
      const cost = calculateLicenseCost(schoolPlan, 10);
      expect(cost.studentCount).toBe(schoolPlan.minStudents);
      expect(cost.monthlyExVat).toBe(29 * schoolPlan.minStudents);
    });

    it("respekterer maxStudents-grensen", () => {
      const cost = calculateLicenseCost(schoolPlan, 5000);
      expect(cost.studentCount).toBe(schoolPlan.maxStudents);
    });

    it("pilot-plan gir 0 kr", () => {
      const pilot = schoolLicensePlans.find((p) => p.id === "pilot")!;
      const cost = calculateLicenseCost(pilot, 30);
      expect(cost.monthlyExVat).toBe(0);
      expect(cost.monthlyTotal).toBe(0);
      expect(cost.yearlyTotal).toBe(0);
    });
  });

  describe("validateOrganizationNumber", () => {
    it("godtar gyldig organisasjonsnummer (Equinor)", () => {
      expect(validateOrganizationNumber("923609016")).toBe(true);
    });

    it("godtar med mellomrom", () => {
      expect(validateOrganizationNumber("923 609 016")).toBe(true);
    });

    it("avviser for kort nummer", () => {
      expect(validateOrganizationNumber("12345678")).toBe(false);
    });

    it("avviser for langt nummer", () => {
      expect(validateOrganizationNumber("1234567890")).toBe(false);
    });

    it("avviser bokstaver", () => {
      expect(validateOrganizationNumber("12345678a")).toBe(false);
    });

    it("avviser ugyldig kontrollsiffer", () => {
      expect(validateOrganizationNumber("923609017")).toBe(false);
    });
  });

  describe("formatOrganizationNumber", () => {
    it("formaterer med mellomrom", () => {
      expect(formatOrganizationNumber("923609016")).toBe("923 609 016");
    });

    it("håndterer allerede formatert input", () => {
      expect(formatOrganizationNumber("923 609 016")).toBe("923 609 016");
    });
  });
});
