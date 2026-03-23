/**
 * Data-ingest: DBH (Database for høyere utdanning) (Issue #60)
 *
 * Henter historiske opptakspoenggrenser fra DBH (minimum 5 år).
 * DBH er åpent tilgjengelig uten API-nøkkel.
 *
 * API-dok: https://dbh.hkdir.no/api-dokumentasjon
 * Tabell 204: Søknadsdata – kompetanse og poeng (Samordna Opptak)
 */

import * as admin from "firebase-admin";

const db = admin.firestore();
const DBH_BASE = "https://dbh.hkdir.no/api/Tabeller/hentJson";
const BATCH_SIZE = 400;
const HISTORY_YEARS = 5;

type AdmissionRecord = {
  nusCode: string;
  year: number;
  points: number;
  quota: string;
  applicants?: number;
  admitted?: number;
};

/** Hent historiske opptakspoeng per studieprogram fra DBH */
export async function fetchAdmissionStats(): Promise<AdmissionRecord[]> {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: HISTORY_YEARS }, (_, i) => String(currentYear - i));

  try {
    const response = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 204,
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: ["Årstall", "NUS kode", "Poengrense", "Kvote", "Antall søkere", "Antall tilbud"],
        gruppering: ["Årstall", "NUS kode", "Kvote"],
        filter: [{ variabel: "Årstall", selection: { filter: "item", values: years } }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`DBH API svarte ${response.status}`);
      return [];
    }

    const raw = await response.json() as Record<string, unknown>[];
    return raw
      .map((row) => ({
        nusCode: String(row["NUS kode"] ?? ""),
        year: Number(row["Årstall"] ?? 0),
        points: Number(row["Poengrense"] ?? 0),
        quota: String(row["Kvote"] ?? "ordinær"),
        applicants: row["Antall søkere"] ? Number(row["Antall søkere"]) : undefined,
        admitted: row["Antall tilbud"] ? Number(row["Antall tilbud"]) : undefined,
      }))
      .filter((r) => r.nusCode && r.year > 0);
  } catch (err) {
    console.error("Feil ved henting fra DBH:", err);
    return [];
  }
}

