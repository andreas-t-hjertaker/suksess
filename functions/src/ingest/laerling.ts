/**
 * Lærling- og yrkesfagdata ingest (Issue #62)
 *
 * Henter data fra:
 * 1. old.api.utdanning.no — fagvelger (kobler VGS-fag til fagbrev)
 * 2. NAV pam-stilling-feed — filtrerer lærlingestillinger
 * 3. Grep/Udir fagkoder — knytter læreplaner til fagbrev
 *
 * Lagrer til Firestore apprenticeships/ og tradeCertificates/.
 */

import * as admin from "firebase-admin";

const db = admin.firestore();
const BATCH_SIZE = 400;
const OLD_UTDANNING_API = "https://old.api.utdanning.no";

// ─── Typer ────────────────────────────────────────────────────────────────────

type Fagvelger = {
  id: string | number;
  title?: string;
  tittel?: string;
  description?: string;
  beskrivelse?: string;
  nusCode?: string;
  salary?: number;
  lonn?: number;
  url?: string;
};

type Laerebedrift = {
  orgnr?: string;
  navn?: string;
  name?: string;
  fag?: string;
  fylke?: string;
  county?: string;
  kontakt?: string;
  contact?: string;
  url?: string;
};

type GrepFagkode = {
  kode: string;
  tittel: { nb?: string; nn?: string };
  opplaeringssted?: string;
  url?: string;
};

// ─── 1. Fagvelger-data (kobling VGS-fag → fagbrev/svennebrev) ────────────────

export async function fetchFagvelger(): Promise<Fagvelger[]> {
  try {
    const resp = await fetch(`${OLD_UTDANNING_API}/fagvelger`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      console.warn(`Fagvelger API svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json() as Fagvelger[] | { data?: Fagvelger[] };
    return Array.isArray(data) ? data : data.data ?? [];
  } catch (err) {
    console.error("Feil ved henting fagvelger:", err);
    return [];
  }
}

export async function ingestTradeCertificates(fag: Fagvelger[]): Promise<number> {
  if (fag.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < fag.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const f of fag.slice(i, i + BATCH_SIZE)) {
      const id = String(f.id);
      const ref = db.collection("tradeCertificates").doc(id);
      batch.set(ref, {
        tittel: f.title ?? f.tittel ?? "",
        beskrivelse: f.description ?? f.beskrivelse ?? "",
        nusCode: f.nusCode ?? null,
        lonn: f.salary ?? f.lonn ?? null,
        url: f.url ?? null,
        source: "old.api.utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

// ─── 2. Lærebedrifter per fylke ────────────────────────────────────────────────

export async function fetchLaerebedrifter(fylke?: string): Promise<Laerebedrift[]> {
  try {
    const url = fylke
      ? `${OLD_UTDANNING_API}/laerebed?county=${encodeURIComponent(fylke)}`
      : `${OLD_UTDANNING_API}/laerebed`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) {
      console.warn(`Lærebedrifter API svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json() as Laerebedrift[] | { data?: Laerebedrift[] };
    return Array.isArray(data) ? data : data.data ?? [];
  } catch (err) {
    console.error("Feil ved henting lærebedrifter:", err);
    return [];
  }
}

export async function ingestLaerebedrifter(bedrifter: Laerebedrift[]): Promise<number> {
  if (bedrifter.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < bedrifter.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const b of bedrifter.slice(i, i + BATCH_SIZE)) {
      const id = b.orgnr ?? `laere_${written}_${Date.now()}`;
      const ref = db.collection("apprenticeships").doc(id);
      batch.set(ref, {
        navn: b.navn ?? b.name ?? "",
        fag: b.fag ?? "",
        fylke: b.fylke ?? b.county ?? "",
        kontakt: b.kontakt ?? b.contact ?? null,
        url: b.url ?? null,
        source: "old.api.utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

// ─── 3. Grep fagkoder (Kunnskapsløftet) ──────────────────────────────────────

export async function fetchGrepFagkoder(): Promise<GrepFagkode[]> {
  try {
    const resp = await fetch(
      "https://data.udir.no/kl06/v201906/fagkoder-vg",
      { signal: AbortSignal.timeout(30_000) }
    );
    if (!resp.ok) {
      console.warn(`Grep fagkoder svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json() as GrepFagkode[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Feil ved henting Grep fagkoder:", err);
    return [];
  }
}

export async function ingestFagkoder(fagkoder: GrepFagkode[]): Promise<number> {
  if (fagkoder.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < fagkoder.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const f of fagkoder.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection("vgsFagkoder").doc(f.kode);
      batch.set(ref, {
        kode: f.kode,
        tittel: f.tittel?.nb ?? f.tittel?.nn ?? "",
        tittelNn: f.tittel?.nn ?? null,
        opplaeringssted: f.opplaeringssted ?? null,
        url: f.url ?? null,
        source: "grep-udir",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}
