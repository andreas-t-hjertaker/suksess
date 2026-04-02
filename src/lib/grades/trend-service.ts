/**
 * Trenddata-tjeneste for søknadscoach (#144)
 *
 * Henter historiske poenggrenser fra Firestore med fallback til mock-data.
 * Data lagres i Firestore: admissionTrends/{programKey}
 *
 * Firestore-dokument format:
 *   {
 *     programName: "Medisin",
 *     institution: "UiO",
 *     years: [
 *       { year: 2020, required: 65.1, top: 67.2 },
 *       { year: 2021, required: 65.5, top: 67.5 },
 *       ...
 *     ],
 *     updatedAt: Timestamp,
 *     source: "dbh" | "samordna-opptak"
 *   }
 */

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ─── Typer ───────────────────────────────────────────────────────────────────

export type TrendEntry = {
  year: number;
  required: number;
  top: number;
};

export type ProgramTrend = {
  programName: string;
  institution: string;
  years: TrendEntry[];
  source: "firestore" | "mock";
};

// ─── Mock-data (fallback) ────────────────────────────────────────────────────

const MOCK_TRENDS: Record<string, TrendEntry[]> = {
  "Medisin|UiO": [
    { year: 2020, required: 65.1, top: 67.2 },
    { year: 2021, required: 65.5, top: 67.5 },
    { year: 2022, required: 65.8, top: 67.8 },
    { year: 2023, required: 66.0, top: 67.9 },
    { year: 2024, required: 66.3, top: 68.0 },
  ],
  "Medisin|UiB": [
    { year: 2020, required: 64.2, top: 66.5 },
    { year: 2021, required: 64.6, top: 66.8 },
    { year: 2022, required: 65.0, top: 67.0 },
    { year: 2023, required: 65.2, top: 67.2 },
    { year: 2024, required: 65.5, top: 67.5 },
  ],
  "Sivilingeniør, datateknikk|NTNU": [
    { year: 2020, required: 48.5, top: 54.2 },
    { year: 2021, required: 49.0, top: 55.0 },
    { year: 2022, required: 49.8, top: 55.8 },
    { year: 2023, required: 50.2, top: 56.3 },
    { year: 2024, required: 50.5, top: 56.8 },
  ],
  "Rettsvitenskap|UiO": [
    { year: 2020, required: 56.5, top: 58.5 },
    { year: 2021, required: 56.8, top: 58.8 },
    { year: 2022, required: 57.2, top: 59.5 },
    { year: 2023, required: 57.5, top: 59.8 },
    { year: 2024, required: 57.8, top: 60.0 },
  ],
  "Siviløkonom|NHH": [
    { year: 2020, required: 55.0, top: 57.8 },
    { year: 2021, required: 55.5, top: 58.2 },
    { year: 2022, required: 55.8, top: 58.5 },
    { year: 2023, required: 56.2, top: 59.0 },
    { year: 2024, required: 56.5, top: 59.2 },
  ],
  "Profesjonsstudium i psykologi|UiO": [
    { year: 2020, required: 57.0, top: 59.5 },
    { year: 2021, required: 57.5, top: 60.0 },
    { year: 2022, required: 57.8, top: 60.5 },
    { year: 2023, required: 58.0, top: 60.8 },
    { year: 2024, required: 58.3, top: 61.0 },
  ],
  "Informatikk (bachelor)|UiO": [
    { year: 2020, required: 46.5, top: 52.0 },
    { year: 2021, required: 47.0, top: 52.8 },
    { year: 2022, required: 47.5, top: 53.2 },
    { year: 2023, required: 48.0, top: 54.0 },
    { year: 2024, required: 48.3, top: 54.5 },
  ],
  "Sykepleie (bachelor)|OsloMet": [
    { year: 2020, required: 44.5, top: 49.0 },
    { year: 2021, required: 45.0, top: 49.5 },
    { year: 2022, required: 45.5, top: 50.0 },
    { year: 2023, required: 45.8, top: 50.2 },
    { year: 2024, required: 46.0, top: 50.5 },
  ],
};

// ─── Firestore-henting ───────────────────────────────────────────────────────

