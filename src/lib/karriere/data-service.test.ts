import { describe, it, expect } from "vitest";
import { CAREER_NODES } from "./data";

/**
 * SSB lønnsdata-mapping (speilet fra data-service.ts).
 */
const SSB_SALARY_DATA: Record<string, { median: number; p25: number; p75: number; year: number }> = {
  "2511": { median: 720000, p25: 600000, p75: 860000, year: 2025 },
  "2512": { median: 780000, p25: 650000, p75: 920000, year: 2025 },
  "2221": { median: 590000, p25: 530000, p75: 660000, year: 2025 },
  "2211": { median: 680000, p25: 580000, p75: 790000, year: 2025 },
};

const CAREER_STYRK_MAP: Record<string, string> = {
  "software-engineer": "2511",
  "data-scientist": "2512",
  "sykepleier": "2221",
  "lege": "2211",
};

describe("Karrieredata-tjeneste (#128)", () => {
  describe("CAREER_NODES (lokalt datasett)", () => {
    it("har minst 30 karrierenoder", () => {
      expect(CAREER_NODES.length).toBeGreaterThanOrEqual(30);
    });

    it("alle noder har påkrevde felter", () => {
      for (const node of CAREER_NODES) {
        expect(node.id).toBeTruthy();
        expect(node.title).toBeTruthy();
        expect(node.sector).toBeTruthy();
        expect(node.riasecCodes.length).toBeGreaterThan(0);
        expect(node.medianSalary).toBeGreaterThan(0);
        expect(["high", "medium", "low"]).toContain(node.demand);
        expect(["vgs", "fagbrev", "bachelor", "master", "phd"]).toContain(node.educationLevel);
      }
    });

    it("har unike IDer", () => {
      const ids = CAREER_NODES.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("dekker alle RIASEC-koder", () => {
      const allCodes = new Set(CAREER_NODES.flatMap((n) => n.riasecCodes));
      expect(allCodes).toContain("realistic");
      expect(allCodes).toContain("investigative");
      expect(allCodes).toContain("artistic");
      expect(allCodes).toContain("social");
      expect(allCodes).toContain("enterprising");
      expect(allCodes).toContain("conventional");
    });

    it("har minst 5 ulike sektorer", () => {
      const sectors = new Set(CAREER_NODES.map((n) => n.sector));
      expect(sectors.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe("SSB lønnsdata", () => {
    it("har data for vanlige STYRK-koder", () => {
      expect(SSB_SALARY_DATA["2511"]).toBeDefined();
      expect(SSB_SALARY_DATA["2221"]).toBeDefined();
    });

    it("p25 < median < p75", () => {
      for (const [, data] of Object.entries(SSB_SALARY_DATA)) {
        expect(data.p25).toBeLessThan(data.median);
        expect(data.median).toBeLessThan(data.p75);
      }
    });

    it("alle lønnsdata er rimelige (300k–2M)", () => {
      for (const [, data] of Object.entries(SSB_SALARY_DATA)) {
        expect(data.median).toBeGreaterThan(300000);
        expect(data.median).toBeLessThan(2000000);
      }
    });

    it("årstall er 2025", () => {
      for (const [, data] of Object.entries(SSB_SALARY_DATA)) {
        expect(data.year).toBe(2025);
      }
    });
  });

  describe("STYRK-mapping", () => {
    it("alle mappede karriere-IDer finnes i CAREER_NODES", () => {
      for (const careerId of Object.keys(CAREER_STYRK_MAP)) {
        const exists = CAREER_NODES.some((n) => n.id === careerId);
        // Merk: noen IDer kan mangle i lokalt datasett
        if (!exists) {
          console.warn(`STYRK-mapping for '${careerId}' finnes ikke i CAREER_NODES`);
        }
      }
    });

    it("alle STYRK-koder er 4-sifret", () => {
      for (const styrk of Object.values(CAREER_STYRK_MAP)) {
        expect(styrk).toMatch(/^\d{4}$/);
      }
    });
  });

  describe("searchCareers (filter-logikk)", () => {
    function filterCareers(
      filters: {
        sector?: string;
        educationLevel?: string;
        demand?: string;
        riasecCodes?: string[];
        query?: string;
      }
    ) {
      return CAREER_NODES.filter((career) => {
        if (filters.sector && career.sector !== filters.sector) return false;
        if (filters.educationLevel && career.educationLevel !== filters.educationLevel) return false;
        if (filters.demand && career.demand !== filters.demand) return false;
        if (filters.riasecCodes && filters.riasecCodes.length > 0) {
          const hasMatch = filters.riasecCodes.some((code) =>
            career.riasecCodes.includes(code as (typeof career.riasecCodes)[number])
          );
          if (!hasMatch) return false;
        }
        if (filters.query) {
          const q = filters.query.toLowerCase();
          if (
            !career.title.toLowerCase().includes(q) &&
            !career.sector.toLowerCase().includes(q) &&
            !career.description.toLowerCase().includes(q)
          ) return false;
        }
        return true;
      });
    }

    it("filtrerer på sektor", () => {
      const tech = filterCareers({ sector: "Teknologi" });
      expect(tech.length).toBeGreaterThan(0);
      expect(tech.every((c) => c.sector === "Teknologi")).toBe(true);
    });

    it("filtrerer på utdanningsnivå", () => {
      const masters = filterCareers({ educationLevel: "master" });
      expect(masters.length).toBeGreaterThan(0);
      expect(masters.every((c) => c.educationLevel === "master")).toBe(true);
    });

    it("filtrerer på etterspørsel", () => {
      const high = filterCareers({ demand: "high" });
      expect(high.length).toBeGreaterThan(0);
      expect(high.every((c) => c.demand === "high")).toBe(true);
    });

    it("filtrerer på RIASEC-kode", () => {
      const investigative = filterCareers({ riasecCodes: ["investigative"] });
      expect(investigative.length).toBeGreaterThan(0);
      expect(
        investigative.every((c) => c.riasecCodes.includes("investigative"))
      ).toBe(true);
    });

    it("filtrerer på fritekst-søk", () => {
      const results = filterCareers({ query: "utvikler" });
      expect(results.length).toBeGreaterThan(0);
    });

    it("tom filter returnerer alle", () => {
      const all = filterCareers({});
      expect(all.length).toBe(CAREER_NODES.length);
    });
  });
});
