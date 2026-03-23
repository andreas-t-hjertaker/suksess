/**
 * Klient for utdanning.no API (Issue #52)
 *
 * Henter ekte studiedata fra Utdanningsdirektoratets åpne API:
 * - Studieprogram fra Samordna opptak
 * - Poenggrenser (SO-poeng)
 * - Institusjoner og studiesteder
 *
 * Data caches i Firestore via apiResponseCache (se semantic-cache.ts).
 * TTL: 24 timer for studieprogramliste, 1 time for poenggrenser.
 */

import { getApiCache, setApiCache, apiCacheKey } from "@/lib/ai/semantic-cache";

const UTDANNING_API = "https://api.utdanning.no/v1";
const DBH_API = "https://dbh.nsd.uib.no/api";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type StudieprogramSO = {
  /** Samordna opptak studieprogramkode */
  kode: string;
  navn: string;
  institusjon: string;
  studiested: string;
  studieprogramId: string;
  niva: "bachelor" | "master" | "arsstudium" | "fagskole";
  antallStudieplasser: number | null;
  /** Poenggrenser siste opptaksår */
  poenggrenser: {
    ordinaer: number | null;
    forstegangsvitnemaal: number | null;
    aar: number;
  } | null;
  url: string | null;
};

export type InstitusjonInfo = {
  institusjonskode: string;
  navn: string;
  kortNavn: string;
  type: "universitet" | "hoegskole" | "vitenskapeligHoegskole" | "fagskole";
  postnummer: string | null;
  poststed: string | null;
  url: string | null;
};

export type DBHStudieprogramStatistikk = {
  institusjon: string;
  studieprogram: string;
  aar: number;
  registrerteStudenter: number;
  fullfortStudenter: number | null;
  gjennomstroemning: number | null; // 0–1
};

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

async function fetchWithCache<T>(
  url: string,
  ttlMs: number,
  source: string
): Promise<T | null> {
  const key = apiCacheKey(url);

  const cached = await getApiCache<T>(key);
  if (cached !== null) return cached;

  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });
    if (!resp.ok) return null;

    const data = await resp.json() as T;
    await setApiCache(key, data, source, ttlMs);
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API-funksjoner
// ---------------------------------------------------------------------------

/**
 * Hent liste over studieprogram fra Samordna opptak.
 * Returnerer opptil 500 programmer filtrert på RIASEC-relevant fagkode.
 */
export async function fetchStudieprogrammer(
  fagkode?: string
): Promise<StudieprogramSO[]> {
  const url = fagkode
    ? `${UTDANNING_API}/utdanning?fagkode=${encodeURIComponent(fagkode)}&antall=500`
    : `${UTDANNING_API}/utdanning?antall=500`;

  const data = await fetchWithCache<{ utdanninger: StudieprogramSO[] }>(
    url,
    24 * 60 * 60 * 1000, // 24 timer
    "utdanning.no"
  );

  return data?.utdanninger ?? [];
}

/**
 * Hent poenggrenser for et spesifikt studieprogram.
 * Returnerer historiske grenser for siste 3 år.
 */
export async function fetchPoenggrenser(
  studieprogramkode: string
): Promise<StudieprogramSO["poenggrenser"][]> {
  const url = `${UTDANNING_API}/poenggrenser/${encodeURIComponent(studieprogramkode)}`;

  const data = await fetchWithCache<{ grenser: StudieprogramSO["poenggrenser"][] }>(
    url,
    60 * 60 * 1000, // 1 time
    "utdanning.no"
  );

  return data?.grenser ?? [];
}

/**
 * Hent institusjonsliste fra DBH (Database for høyere utdanning).
 */
export async function fetchInstitusjoner(): Promise<InstitusjonInfo[]> {
  const url = `${DBH_API}/Institusjon/json`;

  const data = await fetchWithCache<InstitusjonInfo[]>(
    url,
    7 * 24 * 60 * 60 * 1000, // 7 dager
    "dbh.nsd.uib.no"
  );

  return data ?? [];
}

/**
 * Hent gjennomstrømningsstatistikk fra DBH for et studieprogram.
 */
export async function fetchDBHStatistikk(
  institusjonskode: string,
  studieprogramkode: string,
  aarFra: number = new Date().getFullYear() - 3
): Promise<DBHStudieprogramStatistikk[]> {
  const url = `${DBH_API}/StudieprogrammerRegistrert/json?institusjonskode=${institusjonskode}&nusKode=${studieprogramkode}&aar=${aarFra}`;

  const data = await fetchWithCache<DBHStudieprogramStatistikk[]>(
    url,
    24 * 60 * 60 * 1000,
    "dbh.nsd.uib.no"
  );

  return data ?? [];
}

// ---------------------------------------------------------------------------
// RIASEC → studieprogramkategori-mapping
// ---------------------------------------------------------------------------

/** Mapper RIASEC-profil til relevante Samordna opptak-fagkoder */
export function riasecToFagkoder(riasecCode: string): string[] {
  const mapping: Record<string, string[]> = {
    R: ["bygg", "elektro", "mekanisk", "realfag", "teknikk"],
    I: ["matematikk", "informatikk", "naturfag", "medisin", "biologi"],
    A: ["kunst", "design", "media", "musikk", "arkitektur"],
    S: ["laerer", "sykepleie", "sosial", "helse", "pedagogikk"],
    E: ["okonomistudier", "rettsstudier", "ledelse", "markedsfoering"],
    C: ["administrasjon", "regnskap", "logistikk", "okonomi"],
  };

  return riasecCode
    .split("")
    .flatMap((code) => mapping[code] ?? []);
}
