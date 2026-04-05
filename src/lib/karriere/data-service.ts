/**
 * Karrieredata-tjeneste (#128) — kobler karrierestiutforsker til ekte data.
 *
 * Henter karrieredata fra:
 * - Firestore `careerPaths` (synkronisert fra utdanning.no via ingest)
 * - Firestore `jobListings` (NAV pam-stilling-feed)
 * - Firestore `studyPrograms` (Samordna Opptak / utdanning.no)
 * - SSB lønnsstatistikk (hardkodet per STYRK-08, oppdateres årlig)
 *
 * Fallback til lokalt CAREER_NODES-datasett om Firestore-data mangler.
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { CAREER_NODES, type CareerNode } from "./data";
import type { RiasecScores } from "@/types/domain";
import { logger } from "@/lib/observability/logger";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type EnrichedCareer = CareerNode & {
  /** Kilde: 'firestore' (ekte) eller 'local' (hardkodet) */
  source: "firestore" | "local";
  /** SSB lønnsstatistikk (oppdatert) */
  ssbSalaryData?: {
    median: number;
    p25: number;
    p75: number;
    year: number;
    source: string;
  };
  /** Antall aktive stillingsannonser fra NAV */
  activeJobCount: number;
  /** Relevante studieprogram fra Samordna Opptak */
  studyPrograms: {
    name: string;
    institution: string;
    requiredGpa: number | null;
    url: string | null;
  }[];
};

export type CareerSearchFilters = {
  sector?: string;
  educationLevel?: string;
  demand?: string;
  riasecCodes?: (keyof RiasecScores)[];
  query?: string;
};

// ---------------------------------------------------------------------------
// SSB lønnsstatistikk — oppdateres årlig fra SSB tabell 11418
// STYRK-08 kode → lønnsdata
// ---------------------------------------------------------------------------

const SSB_SALARY_DATA: Record<string, { median: number; p25: number; p75: number; year: number }> = {
  // Teknologi
  "2511": { median: 720000, p25: 600000, p75: 860000, year: 2025 }, // Systemutvikler
  "2512": { median: 780000, p25: 650000, p75: 920000, year: 2025 }, // Applikasjonsutvikler
  "2521": { median: 740000, p25: 620000, p75: 880000, year: 2025 }, // Databasedesigner
  "2522": { median: 710000, p25: 590000, p75: 850000, year: 2025 }, // Systemadministrator
  // Helse
  "2211": { median: 680000, p25: 580000, p75: 790000, year: 2025 }, // Lege
  "2221": { median: 590000, p25: 530000, p75: 660000, year: 2025 }, // Sykepleier
  "2261": { median: 560000, p25: 500000, p75: 640000, year: 2025 }, // Tannlege
  // Økonomi
  "2411": { median: 680000, p25: 560000, p75: 820000, year: 2025 }, // Regnskapsfører
  "2413": { median: 750000, p25: 620000, p75: 900000, year: 2025 }, // Finansanalytiker
  // Undervisning
  "2320": { median: 560000, p25: 500000, p75: 630000, year: 2025 }, // Lektor
  "2341": { median: 530000, p25: 480000, p75: 590000, year: 2025 }, // Grunnskolelærer
  // Ingeniør
  "2141": { median: 700000, p25: 590000, p75: 830000, year: 2025 }, // Industriell ingeniør
  "2142": { median: 720000, p25: 610000, p75: 850000, year: 2025 }, // Sivilingeniør
  "2151": { median: 690000, p25: 580000, p75: 810000, year: 2025 }, // Elektroingeniør
  // Kreative
  "2166": { median: 520000, p25: 420000, p75: 650000, year: 2025 }, // Grafisk designer
  "2651": { median: 480000, p25: 380000, p75: 600000, year: 2025 }, // Billedkunstner
  "2652": { median: 500000, p25: 400000, p75: 620000, year: 2025 }, // Musiker
  // Håndverk
  "7411": { median: 520000, p25: 460000, p75: 600000, year: 2025 }, // Elektriker
  "7231": { median: 510000, p25: 450000, p75: 590000, year: 2025 }, // Mekaniker
  "7112": { median: 530000, p25: 470000, p75: 610000, year: 2025 }, // Tømrer
  // Annet
  "2611": { median: 720000, p25: 600000, p75: 860000, year: 2025 }, // Advokat
  "2633": { median: 560000, p25: 480000, p75: 660000, year: 2025 }, // Sosiolog/samfunnsviter
  "3411": { median: 620000, p25: 520000, p75: 740000, year: 2025 }, // Politibetjent
};

// STYRK-08 → karriere-ID mapping (for SSB-kobling)
const CAREER_STYRK_MAP: Record<string, string> = {
  "software-engineer": "2511",
  "data-scientist": "2512",
  "sykepleier": "2221",
  "lege": "2211",
  "lektor": "2320",
  "advokat": "2611",
  "elektriker": "7411",
  "mekaniker": "7231",
  "grafisk-designer": "2166",
  "sivilingenior": "2142",
  "finansanalytiker": "2413",
};

