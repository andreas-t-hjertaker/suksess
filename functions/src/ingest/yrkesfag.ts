/**
 * Data-ingest: Lærling- og yrkesfagdata (Issue #62)
 *
 * Henter data fra:
 * - utdanning.no /jobbkompasset/v2/yrker — yrker med lærlinginfo
 * - utdanning.no /fagvelgeren — VGS yrkesfag → lærefag → fagbrev
 * - old.api.utdanning.no — Lærebedrifter per fag og fylke
 *
 * ~35% av VGS-elever velger yrkesfag — kritisk å dekke lærlingveien.
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

const UTDANNING_NO_BASE = "https://api.utdanning.no";
const OLD_API_BASE = "https://old.api.utdanning.no";
const FETCH_TIMEOUT = 30_000;

// ─── Typer ───────────────────────────────────────────────────────────────────

type Larefag = {
  fagkode: string;
  tittel: string;
  utdanningsprogram?: string;
  programomrade?: string;
  type?: string; // "fagbrev" | "svennebrev"
};

type Laerebedrift = {
  orgnr: string;
  navn: string;
  fylke: string;
  kommune?: string;
  fagkoder: string[];
  antall_laerlinger?: number;
};

// ─── Hent lærefag fra utdanning.no ──────────────────────────────────────────

async function fetchLarefag(): Promise<Larefag[]> {
  try {
    const resp = await fetch(`${UTDANNING_NO_BASE}/fagvelgeren/larefag`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[yrkesfag] /fagvelgeren/larefag svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[yrkesfag] Feil ved henting av lærefag:", err);
    return [];
  }
}

// ─── Hent lærebedrifter fra old.api ─────────────────────────────────────────

async function fetchLaerebedrifter(): Promise<Laerebedrift[]> {
  try {
    const resp = await fetch(`${OLD_API_BASE}/laerebedrifter`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[yrkesfag] /laerebedrifter svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[yrkesfag] Feil ved henting av lærebedrifter:", err);
    return [];
  }
}

// ─── Hent lønnsdata for fagarbeidere ────────────────────────────────────────

type FagarbeiderLonn = {
  fagkode: string;
  tittel: string;
  lonn_median?: number;
  lonn_min?: number;
  lonn_max?: number;
};

async function fetchFagarbeiderLonn(): Promise<FagarbeiderLonn[]> {
  try {
    const resp = await fetch(`${OLD_API_BASE}/lonnsniva`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[yrkesfag] /lonnsniva svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[yrkesfag] Feil ved henting av lønnsdata:", err);
    return [];
  }
}

// ─── Ingest-funksjoner ───────────────────────────────────────────────────────

export async function ingestLarefag(): Promise<number> {
  const fag = await fetchLarefag();
  if (fag.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < fag.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = fag.slice(i, i + BATCH_SIZE);

    for (const f of chunk) {
      const docId = f.fagkode || `fag_${written}`;
      const ref = db.collection("apprenticeships").doc(docId);
      batch.set(ref, {
        fagkode: f.fagkode,
        title: f.tittel,
        educationProgram: f.utdanningsprogram ?? null,
        programArea: f.programomrade ?? null,
        type: f.type ?? "fagbrev",
        source: "utdanning.no/fagvelgeren",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

export async function ingestLaerebedrifter(): Promise<number> {
  const bedrifter = await fetchLaerebedrifter();
  if (bedrifter.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < bedrifter.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = bedrifter.slice(i, i + BATCH_SIZE);

    for (const b of chunk) {
      const docId = b.orgnr || `bedrift_${written}`;
      const ref = db.collection("apprenticeCompanies").doc(docId);
      batch.set(ref, {
        orgNr: b.orgnr,
        name: b.navn,
        county: b.fylke,
        municipality: b.kommune ?? null,
        tradeCodes: b.fagkoder ?? [],
        apprenticeCount: b.antall_laerlinger ?? null,
        source: "old.api.utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

export async function ingestFagarbeiderLonn(): Promise<number> {
  const lonn = await fetchFagarbeiderLonn();
  if (lonn.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < lonn.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = lonn.slice(i, i + BATCH_SIZE);

    for (const l of chunk) {
      const docId = l.fagkode || `lonn_${written}`;
      const ref = db.collection("apprenticeships").doc(docId);
      batch.set(ref, {
        salary: {
          median: l.lonn_median ?? null,
          min: l.lonn_min ?? null,
          max: l.lonn_max ?? null,
        },
        salarySource: "old.api.utdanning.no",
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

/** Kjør all yrkesfag-ingest parallelt */
export async function ingestAllYrkesfag(): Promise<{
  larefag: number;
  bedrifter: number;
  lonn: number;
}> {
  const [larefag, bedrifter, lonn] = await Promise.all([
    ingestLarefag(),
    ingestLaerebedrifter(),
    ingestFagarbeiderLonn(),
  ]);
  return { larefag, bedrifter, lonn };
}
