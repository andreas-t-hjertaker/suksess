/**
 * Poengkalkulator for norsk VGS og Samordna opptak.
 *
 * Regler:
 * - Grunnskolepoeng: gjennomsnitt × 10 (maks 60)
 * - 23/5-regelen: 23 år + 5 års yrkespraksis
 * - Realfagspoeng: R2 → 3p, R1/T → 1p, Fy2/Ky2/Bi2/Ge2 → 2p, Fy1/Ky1/... → 1p
 * - Tilleggspoeng: fremmedspråk nivå 2 → 0.5p, fremmedspråk nivå 3 → 1p
 *
 * Kilde: Samordna opptak, Udir
 */

import type { Grade } from "@/types/domain";

export type GradeWithId = Grade & { id: string };

// ---------------------------------------------------------------------------
// Fagkode → realfagspoeng-mapping (utvalg)
// ---------------------------------------------------------------------------

const REALFAGSPOENG: Record<string, number> = {
  // Matematikk
  MAT3206: 3, // R2 (Matematikk 2R)
  MAT3205: 1, // R1 (Matematikk 1R)
  MAT3204: 1, // T2 (Matematikk 2T)
  MAT3203: 1, // T1 (Matematikk 1T)
  // Fysikk
  FYS3101: 2, // Fysikk 2
  FYS3100: 1, // Fysikk 1
  // Kjemi
  KJE3101: 2, // Kjemi 2
  KJE3100: 1, // Kjemi 1
  // Biologi
  BIO3101: 2, // Biologi 2
  BIO3100: 1, // Biologi 1
  // Geofag
  GEO3101: 2, // Geofag 2
  GEO3100: 1, // Geofag 1
  // IT
  INF3101: 1, // Informasjonsteknologi 2
};

// ---------------------------------------------------------------------------
// Beregninger
// ---------------------------------------------------------------------------

export type GradePoints = {
  /** Karaktergjennomsnitt (1–6) */
  average: number;
  /** Samordna opptak-poeng (0–60, skalert ×10) */
  quotaPoints: number;
  /** Realfagspoeng */
  sciencePoints: number;
  /** Totalt med realfagspoeng (maks 64) */
  totalPoints: number;
  /** Antall fag i beregningen */
  subjectCount: number;
};

export function calculateGradePoints(grades: GradeWithId[]): GradePoints {
  if (grades.length === 0) {
    return { average: 0, quotaPoints: 0, sciencePoints: 0, totalPoints: 0, subjectCount: 0 };
  }

  // Bruk nyeste karakter per fag (høyest år + siste termin)
  const latestBySubject = new Map<string, GradeWithId>();
  for (const g of grades) {
    const key = g.fagkode ?? g.subject;
    const existing = latestBySubject.get(key);
    if (
      !existing ||
      g.year > existing.year ||
      (g.year === existing.year && g.term === "ht" && existing.term === "vt")
    ) {
      latestBySubject.set(key, g);
    }
  }

  const latest = Array.from(latestBySubject.values());
  const sum = latest.reduce((acc, g) => acc + g.grade, 0);
  const average = sum / latest.length;
  const quotaPoints = Math.min(Math.round(average * 10 * 10) / 10, 60);

  // Realfagspoeng
  let sciencePoints = 0;
  for (const g of latest) {
    if (g.fagkode && REALFAGSPOENG[g.fagkode]) {
      sciencePoints += REALFAGSPOENG[g.fagkode];
    }
  }
  sciencePoints = Math.min(sciencePoints, 4); // maks 4 realfagspoeng

  const totalPoints = Math.min(quotaPoints + sciencePoints, 64);

  return {
    average: Math.round(average * 100) / 100,
    quotaPoints,
    sciencePoints,
    totalPoints,
    subjectCount: latest.length,
  };
}

// ---------------------------------------------------------------------------
// Studieprogram-data (utvalg fra Samordna opptak)
// ---------------------------------------------------------------------------

export type StudyProgramEntry = {
  name: string;
  institution: string;
  requiredPoints: number; // Nedre kvartil siste år
  topPoints: number;      // Øvre kvartil / ordinær kvote
  url: string;
};

