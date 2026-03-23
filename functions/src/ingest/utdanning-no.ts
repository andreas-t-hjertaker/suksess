/**
 * Data-ingest: utdanning.no (Issue #11)
 *
 * Henter data fra utdanning.no sitt interne REST API:
 * - /jobbkompasset/v2/yrker — Yrkesbeskrivelser med karrierekompass-data
 * - /kategorisystemer/styrk08 — STYRK-08 yrkesklassifisering
 * - /legacy-lopet/utdanningsprogram — VGS utdanningsprogram
 *
 * NB: Internt API — ikke versjonert. Bruker ukentlig snapshot-strategi
 * med graceful degradation ved API-endringer.
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

const UTDANNING_NO_BASE = "https://api.utdanning.no";
const FETCH_TIMEOUT = 30_000;

type UtdanningNoProgram = {
  id: string;
  name: string;
  institution: string;
  nusCode?: string;
  level?: string;
  description?: string;
  url?: string;
};

type Yrke = {
  uno_id: string;
  tittel: string;
  beskrivelse?: string;
  styrk08?: string[];
  utdanningsniva?: string;
  interesser?: string[];
};

type Styrk08 = {
  styrk08: string;
  tittel_norsk: string;
};

type VgsProgram = {
  programomrade_kode: string;
  tittel: string;
  utdanningsprogram_tittel?: string;
  trinn?: string;
};

// ─── Hent yrker fra Jobbkompasset ────────────────────────────────────────────

async function fetchYrker(): Promise<Yrke[]> {
  try {
    const resp = await fetch(`${UTDANNING_NO_BASE}/jobbkompasset/v2/yrker`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[utdanning.no] /jobbkompasset/v2/yrker svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : (data as { results?: Yrke[] }).results ?? [];
  } catch (err) {
    console.error("[utdanning.no] Feil ved henting av yrker:", err);
    return [];
  }
}

// ─── Hent STYRK-08 klassifisering ────────────────────────────────────────────

async function fetchStyrk08(): Promise<Styrk08[]> {
  try {
    const resp = await fetch(`${UTDANNING_NO_BASE}/kategorisystemer/styrk08`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[utdanning.no] /kategorisystemer/styrk08 svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[utdanning.no] Feil ved henting av STYRK-08:", err);
    return [];
  }
}

// ─── Hent VGS utdanningsprogram ──────────────────────────────────────────────

async function fetchVgsProgram(): Promise<VgsProgram[]> {
  try {
    const resp = await fetch(`${UTDANNING_NO_BASE}/legacy-lopet/utdanningsprogram`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      console.warn(`[utdanning.no] /legacy-lopet/utdanningsprogram svarte ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[utdanning.no] Feil ved henting av VGS-program:", err);
    return [];
  }
}

// ─── Ingest-funksjoner ───────────────────────────────────────────────────────

export async function ingestYrker(): Promise<number> {
  const yrker = await fetchYrker();
  if (yrker.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < yrker.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = yrker.slice(i, i + BATCH_SIZE);

    for (const y of chunk) {
      const docId = y.uno_id || `yrke_${written}`;
      const ref = db.collection("occupations").doc(docId);
      batch.set(ref, {
        unoId: y.uno_id,
        title: y.tittel,
        description: y.beskrivelse ?? "",
        styrk08Codes: y.styrk08 ?? [],
        educationLevel: y.utdanningsniva ?? null,
        interests: y.interesser ?? [],
        source: "utdanning.no/jobbkompasset",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

export async function ingestStyrk08(): Promise<number> {
  const codes = await fetchStyrk08();
  if (codes.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = codes.slice(i, i + BATCH_SIZE);

    for (const c of chunk) {
      const ref = db.collection("styrk08").doc(c.styrk08);
      batch.set(ref, {
        code: c.styrk08,
        title: c.tittel_norsk,
        source: "utdanning.no/styrk08",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

export async function ingestVgsPrograms(): Promise<number> {
  const programs = await fetchVgsProgram();
  if (programs.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = programs.slice(i, i + BATCH_SIZE);

    for (const p of chunk) {
      const docId = p.programomrade_kode || `vgs_${written}`;
      const ref = db.collection("vgsPrograms").doc(docId);
      batch.set(ref, {
        code: p.programomrade_kode,
        title: p.tittel,
        programTitle: p.utdanningsprogram_tittel ?? null,
        level: p.trinn ?? null,
        source: "utdanning.no/vgs",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

// ─── Studievelgeren API (Issue #58) ──────────────────────────────────────────
// Verifisert: https://api.utdanning.no/studievelgeren/result?page=1&size=2000
// ~1395 studieprogram med poenggrenser, institusjon, nivå, interessetagger.

type StudievelgerenProgram = {
  so_kode?: string;
  tittel?: string;
  institusjon_navn?: string;
  niva?: string;
  poeng_forste?: number;
  poeng_ordinar?: number;
  interesser?: string[];
  leveringsmate?: string;
};

export async function ingestStudievelgeren(): Promise<number> {
  let page = 1;
  let totalWritten = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const resp = await fetch(
        `${UTDANNING_NO_BASE}/studievelgeren/result?page=${page}&size=500`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        }
      );
      if (!resp.ok) {
        console.warn(`[studievelgeren] side ${page} svarte ${resp.status}`);
        break;
      }

      const data = await resp.json();
      const programs: StudievelgerenProgram[] = Array.isArray(data)
        ? data
        : (data as { results?: StudievelgerenProgram[] }).results ?? [];

      if (programs.length === 0) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      for (const p of programs) {
        const docId = p.so_kode || `sv_${page}_${totalWritten}`;
        const ref = db.collection("studyPrograms").doc(docId);
        batch.set(ref, {
          soCode: p.so_kode ?? null,
          name: p.tittel ?? "",
          institution: p.institusjon_navn ?? "",
          level: p.niva ?? "bachelor",
          pointsFirst: p.poeng_forste ?? null,
          pointsOrdinary: p.poeng_ordinar ?? null,
          interests: p.interesser ?? [],
          deliveryMode: p.leveringsmate ?? null,
          source: "utdanning.no/studievelgeren",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        totalWritten++;
      }
      await batch.commit();

      hasMore = programs.length === 500;
      page++;
    } catch (err) {
      console.error(`[studievelgeren] Feil side ${page}:`, err);
      break;
    }
  }

  return totalWritten;
}

// ─── Grep/Udir VGS-fagkoder (Issue #58) ─────────────────────────────────────
// https://data.udir.no/kl06/v201906/ — 18 utdanningsprogram, 6588 fagkoder

export async function ingestGrepFagkoder(): Promise<number> {
  try {
    const resp = await fetch("https://data.udir.no/kl06/v201906/fagkoder-lk20.json", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!resp.ok) {
      // Fallback til eldre versjon
      const fallback = await fetch("https://data.udir.no/kl06/v201906/fagkoder.json", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!fallback.ok) {
        console.warn("[grep] Ingen fagkode-endepunkt tilgjengelig");
        return 0;
      }
      return processGrepData(await fallback.json());
    }
    return processGrepData(await resp.json());
  } catch (err) {
    console.error("[grep] Feil ved henting av fagkoder:", err);
    return 0;
  }
}

async function processGrepData(data: unknown): Promise<number> {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = items.slice(i, i + BATCH_SIZE);

    for (const item of chunk) {
      const code = String((item as Record<string, unknown>).kode ?? (item as Record<string, unknown>).id ?? `grep_${written}`);
      const ref = db.collection("programfag").doc(code);
      batch.set(ref, {
        code,
        title: String((item as Record<string, unknown>).tittel ?? (item as Record<string, unknown>).navn ?? ""),
        type: String((item as Record<string, unknown>).type ?? ""),
        source: "grep/udir",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

// ─── Legacy-eksporter (bakoverkompatibilitet med index.ts) ───────────────────

/**
 * @deprecated Bruk ingestYrker() + ingestStyrk08() + ingestVgsPrograms() direkte.
 * Beholdt for bakoverkompatibilitet med ingest/index.ts.
 */
export async function fetchUtdanningNoPrograms(): Promise<UtdanningNoProgram[]> {
  const yrker = await fetchYrker();
  return yrker.map((y) => ({
    id: y.uno_id,
    name: y.tittel,
    institution: "utdanning.no",
    description: y.beskrivelse,
    level: y.utdanningsniva,
  }));
}

export async function ingestStudyPrograms(
  programs: UtdanningNoProgram[]
): Promise<number> {
  if (programs.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = programs.slice(i, i + BATCH_SIZE);

    for (const p of chunk) {
      const ref = db.collection("studyPrograms").doc(p.id);
      batch.set(ref, {
        name: p.name,
        institution: p.institution,
        nusCode: p.nusCode ?? null,
        level: p.level ?? "bachelor",
        description: p.description ?? "",
        url: p.url ?? null,
        source: "utdanning.no",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}
