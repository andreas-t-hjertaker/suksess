/**
 * Klient for studiedata (Issue #52, #58)
 *
 * Henter studiedata fra Firestore (populert av ingest-scheduler).
 * Ingest henter fra Studievelgeren API, Grep/Udir og utdanning.no (NLOD).
 */

"use client";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getFirestore,
  doc,
  getDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase/config";

const DBH_API = "https://dbh.nsd.uib.no/api";

// ─── Typer ────────────────────────────────────────────────────────────────────

export type StudieprogramSO = {
  kode: string;
  navn: string;
  institusjon: string;
  studiested: string;
  studieprogramId: string;
  niva: "bachelor" | "master" | "arsstudium" | "fagskole";
  antallStudieplasser: number | null;
  poenggrenser: {
    ordinaer: number | null;
    forstegangsvitnemaal: number | null;
    aar: number;
  } | null;
  url: string | null;
};

export type StudyProgram = {
  id: string;
  name: string;
  institution: string;
  level: string;
  soCode: string | null;
  poengForste: number | null;
  poengOrdinar: number | null;
  leveringsmate: string | null;
  tags: string[];
  url: string | null;
  source: string;
};

export type VgsProgram = {
  kode: string;
  tittel: string;
  tittelNn: string | null;
  url: string | null;
};

export type UtdanningsBeskrivelse = {
  id: string;
  tittel: string;
  opptakskrav: string;
  yrkesutsikter: string;
  innhold: string;
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
  gjennomstroemning: number | null;
};

// ─── Firestore-baserte funksjoner ─────────────────────────────────────────────

function db() {
  return getFirestore(app);
}

/** Hent studieprogram fra Firestore (populert av ingest-scheduler) */
export async function fetchStudieprogrammer(
  filterTag?: string,
  maxResults = 50
): Promise<StudyProgram[]> {
  const col = collection(db(), "studyPrograms");
  const q = filterTag
    ? query(col, where("tags", "array-contains", filterTag), limit(maxResults))
    : query(col, orderBy("name"), limit(maxResults));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyProgram));
}

/** Hent VGS-utdanningsprogrammer fra Firestore */
export async function fetchVgsProgrammer(): Promise<VgsProgram[]> {
  const snap = await getDocs(collection(db(), "vgsPrograms"));
  return snap.docs.map((d) => ({ kode: d.id, ...d.data() } as VgsProgram));
}

/** Hent utdanningsbeskrivelse fra Firestore */
export async function fetchUtdanningsbeskrivelse(id: string): Promise<UtdanningsBeskrivelse | null> {
  const snap = await getDoc(doc(db(), "educationDescriptions", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UtdanningsBeskrivelse;
}

/** Søk i studieprogram etter navn (enkel prefix-søk) */
export async function searchStudieprogram(term: string, maxResults = 20): Promise<StudyProgram[]> {
  const col = collection(db(), "studyPrograms");
  const termUpper = term.charAt(0).toUpperCase() + term.slice(1);
  const q = query(
    col,
    where("name", ">=", term),
    where("name", "<=", term + "\uf8ff"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyProgram));
}

// ─── DBH direkte-kall for poenggrenser ───────────────────────────────────────

export async function fetchDBHStatistikk(
  institusjonskode: string,
  studieprogramkode: string,
  aarFra: number = new Date().getFullYear() - 3
): Promise<DBHStudieprogramStatistikk[]> {
  try {
    const url = `${DBH_API}/StudieprogrammerRegistrert/json?institusjonskode=${institusjonskode}&nusKode=${studieprogramkode}&aar=${aarFra}`;
    const resp = await fetch(url, { next: { revalidate: 86400 } });
    if (!resp.ok) return [];
    return await resp.json() as DBHStudieprogramStatistikk[];
  } catch {
    return [];
  }
}

// ─── RIASEC → fagkode-mapping ─────────────────────────────────────────────────

export function riasecToFagkoder(riasecCode: string): string[] {
  const mapping: Record<string, string[]> = {
    R: ["bygg", "elektro", "mekanisk", "realfag", "teknikk"],
    I: ["matematikk", "informatikk", "naturfag", "medisin", "biologi"],
    A: ["kunst", "design", "media", "musikk", "arkitektur"],
    S: ["laerer", "sykepleie", "sosial", "helse", "pedagogikk"],
    E: ["okonomistudier", "rettsstudier", "ledelse", "markedsfoering"],
    C: ["administrasjon", "regnskap", "logistikk", "okonomi"],
  };
  return riasecCode.split("").flatMap((code) => mapping[code] ?? []);
}

// Backwards-compat eksport
export async function fetchStudieprogrammerLegacy(fagkode?: string): Promise<StudieprogramSO[]> {
  const programs = await fetchStudieprogrammer(fagkode);
  return programs.map((p) => ({
    kode: p.soCode ?? p.id,
    navn: p.name,
    institusjon: p.institution,
    studiested: p.institution,
    studieprogramId: p.id,
    niva: (p.level as StudieprogramSO["niva"]) ?? "bachelor",
    antallStudieplasser: null,
    poenggrenser: p.poengOrdinar != null
      ? { ordinaer: p.poengOrdinar, forstegangsvitnemaal: p.poengForste, aar: new Date().getFullYear() - 1 }
      : null,
    url: p.url,
  }));
}

// Alias for existing imports
export const fetchPoenggrenser = async (_kode: string) => [] as StudieprogramSO["poenggrenser"][];
export const fetchInstitusjoner = async () => [] as InstitusjonInfo[];
