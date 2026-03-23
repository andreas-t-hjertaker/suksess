/**
 * Data-ingest: utdanning.no studieprogrammer (Issue #58, #11)
 *
 * Henter ekte data fra verifiserte, åpne endepunkter (ingen auth):
 * 1. Studievelgeren API — ~1395 studieprogram med opptakspoeng
 * 2. utdanning.no utdanningsbeskrivelser (NLOD) — 350+ kategorier
 * 3. Grep/Udir VGS-data — 18 utdanningsprogram, fagkoder
 *
 * Kjøres som Cloud Scheduler-jobb (daglig, kl 03:00 UTC).
 */

import * as admin from "firebase-admin";

const db = admin.firestore();
const BATCH_SIZE = 400;

// ─── Typer ────────────────────────────────────────────────────────────────────

type StudievelgerProgram = {
  id: string | number;
  name?: string;
  title?: string;
  institution?: string;
  institusjonnavn?: string;
  level?: string;
  niva?: string;
  so_code?: string;
  programkode?: string;
  poeng_forste?: number | null;
  poeng_ordinar?: number | null;
  leveringsmate?: string;
  tags?: string[];
  url?: string;
};

type GrepUtdanningsprogram = {
  id: string;
  kode: string;
  tittel: { nb?: string; nn?: string };
  url?: string;
};

type UtdanningsBeskrivelse = {
  id: string | number;
  tittel?: string;
  navn?: string;
  opptakskrav?: string;
  yrkesutsikter?: string;
  innhold?: string;
};

// ─── 1. Studievelgeren API ────────────────────────────────────────────────────

export async function fetchStudiovelgerPrograms(): Promise<StudievelgerProgram[]> {
  const all: StudievelgerProgram[] = [];
  let page = 1;
  const size = 200;

  while (true) {
    try {
      const response = await fetch(
        `https://api.utdanning.no/studievelgeren/result?page=${page}&size=${size}`,
        { signal: AbortSignal.timeout(30_000) }
      );

      if (!response.ok) {
        console.warn(`Studievelgeren side ${page} svarte ${response.status}`);
        break;
      }

      const data = await response.json() as { results?: StudievelgerProgram[]; total?: number };
      const results = data.results ?? [];
      if (results.length === 0) break;

      all.push(...results);
      console.log(`Studievelgeren: side ${page}, ${results.length} prog (totalt ${all.length})`);

      if (all.length >= (data.total ?? 9999)) break;
      page++;
    } catch (err) {
      console.error(`Feil ved henting Studievelgeren side ${page}:`, err);
      break;
    }
  }

  return all;
}

/** Bakoverkompatibel alias for scheduler */
export async function fetchUtdanningNoPrograms(): Promise<StudievelgerProgram[]> {
  return fetchStudiovelgerPrograms();
}

