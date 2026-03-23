/**
 * Klient for lærling- og yrkesfagdata (Issue #62)
 *
 * Henter data fra Firestore (populert av ingest-scheduler):
 * - tradeCertificates/ — fagbrev og svennebrev
 * - apprenticeships/ — lærebedrifter
 * - vgsFagkoder/ — Grep fagkoder fra Kunnskapsløftet
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
} from "firebase/firestore";
import { app } from "@/lib/firebase/config";

// ─── Typer ────────────────────────────────────────────────────────────────────

export type TradeCertificate = {
  id: string;
  tittel: string;
  beskrivelse: string;
  nusCode: string | null;
  lonn: number | null;
  url: string | null;
};

export type Laerebedrift = {
  id: string;
  navn: string;
  fag: string;
  fylke: string;
  kontakt: string | null;
  url: string | null;
};

export type VgsFagkode = {
  kode: string;
  tittel: string;
  tittelNn: string | null;
  opplaeringssted: string | null;
  url: string | null;
};

// ─── Funksjoner ───────────────────────────────────────────────────────────────

function db() { return getFirestore(app); }

export async function fetchTradeCertificates(
  searchTerm?: string,
  maxResults = 50
): Promise<TradeCertificate[]> {
  const col = collection(db(), "tradeCertificates");
  const q = searchTerm
    ? query(col, where("tittel", ">=", searchTerm), where("tittel", "<=", searchTerm + "\uf8ff"), limit(maxResults))
    : query(col, orderBy("tittel"), limit(maxResults));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TradeCertificate));
}

export async function fetchLaerebedrifter(
  fylke?: string,
  fag?: string,
  maxResults = 50
): Promise<Laerebedrift[]> {
  const col = collection(db(), "apprenticeships");
  let q;

  if (fylke) {
    q = query(col, where("fylke", "==", fylke), limit(maxResults));
  } else if (fag) {
    q = query(col, where("fag", "==", fag), limit(maxResults));
  } else {
    q = query(col, orderBy("navn"), limit(maxResults));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Laerebedrift));
}

export async function fetchVgsFagkoder(maxResults = 200): Promise<VgsFagkode[]> {
  const snap = await getDocs(
    query(collection(db(), "vgsFagkoder"), orderBy("kode"), limit(maxResults))
  );
  return snap.docs.map((d) => ({ kode: d.id, ...d.data() } as VgsFagkode));
}

/** Lønn-formatering for fagarbeider */
export function formaterLonnFagarbeider(aarslonn: number | null): string {
  if (!aarslonn) return "Lønn ikke tilgjengelig";
  return `Ca. ${Math.round(aarslonn / 12).toLocaleString("nb-NO")} kr/mnd (${aarslonn.toLocaleString("nb-NO")} kr/år)`;
}

/** Norske fylker for filter-dropdown */
export const NORSKE_FYLKER = [
  "Oslo", "Viken", "Vestland", "Trøndelag", "Rogaland",
  "Agder", "Innlandet", "Vestfold og Telemark", "Møre og Romsdal",
  "Nordland", "Troms og Finnmark",
];
