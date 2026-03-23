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