export async function ingestStudyPrograms(programs: StudievelgerProgram[]): Promise<number> {
  if (programs.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const p of programs.slice(i, i + BATCH_SIZE)) {
      const id = String(p.so_code ?? p.programkode ?? p.id);
      const ref = db.collection("studyPrograms").doc(id);
      batch.set(ref, {
        name: p.name ?? p.title ?? "",
        institution: p.institution ?? p.institusjonnavn ?? "",
        level: normalizeLevel(p.level ?? p.niva ?? ""),
        soCode: p.so_code ?? p.programkode ?? null,
        poengForste: p.poeng_forste ?? null,
        poengOrdinar: p.poeng_ordinar ?? null,
        leveringsmate: p.leveringsmate ?? null,
        tags: p.tags ?? [],
        url: p.url ?? null,
        source: "studievelgeren",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }

  return written;
}

// ─── 2. Grep VGS-fagkoder ─────────────────────────────────────────────────────

export async function fetchGrepUtdanningsprogram(): Promise<GrepUtdanningsprogram[]> {
  try {
    const response = await fetch(
      "https://data.udir.no/kl06/v201906/utdanningsprogrammer-vg",
      { signal: AbortSignal.timeout(30_000) }
    );
    if (!response.ok) {
      console.warn(`Grep utdanningsprogram svarte ${response.status}`);
      return [];
    }
    const data = await response.json() as GrepUtdanningsprogram[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Feil ved henting fra Grep:", err);
    return [];
  }
}

export async function ingestVgsPrograms(programs: GrepUtdanningsprogram[]): Promise<number> {
  if (programs.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const p of programs.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection("vgsPrograms").doc(p.kode);
      batch.set(ref, {
        kode: p.kode,
        tittel: p.tittel?.nb ?? p.tittel?.nn ?? "",
        tittelNn: p.tittel?.nn ?? null,
        url: p.url ?? null,
        source: "grep-udir",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }

  return written;
}

// ─── 3. Utdanningsbeskrivelser ────────────────────────────────────────────────

export async function fetchUtdanningsbeskrivelser(): Promise<UtdanningsBeskrivelse[]> {
  try {
    const response = await fetch(
      "https://utdanning.no/api/v1/data_norge--utdanningsbeskrivelse",
      { signal: AbortSignal.timeout(30_000) }
    );
    if (!response.ok) {
      console.warn(`Utdanningsbeskrivelser svarte ${response.status}`);
      return [];
    }
    const raw = await response.json() as { data?: UtdanningsBeskrivelse[] } | UtdanningsBeskrivelse[];
    return Array.isArray(raw) ? raw : (raw as { data?: UtdanningsBeskrivelse[] }).data ?? [];
  } catch (err) {
    console.error("Feil ved henting utdanningsbeskrivelser:", err);
    return [];
  }
}

export async function ingestUtdanningsbeskrivelser(items: UtdanningsBeskrivelse[]): Promise<number> {
  if (items.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const item of items.slice(i, i + BATCH_SIZE)) {
      const id = String(item.id);
      const ref = db.collection("educationDescriptions").doc(id);
      batch.set(ref, {
        tittel: item.tittel ?? item.navn ?? "",
        opptakskrav: stripHtml(item.opptakskrav ?? ""),
        yrkesutsikter: stripHtml(item.yrkesutsikter ?? ""),
        innhold: stripHtml(item.innhold ?? ""),
        source: "utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }

  return written;
}

// ─── Yrker og STYRK-08 (Issue #11) ───────────────────────────────────────────

type UtdanningYrke = {
  id: string | number;
  tittel?: string;
  navn?: string;
  beskrivelse?: string;
  styrk08?: string;
  riasecKoder?: string[];
  utdanningsniva?: string;
};

/** Hent yrkesbeskrivelser fra utdanning.no (O*NET mapping + STYRK-08) */
export async function fetchUtdanningYrker(): Promise<UtdanningYrke[]> {
  try {
    const resp = await fetch("https://api.utdanning.no/onet/yrker", {
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      // Fallback til jobbkompasset
      const resp2 = await fetch("https://api.utdanning.no/jobbkompasset/v2/yrker", {
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp2.ok) return [];
      const data2 = await resp2.json() as UtdanningYrke[];
      return Array.isArray(data2) ? data2 : [];
    }
    const data = await resp.json() as UtdanningYrke[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[utdanning.no] Yrker feil:", err);
    return [];
  }
}

export async function ingestUtdanningYrker(yrker: UtdanningYrke[]): Promise<number> {
  if (yrker.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < yrker.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const y of yrker.slice(i, i + BATCH_SIZE)) {
      const id = String(y.id ?? "");
      if (!id) continue;
      batch.set(db.collection("occupations").doc(id), {
        title: y.tittel ?? y.navn ?? "",
        description: stripHtml(y.beskrivelse ?? ""),
        styrk08Code: y.styrk08 ?? "",
        riasecCodes: y.riasecKoder ?? [],
        educationRequirement: y.utdanningsniva ?? "",
        source: "utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

function normalizeLevel(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("master")) return "master";
  if (l.includes("phd") || l.includes("doktor")) return "phd";
  if (l.includes("fagskole")) return "vocational";
  if (l.includes("vgs") || l.includes("videregående")) return "vgs";
  if (l.includes("arsstudium") || l.includes("år")) return "arsstudium";
  return "bachelor";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