/** Lagre opptakspoeng til Firestore (admissionHistory/ for trend-data) */
export async function ingestAdmissionStats(stats: AdmissionRecord[]): Promise<number> {
  if (stats.length === 0) return 0;
  let written = 0;

  for (let i = 0; i < stats.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const s of stats.slice(i, i + BATCH_SIZE)) {
      const docId = `${s.nusCode}_${s.year}_${s.quota}`;
      // admissionHistory/ for historisk trend
      batch.set(db.collection("admissionHistory").doc(docId), {
        nusCode: s.nusCode,
        year: s.year,
        points: s.points,
        quota: s.quota,
        ...(s.applicants != null && { applicants: s.applicants }),
        ...(s.admitted != null && { admitted: s.admitted }),
        source: "dbh",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Oppdater admissionStats/ (eksisterende collection) for bakoverkompatibilitet
      batch.set(db.collection("admissionStats").doc(docId), {
        nusCode: s.nusCode,
        year: s.year,
        points: s.points,
        quota: s.quota,
        source: "dbh",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      written++;
    }
    await batch.commit();
  }

  return written;
}

// ─── DBH Tabell 347: Studieprogram-metadata + NOKUT (Issue #11) ──────────────

type StudyProgrammeRecord = {
  nusCode: string;
  name: string;
  institution: string;
  level: string;
  credits: number;
  nokutAccredited: boolean;
};

/** Hent studieprogram-metadata fra DBH tabell 347 */
export async function fetchDBHStudyProgrammes(): Promise<StudyProgrammeRecord[]> {
  try {
    const resp = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 347,
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: ["NUS kode", "Programnavn", "Institusjonsnavn", "Studienivanavn", "Studiepoeng", "NOKUT godkjent"],
        gruppering: ["NUS kode", "Institusjonsnavn"],
        filter: [],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) { console.warn(`DBH tabell 347 svarte ${resp.status}`); return []; }
    const raw = await resp.json() as Record<string, unknown>[];
    return raw.map((row) => ({
      nusCode: String(row["NUS kode"] ?? ""),
      name: String(row["Programnavn"] ?? ""),
      institution: String(row["Institusjonsnavn"] ?? ""),
      level: String(row["Studienivanavn"] ?? ""),
      credits: Number(row["Studiepoeng"] ?? 0),
      nokutAccredited: String(row["NOKUT godkjent"] ?? "N") === "J",
    })).filter((r) => r.nusCode && r.name);
  } catch (err) {
    console.error("[DBH] Tabell 347 feil:", err);
    return [];
  }
}

export async function ingestDBHStudyProgrammes(records: StudyProgrammeRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection("dbhStudyProgrammes").doc(r.nusCode), {
        ...r, source: "dbh-347", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

// ─── DBH Tabell 123: Registrerte studenter (Issue #11) ───────────────────────

export async function fetchDBHEnrollment(): Promise<{ year: number; nusCode: string; students: number }[]> {
  const currentYear = new Date().getFullYear();
  try {
    const resp = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 123,
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: ["Årstall", "NUS kode", "Registrerte studenter"],
        gruppering: ["Årstall", "NUS kode"],
        filter: [{ variabel: "Årstall", selection: { filter: "item", values: [String(currentYear - 1)] } }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) { console.warn(`DBH tabell 123 svarte ${resp.status}`); return []; }
    const raw = await resp.json() as Record<string, unknown>[];
    return raw.map((row) => ({
      year: Number(row["Årstall"] ?? 0),
      nusCode: String(row["NUS kode"] ?? ""),
      students: Number(row["Registrerte studenter"] ?? 0),
    })).filter((r) => r.nusCode && r.year > 0);
  } catch (err) {
    console.error("[DBH] Tabell 123 feil:", err);
    return [];
  }
}

export async function ingestDBHEnrollment(records: { year: number; nusCode: string; students: number }[]): Promise<number> {
  if (records.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection("dbhEnrollment").doc(`${r.nusCode}_${r.year}`), {
        ...r, source: "dbh-123", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

// ─── DBH Tabell 704: Gjennomføring og frafall (Issue #11) ────────────────────

export async function fetchDBHDropout(): Promise<{ nusCode: string; year: number; completionRate: number }[]> {
  const currentYear = new Date().getFullYear();
  try {
    const resp = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 704,
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: ["Årstall", "NUS kode", "Andel fullført normert tid"],
        gruppering: ["Årstall", "NUS kode"],
        filter: [{ variabel: "Årstall", selection: { filter: "item", values: [String(currentYear - 2)] } }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) { console.warn(`DBH tabell 704 svarte ${resp.status}`); return []; }
    const raw = await resp.json() as Record<string, unknown>[];
    return raw.map((row) => ({
      nusCode: String(row["NUS kode"] ?? ""),
      year: Number(row["Årstall"] ?? 0),
      completionRate: Number(row["Andel fullført normert tid"] ?? 0),
    })).filter((r) => r.nusCode && r.year > 0);
  } catch (err) {
    console.error("[DBH] Tabell 704 feil:", err);
    return [];
  }
}

export async function ingestDBHDropout(records: { nusCode: string; year: number; completionRate: number }[]): Promise<number> {
  if (records.length === 0) return 0;
  let written = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const r of records.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection("dbhDropout").doc(`${r.nusCode}_${r.year}`), {
        ...r, source: "dbh-704", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }
    await batch.commit();
  }
  return written;
}

/**
 * Hent poenggrense-historikk for én NUS-kode (for graf på detaljside).
 * Returnerer sortert etter år, begge kvoter.
 */
export async function fetchPoenggrenseHistorikk(nusCode: string): Promise<{
  year: number;
  quota: string;
  points: number;
}[]> {
  const snap = await db.collection("admissionHistory")
    .where("nusCode", "==", nusCode)
    .orderBy("year", "asc")
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      year: data.year as number,
      quota: data.quota as string,
      points: data.points as number,
    };
  });
}
