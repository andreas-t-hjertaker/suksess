/**
 * Jobbmatch med ekte stillinger fra NAV (#129).
 *
 * Kobler jobbmatch-siden til ekte stillingsannonser fra NAV Arbeidsplassen
 * (pam-stilling-feed) som er lagret i Firestore via ingest-funksjonen.
 *
 * RIASEC-matching: mapper STYRK-08 yrkeskoder til RIASEC-koder for
 * personalisert jobbmatching basert på elevens interesseprofil.
 */

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type NavJobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "heltid" | "deltid" | "lærling" | "internship" | "annet";
  sector: string;
  description: string;
  applicationUrl: string | null;
  deadline: string | null;
  published: string;
  styrkCode: string | null;
  riasecCodes: string[];
  matchScore: number; // 0–100
};

export type JobSearchParams = {
  query?: string;
  location?: string;
  type?: string;
  sector?: string;
  riasecProfile?: RiasecScores;
  limit?: number;
  cursor?: QueryDocumentSnapshot;
};

export type JobSearchResult = {
  jobs: NavJobListing[];
  total: number;
  hasMore: boolean;
  cursor: QueryDocumentSnapshot | null;
};

// ---------------------------------------------------------------------------
// STYRK-08 → RIASEC mapping
// ---------------------------------------------------------------------------

/**
 * Mapper STYRK-08 hovedgrupper (1. siffer) til primære RIASEC-koder.
 * Basert på Holland-kode forskning og norsk yrkesklassifisering.
 */
const STYRK_RIASEC_MAP: Record<string, (keyof RiasecScores)[]> = {
  "0": ["enterprising", "conventional"],       // Militære yrker
  "1": ["enterprising", "conventional", "social"], // Ledere
  "2": ["investigative", "social"],              // Akademiske yrker
  "3": ["conventional", "social", "realistic"],  // Teknikere
  "4": ["conventional", "enterprising"],         // Kontor og kundeservice
  "5": ["social", "enterprising"],               // Salg, service, omsorg
  "6": ["realistic", "conventional"],            // Bønder, fiskere
  "7": ["realistic", "investigative"],           // Håndverkere
  "8": ["realistic", "conventional"],            // Operatører, sjåfører
  "9": ["realistic", "conventional"],            // Renholdere, hjelpearbeidere
};

/**
 * Mer spesifikk mapping for 2-sifrede STYRK-koder.
 */
const STYRK_2_RIASEC_MAP: Record<string, (keyof RiasecScores)[]> = {
  "21": ["investigative", "realistic"],           // Realfag og ingeniører
  "22": ["investigative", "social"],              // Helseyrker
  "23": ["social", "artistic"],                   // Undervisning
  "24": ["conventional", "enterprising"],         // Økonomi, HR, juss
  "25": ["investigative", "realistic", "conventional"], // IT
  "26": ["social", "artistic", "investigative"],  // Kultur og samfunn
  "31": ["realistic", "investigative"],           // Tekniske yrker
  "32": ["social", "realistic"],                  // Helseteknikere
  "33": ["conventional", "enterprising"],         // Forretning, finans
  "34": ["social", "artistic"],                   // Juss, sosial, kultur
  "35": ["realistic", "investigative"],           // IKT-teknikere
  "51": ["social", "enterprising"],               // Personlig tjenesteyting
  "52": ["enterprising", "social"],               // Selgere
  "53": ["social", "realistic"],                  // Omsorg
  "71": ["realistic", "artistic"],                // Bygg og anlegg
  "72": ["realistic", "investigative"],           // Metall og maskin
  "75": ["realistic", "artistic"],                // Mat og trearbeid
};

/**
 * Hent RIASEC-koder for en STYRK-08 kode.
 */
export function styrkToRiasec(styrkCode: string | null): (keyof RiasecScores)[] {
  if (!styrkCode) return [];

  // Prøv 2-sifret kode først (mer spesifikk)
  const twoDigit = styrkCode.substring(0, 2);
  if (STYRK_2_RIASEC_MAP[twoDigit]) return STYRK_2_RIASEC_MAP[twoDigit];

  // Fallback til 1-sifret kode
  const oneDigit = styrkCode.substring(0, 1);
  if (STYRK_RIASEC_MAP[oneDigit]) return STYRK_RIASEC_MAP[oneDigit];

  return [];
}