/** Representativt utvalg av populære studier med opptaksgrenser 2024 */
export const STUDY_PROGRAMS: StudyProgramEntry[] = [
  // Medisin
  { name: "Medisin", institution: "UiO", requiredPoints: 66.3, topPoints: 68.0, url: "https://www.samordnaopptak.no" },
  { name: "Medisin", institution: "UiB", requiredPoints: 65.5, topPoints: 67.5, url: "https://www.samordnaopptak.no" },
  { name: "Medisin", institution: "UiT", requiredPoints: 62.0, topPoints: 65.0, url: "https://www.samordnaopptak.no" },
  // Juss
  { name: "Rettsvitenskap", institution: "UiO", requiredPoints: 57.8, topPoints: 60.0, url: "https://www.samordnaopptak.no" },
  { name: "Rettsvitenskap", institution: "UiB", requiredPoints: 55.3, topPoints: 58.0, url: "https://www.samordnaopptak.no" },
  // Psykologi
  { name: "Profesjonsstudium i psykologi", institution: "UiO", requiredPoints: 58.3, topPoints: 61.0, url: "https://www.samordnaopptak.no" },
  { name: "Profesjonsstudium i psykologi", institution: "UiB", requiredPoints: 56.5, topPoints: 59.0, url: "https://www.samordnaopptak.no" },
  // Sivilingeniør
  { name: "Sivilingeniør, datateknikk", institution: "NTNU", requiredPoints: 50.5, topPoints: 56.8, url: "https://www.samordnaopptak.no" },
  { name: "Sivilingeniør, elektronikk", institution: "NTNU", requiredPoints: 48.2, topPoints: 53.1, url: "https://www.samordnaopptak.no" },
  { name: "Sivilingeniør, bygg- og miljøteknikk", institution: "NTNU", requiredPoints: 47.5, topPoints: 52.8, url: "https://www.samordnaopptak.no" },
  // Informatikk
  { name: "Informatikk (bachelor)", institution: "UiO", requiredPoints: 48.3, topPoints: 54.5, url: "https://www.samordnaopptak.no" },
  { name: "Informatikk (bachelor)", institution: "OsloMet", requiredPoints: 44.5, topPoints: 50.2, url: "https://www.samordnaopptak.no" },
  // Økonomi
  { name: "Siviløkonom", institution: "NHH", requiredPoints: 56.5, topPoints: 59.2, url: "https://www.samordnaopptak.no" },
  { name: "Økonomi og administrasjon", institution: "BI", requiredPoints: 48.0, topPoints: 52.5, url: "https://www.samordnaopptak.no" },
  { name: "Økonomi og administrasjon", institution: "UiA", requiredPoints: 42.0, topPoints: 47.5, url: "https://www.samordnaopptak.no" },
  // Sykepleie
  { name: "Sykepleie (bachelor)", institution: "OsloMet", requiredPoints: 46.0, topPoints: 50.5, url: "https://www.samordnaopptak.no" },
  { name: "Sykepleie (bachelor)", institution: "UiT", requiredPoints: 43.5, topPoints: 48.2, url: "https://www.samordnaopptak.no" },
  // Lærerutdanning
  { name: "Grunnskolelærer 1–7", institution: "OsloMet", requiredPoints: 44.5, topPoints: 49.0, url: "https://www.samordnaopptak.no" },
  { name: "Lektor (5 år)", institution: "UiO", requiredPoints: 47.5, topPoints: 52.3, url: "https://www.samordnaopptak.no" },
  // Arkitektur
  { name: "Arkitektur (master)", institution: "NTNU", requiredPoints: 55.2, topPoints: 59.0, url: "https://www.samordnaopptak.no" },
  // Odontologi
  { name: "Odontologi", institution: "UiB", requiredPoints: 60.5, topPoints: 63.5, url: "https://www.samordnaopptak.no" },
  // Ingeniør
  { name: "Ingeniør, data", institution: "OsloMet", requiredPoints: 40.5, topPoints: 46.8, url: "https://www.samordnaopptak.no" },
  { name: "Ingeniør, elektronikk", institution: "NTNU", requiredPoints: 38.2, topPoints: 44.5, url: "https://www.samordnaopptak.no" },
  // Biologi
  { name: "Biologi (bachelor)", institution: "UiO", requiredPoints: 42.5, topPoints: 47.8, url: "https://www.samordnaopptak.no" },
  // Samfunnsvitenskap
  { name: "Statsvitenskap (bachelor)", institution: "UiO", requiredPoints: 46.5, topPoints: 51.2, url: "https://www.samordnaopptak.no" },
  { name: "Sosiologi (bachelor)", institution: "UiO", requiredPoints: 43.0, topPoints: 48.5, url: "https://www.samordnaopptak.no" },
  // Medier og kommunikasjon
  { name: "Medier og kommunikasjon", institution: "UiO", requiredPoints: 50.5, topPoints: 54.2, url: "https://www.samordnaopptak.no" },
  { name: "Journalistikk", institution: "OsloMet", requiredPoints: 48.2, topPoints: 52.8, url: "https://www.samordnaopptak.no" },
  // Farmasi
  { name: "Farmasi (master)", institution: "UiO", requiredPoints: 52.3, topPoints: 56.8, url: "https://www.samordnaopptak.no" },
  // Veterinær
  { name: "Veterinærmedisin", institution: "NMBU", requiredPoints: 60.2, topPoints: 63.0, url: "https://www.samordnaopptak.no" },
  // Ernæring
  { name: "Ernæring (bachelor)", institution: "UiO", requiredPoints: 48.8, topPoints: 53.2, url: "https://www.samordnaopptak.no" },
  // Design
  { name: "Industridesign", institution: "NTNU", requiredPoints: 52.0, topPoints: 55.8, url: "https://www.samordnaopptak.no" },
  // Musikk
  { name: "Musikk (bachelor)", institution: "NTNU", requiredPoints: 38.0, topPoints: 44.5, url: "https://www.samordnaopptak.no" },
  // IKT
  { name: "Informasjonssikkerhet", institution: "NTNU", requiredPoints: 47.5, topPoints: 53.0, url: "https://www.samordnaopptak.no" },
  // Økonomi bachelor
  { name: "Økonomi og forretningsjus", institution: "UiT", requiredPoints: 40.2, topPoints: 46.0, url: "https://www.samordnaopptak.no" },
  // Kunst
  { name: "Billedkunst", institution: "KHiO", requiredPoints: 35.0, topPoints: 42.0, url: "https://www.samordnaopptak.no" },
  // Drama
  { name: "Drama og teater", institution: "NTNU", requiredPoints: 42.5, topPoints: 48.0, url: "https://www.samordnaopptak.no" },
  // Geofag
  { name: "Geografi (bachelor)", institution: "UiO", requiredPoints: 40.0, topPoints: 45.5, url: "https://www.samordnaopptak.no" },
  // Matematikk
  { name: "Matematikk (bachelor)", institution: "UiO", requiredPoints: 41.5, topPoints: 46.8, url: "https://www.samordnaopptak.no" },
  // Fysikk
  { name: "Fysikk (bachelor)", institution: "UiO", requiredPoints: 43.0, topPoints: 48.5, url: "https://www.samordnaopptak.no" },
  // Kjemi
  { name: "Kjemi (bachelor)", institution: "UiO", requiredPoints: 40.5, topPoints: 46.2, url: "https://www.samordnaopptak.no" },
  // Idrettsfag
  { name: "Idrettsfag / fysioterapi", institution: "OsloMet", requiredPoints: 44.5, topPoints: 50.0, url: "https://www.samordnaopptak.no" },
  // Friluftsliv
  { name: "Friluftsliv og naturguiding", institution: "USN", requiredPoints: 35.5, topPoints: 41.0, url: "https://www.samordnaopptak.no" },
  // Barnehage
  { name: "Barnehagelærer", institution: "OsloMet", requiredPoints: 37.5, topPoints: 43.0, url: "https://www.samordnaopptak.no" },
  // Sosionom
  { name: "Sosialt arbeid (bachelor)", institution: "OsloMet", requiredPoints: 40.0, topPoints: 45.8, url: "https://www.samordnaopptak.no" },
  // Vernepleier
  { name: "Vernepleie", institution: "OsloMet", requiredPoints: 38.5, topPoints: 44.2, url: "https://www.samordnaopptak.no" },
  // Resept
  { name: "Reseptarstudiet", institution: "OsloMet", requiredPoints: 44.0, topPoints: 49.5, url: "https://www.samordnaopptak.no" },
  // Radiografi
  { name: "Radiografi", institution: "OsloMet", requiredPoints: 43.5, topPoints: 49.0, url: "https://www.samordnaopptak.no" },
  // Ergoterapi
  { name: "Ergoterapi", institution: "OsloMet", requiredPoints: 40.0, topPoints: 45.5, url: "https://www.samordnaopptak.no" },
  // Bioingeniør
  { name: "Bioingeniør", institution: "OsloMet", requiredPoints: 42.0, topPoints: 47.5, url: "https://www.samordnaopptak.no" },
];

// ---------------------------------------------------------------------------
// "Hva-om"-simulator
// ---------------------------------------------------------------------------

export type WhatIfGrade = {
  subject: string;
  currentGrade: number;
  simulatedGrade: number;
};

export function simulateGradeChange(
  grades: GradeWithId[],
  change: WhatIfGrade
): GradePoints {
  const modified = grades.map((g) =>
    g.subject === change.subject
      ? { ...g, grade: change.simulatedGrade as Grade["grade"] }
      : g
  );
  return calculateGradePoints(modified);
}
