/**
 * Samordna Opptak live-data integrasjon (#107).
 *
 * Kobler ekte opptaksdata til dashboardet:
 * - Poenggrenser med trender (3-års historikk)
 * - Studieplassstatistikk
 * - Sanntids opptaksstatus via Samordna Opptak API
 * - Personalisert konkurranseanalyse basert på elevens SO-poeng
 */

import {
  fetchStudieprogrammer,
  fetchPoenggrenser,
  fetchDBHStatistikk,
  riasecToFagkoder,
  type StudieprogramSO,
  type DBHStudieprogramStatistikk,
} from "./utdanning-no-client";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type OpptaksAnalyse = {
  studieprogram: StudieprogramSO;
  /** Elevens sjanse: 'god' (>=poenggrense+2), 'usikker' (innenfor ±2), 'lav' (<poenggrense-2) */
  sjanse: "god" | "usikker" | "lav" | "ukjent";
  /** Differanse mellom elevens poeng og poenggrensen */
  poengDiff: number | null;
  /** Poenggrense-trend (siste 3 år) */
  trend: "stigende" | "stabil" | "synkende" | "ukjent";
  /** Historiske poenggrenser */
  historikk: { aar: number; ordinaer: number | null; fvitnemaal: number | null }[];
  /** Gjennomstrømningsdata fra DBH */
  gjennomstroemning: DBHStudieprogramStatistikk[];
};

export type StudieprogramMatch = {
  program: StudieprogramSO;
  matchScore: number; // 0–100
  sjanse: "god" | "usikker" | "lav" | "ukjent";
  poengDiff: number | null;
};

// ---------------------------------------------------------------------------
// Analyse-funksjoner
// ---------------------------------------------------------------------------

/**
 * Beregn elevens sjanse for opptak basert på poenggrenser.
 */
export function beregSjanse(
  elevPoeng: number,
  poenggrense: number | null
): { sjanse: "god" | "usikker" | "lav" | "ukjent"; diff: number | null } {
  if (poenggrense === null) return { sjanse: "ukjent", diff: null };

  const diff = elevPoeng - poenggrense;
  if (diff >= 2) return { sjanse: "god", diff };
  if (diff >= -2) return { sjanse: "usikker", diff };
  return { sjanse: "lav", diff };
}

/**
 * Beregn poenggrense-trend fra historiske data.
 */
export function beregTrend(
  historikk: { ordinaer: number | null }[]
): "stigende" | "stabil" | "synkende" | "ukjent" {
  const verdier = historikk
    .map((h) => h.ordinaer)
    .filter((v): v is number => v !== null);

  if (verdier.length < 2) return "ukjent";

  const gjennomsnittEndring =
    (verdier[verdier.length - 1] - verdier[0]) / (verdier.length - 1);

  if (gjennomsnittEndring > 0.5) return "stigende";
  if (gjennomsnittEndring < -0.5) return "synkende";
  return "stabil";
}

/**
 * Fullt analyserer et studieprogram for en elev.
 */
export async function analyserStudieprogram(
  studieprogramkode: string,
  elevPoeng: number
): Promise<OpptaksAnalyse | null> {
  // Hent studieprogram
  const programmer = await fetchStudieprogrammer();
  const program = programmer.find((p) => p.kode === studieprogramkode);
  if (!program) return null;

  // Hent historiske poenggrenser
  const grenser = await fetchPoenggrenser(studieprogramkode);
  const historikk = grenser.map((g) => ({
    aar: g?.aar ?? 0,
    ordinaer: g?.ordinaer ?? null,
    fvitnemaal: g?.forstegangsvitnemaal ?? null,
  }));

  // Beregn sjanse
  const sisteGrense = program.poenggrenser?.ordinaer ?? null;
  const { sjanse, diff } = beregSjanse(elevPoeng, sisteGrense);

  // Beregn trend
  const trend = beregTrend(historikk);

  // Hent gjennomstrømning
  const gjennomstroemning = await fetchDBHStatistikk(
    program.institusjon,
    studieprogramkode
  );

  return {
    studieprogram: program,
    sjanse,
    poengDiff: diff,
    trend,
    historikk,
    gjennomstroemning,
  };
}

/**
 * Finn studieprogram som matcher elevens RIASEC-profil og poeng.
 * Sortert etter matchScore (best match først).
 */
