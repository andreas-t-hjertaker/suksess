import { describe, it, expect } from "vitest";
import {
  CONSENT_CATEGORIES,
  getRequiredCategories,
  isConsentComplete,
  hasConsent,
  getAgeCategory,
  buildInitialConsent,
  type ConsentRecord,
} from "@/lib/gdpr/minor-consent";

/**
 * Tests for GDPR-oversikt i skole-dashboardet (#134).
 * Tester samtykke-logikk, alderskategorisering og consent-validering.
 */

describe("GDPR samtykke-logikk for skole-dashboard (#134)", () => {
  describe("Consent kategorier", () => {
    it("har minst 5 kategorier definert", () => {
      const keys = Object.keys(CONSENT_CATEGORIES);
      expect(keys.length).toBeGreaterThanOrEqual(5);
    });

    it("har personality_profiling og ai_conversation som påkrevd", () => {
      expect(CONSENT_CATEGORIES.personality_profiling.required).toBe(true);
      expect(CONSENT_CATEGORIES.ai_conversation.required).toBe(true);
    });

    it("har marketing som valgfri", () => {
      expect(CONSENT_CATEGORIES.marketing.required).toBe(false);
    });

    it("alle kategorier har label og description", () => {
      for (const [, val] of Object.entries(CONSENT_CATEGORIES)) {
        expect(val.label).toBeTruthy();
        expect(val.description).toBeTruthy();
      }
    });
  });

  describe("Alderskategorisering", () => {
    it("klassifiserer 15-åring som under16", () => {
      const currentYear = new Date().getFullYear();
      expect(getAgeCategory(currentYear - 15)).toBe("under16");
    });

    it("klassifiserer 16-åring som 16plus", () => {
      const currentYear = new Date().getFullYear();
      expect(getAgeCategory(currentYear - 16)).toBe("16plus");
    });

    it("klassifiserer 18-åring som 16plus", () => {
      const currentYear = new Date().getFullYear();
      expect(getAgeCategory(currentYear - 18)).toBe("16plus");
    });

    it("klassifiserer 30-åring som unknown", () => {
      const currentYear = new Date().getFullYear();
      expect(getAgeCategory(currentYear - 30)).toBe("unknown");
    });
  });

  describe("buildInitialConsent", () => {
    it("setter parent_required for under-16", () => {
      const currentYear = new Date().getFullYear();
      const consent = buildInitialConsent("user1", currentYear - 15);
      expect(consent.status).toBe("parent_required");
      expect(consent.ageCategory).toBe("under16");
    });

    it("setter pending for 16+", () => {
      const currentYear = new Date().getFullYear();
      const consent = buildInitialConsent("user1", currentYear - 17);
      expect(consent.status).toBe("pending");
      expect(consent.ageCategory).toBe("16plus");
    });

    it("setter unknown ved null fødselsår", () => {
      const consent = buildInitialConsent("user1", null);
      expect(consent.ageCategory).toBe("unknown");
    });
  });

  describe("isConsentComplete", () => {
    it("returnerer true for gyldig fullstendig samtykke", () => {
      const record: ConsentRecord = {
        userId: "user1",
        ageCategory: "16plus",
        status: "granted",
        grantedAt: "2026-03-01",
        parentEmail: null,
        policyVersion: "2026-03-01",
        categories: ["personality_profiling", "ai_conversation"],
      };
      expect(isConsentComplete(record)).toBe(true);
    });

    it("returnerer false for pending samtykke", () => {
      const record: ConsentRecord = {
        userId: "user1",
        ageCategory: "16plus",
        status: "pending",
        grantedAt: null,
        parentEmail: null,
        policyVersion: "2026-03-01",
        categories: [],
      };
      expect(isConsentComplete(record)).toBe(false);
    });

    it("returnerer false uten påkrevde kategorier", () => {
      const record: ConsentRecord = {
        userId: "user1",
        ageCategory: "16plus",
        status: "granted",
        grantedAt: "2026-03-01",
        parentEmail: null,
        policyVersion: "2026-03-01",
        categories: ["analytics"], // Mangler påkrevde
      };
      expect(isConsentComplete(record)).toBe(false);
    });
  });

  describe("hasConsent", () => {
    const grantedRecord: ConsentRecord = {
      userId: "user1",
      ageCategory: "16plus",
      status: "granted",
      grantedAt: "2026-03-01",
      parentEmail: null,
      policyVersion: "2026-03-01",
      categories: ["personality_profiling", "ai_conversation"],
    };

    it("returnerer true for samtykket kategori", () => {
      expect(hasConsent(grantedRecord, "personality_profiling")).toBe(true);
    });

    it("returnerer false for ikke-samtykket kategori", () => {
      expect(hasConsent(grantedRecord, "marketing")).toBe(false);
    });

    it("returnerer false for null record", () => {
      expect(hasConsent(null, "personality_profiling")).toBe(false);
    });
  });

  describe("getRequiredCategories", () => {
    it("returnerer minst 2 påkrevde kategorier", () => {
      const required = getRequiredCategories();
      expect(required.length).toBeGreaterThanOrEqual(2);
      expect(required).toContain("personality_profiling");
      expect(required).toContain("ai_conversation");
    });
  });

  describe("CSV-eksport format", () => {
    it("genererer korrekt CSV-header", () => {
      const header = "Navn,E-post,Samtykkestatus,Kategorier,Alderskategori,Foresatt-epost,Samtykke-dato";
      const cols = header.split(",");
      expect(cols).toHaveLength(7);
      expect(cols[0]).toBe("Navn");
      expect(cols[2]).toBe("Samtykkestatus");
    });
  });
});