// ---------------------------------------------------------------------------
// Hent-funksjoner
// ---------------------------------------------------------------------------

/**
 * Hent alle karrierenoder — prøver Firestore først, faller tilbake til lokalt datasett.
 */
export async function getCareerData(): Promise<EnrichedCareer[]> {
  try {
    // Prøv Firestore først
    const snap = await getDocs(
      query(collection(db, "careerPaths"), orderBy("demand"), limit(200))
    );

    if (snap.size > 0) {
      return snap.docs.map((d) => {
        const data = d.data();
        const styrk = data.styrkCode || CAREER_STYRK_MAP[d.id];
        const ssb = styrk ? SSB_SALARY_DATA[styrk] : undefined;

        return {
          id: d.id,
          title: data.title || "",
          sector: data.sector || "",
          educationLevel: data.educationLevel || "bachelor",
          riasecCodes: data.riasecCodes || [],
          medianSalary: ssb?.median || data.medianSalary || 0,
          demand: data.demand || "medium",
          description: data.description || "",
          educationPaths: data.educationPaths || [],
          advancesTo: data.advancesTo || [],
          aiDisruptionRisk: data.aiDisruptionRisk || "medium",
          growthTrend: data.growthTrend || "stable",
          sustainability: data.sustainability ?? false,
          workLifeBalance: data.workLifeBalance || 3,
          source: "firestore" as const,
          ssbSalaryData: ssb ? { ...ssb, source: "SSB tabell 11418" } : undefined,
          activeJobCount: 0,
          studyPrograms: [],
        };
      });
    }
  } catch (err) {
    logger.warn("karriere_data_firestore_failed", { error: err instanceof Error ? err.message : "unknown" });
  }

  // Fallback til lokalt datasett
  return CAREER_NODES.map((node) => {
    const styrk = CAREER_STYRK_MAP[node.id];
    const ssb = styrk ? SSB_SALARY_DATA[styrk] : undefined;

    return {
      ...node,
      source: "local" as const,
      ssbSalaryData: ssb ? { ...ssb, source: "SSB tabell 11418" } : undefined,
      activeJobCount: 0,
      studyPrograms: [],
    };
  });
}

/**
 * Berik karrierenode med stillingsannonser fra NAV og studieprogram.
 */
export async function enrichCareerWithLiveData(careerId: string): Promise<{
  activeJobs: number;
  studyPrograms: { name: string; institution: string; requiredGpa: number | null; url: string | null }[];
}> {
  const career = CAREER_NODES.find((c) => c.id === careerId);
  if (!career) return { activeJobs: 0, studyPrograms: [] };

  // Hent aktive stillingsannonser fra NAV
  let activeJobs = 0;
  try {
    const sectorVariants = [career.sector, career.title].filter(Boolean);
    for (const term of sectorVariants) {
      const jobsSnap = await getDocs(
        query(
          collection(db, "jobListings"),
          where("sector", "==", term),
          where("active", "==", true),
          limit(50)
        )
      );
      activeJobs += jobsSnap.size;
    }
  } catch (err) {
    logger.warn("karriere_jobs_fetch_failed", { careerId, error: err instanceof Error ? err.message : "unknown" });
  }

  // Hent relevante studieprogram
  const studyPrograms: { name: string; institution: string; requiredGpa: number | null; url: string | null }[] = [];
  try {
    for (const code of career.riasecCodes.slice(0, 2)) {
      const programsSnap = await getDocs(
        query(
          collection(db, "studyPrograms"),
          where("riasecCodes", "array-contains", code),
          limit(5)
        )
      );
      for (const d of programsSnap.docs) {
        const data = d.data();
        if (!studyPrograms.some((p) => p.name === data.name)) {
          studyPrograms.push({
            name: data.name || "",
            institution: data.institution || "",
            requiredGpa: data.requiredGpa || null,
            url: data.url || null,
          });
        }
      }
    }
  } catch (err) {
    logger.warn("karriere_programs_fetch_failed", { careerId, error: err instanceof Error ? err.message : "unknown" });
  }

  return { activeJobs, studyPrograms };
}

/**
 * Søk og filtrer karrierer.
 */
export async function searchCareers(filters: CareerSearchFilters): Promise<EnrichedCareer[]> {
  const allCareers = await getCareerData();

  return allCareers.filter((career) => {
    if (filters.sector && career.sector !== filters.sector) return false;
    if (filters.educationLevel && career.educationLevel !== filters.educationLevel) return false;
    if (filters.demand && career.demand !== filters.demand) return false;
    if (filters.riasecCodes && filters.riasecCodes.length > 0) {
      const hasMatch = filters.riasecCodes.some((code) =>
        career.riasecCodes.includes(code)
      );
      if (!hasMatch) return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (
        !career.title.toLowerCase().includes(q) &&
        !career.sector.toLowerCase().includes(q) &&
        !career.description.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Hent unike sektorer fra karrieredata.
 */
export async function getAvailableSectors(): Promise<string[]> {
  const careers = await getCareerData();
  return [...new Set(careers.map((c) => c.sector))].sort();
}