/**
 * Beregn matchscore mellom en stilling og brukerens RIASEC-profil.
 */
export function calculateJobMatchScore(
  jobRiasec: (keyof RiasecScores)[],
  userProfile: RiasecScores
): number {
  if (jobRiasec.length === 0) return 50; // Ukjent = nøytral

  const scores = jobRiasec.map((code) => userProfile[code] ?? 50);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return Math.round(avgScore);
}

// ---------------------------------------------------------------------------
// Hent-funksjoner
// ---------------------------------------------------------------------------

/**
 * Søk etter stillinger fra NAV med filtrering og RIASEC-matching.
 */
export async function searchJobs(params: JobSearchParams): Promise<JobSearchResult> {
  const constraints = [];

  // Basis: kun aktive stillinger
  constraints.push(where("active", "==", true));

  // Lokasjon-filter
  if (params.location) {
    constraints.push(where("location", "==", params.location));
  }

  // Type-filter
  if (params.type) {
    constraints.push(where("type", "==", params.type));
  }

  // Sektor-filter
  if (params.sector) {
    constraints.push(where("sector", "==", params.sector));
  }

  // Sortering og paginering
  constraints.push(orderBy("published", "desc"));
  constraints.push(limit(params.limit || 20));

  if (params.cursor) {
    constraints.push(startAfter(params.cursor));
  }

  const q = query(collection(db, "jobListings"), ...constraints);
  const snap = await getDocs(q);

  const jobs: NavJobListing[] = snap.docs.map((d) => {
    const data = d.data();
    const styrkCode = data.styrkCode || null;
    const riasecCodes = styrkToRiasec(styrkCode);
    const matchScore = params.riasecProfile
      ? calculateJobMatchScore(riasecCodes, params.riasecProfile)
      : 50;

    return {
      id: d.id,
      title: data.title || "",
      company: data.company || "",
      location: data.location || "",
      type: data.type || "annet",
      sector: data.sector || "",
      description: data.description || "",
      applicationUrl: data.applicationUrl || null,
      deadline: data.deadline || null,
      published: data.published || "",
      styrkCode,
      riasecCodes: riasecCodes as string[],
      matchScore,
    };
  });

  // Sorter etter matchscore (best match først) om bruker har RIASEC-profil
  if (params.riasecProfile) {
    jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Filtrer på fritekst-søk (klient-side, etter Firestore-henting)
  let filteredJobs = jobs;
  if (params.query) {
    const q = params.query.toLowerCase();
    filteredJobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
    );
  }

  return {
    jobs: filteredJobs,
    total: filteredJobs.length,
    hasMore: snap.size === (params.limit || 20),
    cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
  };
}

/**
 * Hent tilgjengelige lokasjoner fra stillingsannonser.
 */
export async function getAvailableLocations(): Promise<string[]> {
  // Hent unike lokasjoner fra de nyeste annonsene
  const snap = await getDocs(
    query(
      collection(db, "jobListings"),
      where("active", "==", true),
      orderBy("published", "desc"),
      limit(200)
    )
  );

  const locations = new Set<string>();
  snap.docs.forEach((d) => {
    const loc = d.data().location;
    if (loc) locations.add(loc);
  });

  return [...locations].sort();
}

/**
 * Hent jobbstatistikk for RIASEC-koder.
 */
export async function getJobCountByRiasec(): Promise<Record<string, number>> {
  const snap = await getDocs(
    query(
      collection(db, "jobListings"),
      where("active", "==", true),
      limit(500)
    )
  );

  const counts: Record<string, number> = {
    realistic: 0,
    investigative: 0,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0,
  };

  snap.docs.forEach((d) => {
    const styrk = d.data().styrkCode;
    const riasec = styrkToRiasec(styrk);
    riasec.forEach((code) => {
      counts[code] = (counts[code] || 0) + 1;
    });
  });

  return counts;
}