export async function finnMatchendeStudieprogram(
  riasecKode: string,
  elevPoeng: number,
  maxResultater: number = 20
): Promise<StudieprogramMatch[]> {
  // Hent fagkoder basert på RIASEC
  const fagkoder = riasecToFagkoder(riasecKode);

  // Hent studieprogram for hver fagkode (parallelt)
  const programmerSets = await Promise.all(
    fagkoder.slice(0, 5).map((fk) => fetchStudieprogrammer(fk))
  );

  // Dedupliser
  const seen = new Set<string>();
  const alleProgrammer: StudieprogramSO[] = [];
  for (const set of programmerSets) {
    for (const p of set) {
      if (!seen.has(p.kode)) {
        seen.add(p.kode);
        alleProgrammer.push(p);
      }
    }
  }

  // Beregn match-score og sjanse for hvert program
  const matches: StudieprogramMatch[] = alleProgrammer.map((p) => {
    const { sjanse, diff } = beregSjanse(
      elevPoeng,
      p.poenggrenser?.ordinaer ?? null
    );

    // Match-score: basert på sjanse og antall studieplasser
    let matchScore = 50;
    if (sjanse === "god") matchScore += 30;
    else if (sjanse === "usikker") matchScore += 15;
    else if (sjanse === "lav") matchScore -= 10;

    // Bonus for populære studier (mange studieplasser)
    if (p.antallStudieplasser && p.antallStudieplasser > 100) matchScore += 10;
    if (p.antallStudieplasser && p.antallStudieplasser > 50) matchScore += 5;

    return {
      program: p,
      matchScore: Math.max(0, Math.min(100, matchScore)),
      sjanse,
      poengDiff: diff,
    };
  });

  // Sorter: best match først
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResultater);
}

/**
 * Hent opptaksstatistikk for en institusjon.
 */
export async function hentInstitusjonsStatistikk(
  institusjonsNavn: string
): Promise<{
  totaleProgrammer: number;
  gjennomsnittligPoenggrense: number | null;
  lavstePoenggrense: number | null;
  hoyestePoenggrense: number | null;
}> {
  const programmer = await fetchStudieprogrammer();
  const institusjonsProgrammer = programmer.filter(
    (p) => p.institusjon.toLowerCase().includes(institusjonsNavn.toLowerCase())
  );

  const poenggrenser = institusjonsProgrammer
    .map((p) => p.poenggrenser?.ordinaer)
    .filter((g): g is number => g !== null);

  return {
    totaleProgrammer: institusjonsProgrammer.length,
    gjennomsnittligPoenggrense:
      poenggrenser.length > 0
        ? Math.round(
            (poenggrenser.reduce((a, b) => a + b, 0) / poenggrenser.length) * 10
          ) / 10
        : null,
    lavstePoenggrense:
      poenggrenser.length > 0 ? Math.min(...poenggrenser) : null,
    hoyestePoenggrense:
      poenggrenser.length > 0 ? Math.max(...poenggrenser) : null,
  };
}

// ---------------------------------------------------------------------------
// Firestore-basert historikkhenting (#107)
// ---------------------------------------------------------------------------

/**
 * Hent historiske poenggrenser direkte fra admissionHistory-collection
 * (ingestet daglig kl 03:30 fra DBH tabell 571).
 *
 * Returnerer sortert etter år (eldst først).
 */
export async function hentHistorikkFraFirestore(
  programKode: string
): Promise<{ aar: number; ordinaer: number | null; fvitnemaal: number | null }[]> {
  try {
    const q = query(
      collection(db, "admissionHistory"),
      where("programCode", "==", programKode),
      orderBy("year", "asc")
    );
    const snap = await getDocs(q);

    if (snap.empty) return [];

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        aar: data.year ?? 0,
        ordinaer: data.pointsOrdinary ?? null,
        fvitnemaal: data.pointsFirst ?? null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Hent poenggrenser med Firestore-fallback.
 * Prøver utdanning.no API først, faller tilbake til admissionHistory.
 */
export async function hentPoenggrenser(
  studieprogramkode: string
): Promise<{ aar: number; ordinaer: number | null; fvitnemaal: number | null }[]> {
  // Prøv utdanning.no API (via cache)
  const grenser = await fetchPoenggrenser(studieprogramkode);
  if (grenser.length > 0) {
    return grenser.map((g) => ({
      aar: g?.aar ?? 0,
      ordinaer: g?.ordinaer ?? null,
      fvitnemaal: g?.forstegangsvitnemaal ?? null,
    }));
  }

  // Fallback: Firestore (DBH-ingestet data)
  return hentHistorikkFraFirestore(studieprogramkode);
}