/** Cache for allerede hentede trender */
const trendCache = new Map<string, ProgramTrend>();

/**
 * Hent trenddata for et studieprogram.
 * Prøver Firestore først, faller tilbake til mock-data.
 */
export async function fetchProgramTrend(
  programName: string,
  institution: string
): Promise<ProgramTrend> {
  const key = `${programName}|${institution}`;

  // Sjekk cache
  if (trendCache.has(key)) return trendCache.get(key)!;

  // Prøv Firestore
  try {
    const docKey = key.replace(/[/|]/g, "_").toLowerCase();
    const trendsRef = collection(db, "admissionTrends", docKey, "years");
    const q = query(trendsRef, orderBy("year", "asc"), limit(10));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const years = snap.docs.map((d) => d.data() as TrendEntry);
      const trend: ProgramTrend = {
        programName,
        institution,
        years,
        source: "firestore",
      };
      trendCache.set(key, trend);
      return trend;
    }
  } catch {
    // Firestore utilgjengelig — fall tilbake
  }

  // Fallback til mock-data
  const mockYears = MOCK_TRENDS[key];
  const trend: ProgramTrend = {
    programName,
    institution,
    years: mockYears ?? generateFallbackTrend(42), // generisk fallback
    source: "mock",
  };
  trendCache.set(key, trend);
  return trend;
}

/**
 * Hent trenddata synkront fra mock (for initiell rendering).
 * Brukes av søknadscoach-siden som fallback.
 */
export function getMockTrend(programName: string, institution: string): TrendEntry[] {
  const key = `${programName}|${institution}`;
  return MOCK_TRENDS[key] ?? generateFallbackTrend(42);
}

/** Generer lineær fallback-trend basert på poeng */
function generateFallbackTrend(basePoints: number): TrendEntry[] {
  const YEARS = [2020, 2021, 2022, 2023, 2024];
  return YEARS.map((year, i) => ({
    year,
    required: Math.round((basePoints - (4 - i) * 0.4) * 10) / 10,
    top: Math.round((basePoints + 5 - (4 - i) * 0.4) * 10) / 10,
  }));
}

/**
 * Beregn trendretning og anbefaling.
 */
export function analyzeTrend(entries: TrendEntry[]): {
  direction: "rising" | "falling" | "stable";
  changePerYear: number;
  totalChange: number;
} {
  if (entries.length < 2) {
    return { direction: "stable", changePerYear: 0, totalChange: 0 };
  }

  const first = entries[0].required;
  const last = entries[entries.length - 1].required;
  const totalChange = last - first;
  const years = entries.length - 1;
  const changePerYear = totalChange / years;

  let direction: "rising" | "falling" | "stable";
  if (Math.abs(totalChange) < 0.5) {
    direction = "stable";
  } else if (totalChange > 0) {
    direction = "rising";
  } else {
    direction = "falling";
  }

  return {
    direction,
    changePerYear: Math.round(changePerYear * 10) / 10,
    totalChange: Math.round(totalChange * 10) / 10,
  };
}

/**
 * Beregn sjanse basert på brukerens poeng og historisk trend.
 */
export function estimateChance(
  userPoints: number,
  entries: TrendEntry[]
): { percentage: number; label: string; color: string } {
  if (entries.length === 0) {
    return { percentage: 50, label: "Ukjent", color: "text-muted-foreground" };
  }

  const latest = entries[entries.length - 1];
  const diff = userPoints - latest.required;

  if (diff >= 3) {
    return { percentage: 95, label: "Svært gode sjanser", color: "text-green-600 dark:text-green-400" };
  }
  if (diff >= 1) {
    return { percentage: 80, label: "Gode sjanser", color: "text-green-600 dark:text-green-400" };
  }
  if (diff >= -1) {
    return { percentage: 55, label: "Usikkert", color: "text-amber-600 dark:text-amber-400" };
  }
  if (diff >= -3) {
    return { percentage: 30, label: "Krevende", color: "text-orange-600 dark:text-orange-400" };
  }
  return { percentage: 10, label: "Svært krevende", color: "text-red-600 dark:text-red-400" };
}
