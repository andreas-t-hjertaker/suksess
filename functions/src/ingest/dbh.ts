/**
 * Data-ingest: DBH (Database for høyere utdanning)
 *
 * Henter opptaksstatistikk og frafallsrater fra DBH sitt REST API.
 * DBH er åpent tilgjengelig uten API-nøkkel.
 *
 * API-dok: https://dbh.hkdir.no/api-dokumentasjon
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

const DBH_BASE = "https://dbh.hkdir.no/api/Tabeller/hentJson";

/** Hent opptakspoeng per studieprogram fra DBH */
export async function fetchAdmissionStats(): Promise<
  { nusCode: string; year: number; points: number; quota: string }[]
> {
  try {
    const response = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 204,   // Opptaksstatistikk
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: ["Årstall", "NUS kode", "Poengrense", "Kvote"],
        gruppering: ["Årstall", "NUS kode", "Kvote"],
        filter: [{ variabel: "Årstall", selection: { filter: "top", values: ["1"] } }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      logger.warn(`DBH API svarte ${response.status}`);
      return [];
    }

    const raw = await response.json() as Record<string, unknown>[];
    return raw.map((row) => ({
      nusCode: String(row["NUS kode"] ?? ""),
      year: Number(row["Årstall"] ?? 0),
      points: Number(row["Poengrense"] ?? 0),
      quota: String(row["Kvote"] ?? "ordinær"),
    }));
  } catch (err) {
    logger.error("Feil ved henting fra DBH:", err);
    return [];
  }
}

/**
 * Hent historiske poenggrenser (siste 5 år) fra DBH (Issue #60).
 * Bruker tabell 571 — gjennomsnittlige opptakspoeng per studieprogram.
 */
export async function fetchHistoricalAdmissionPoints(): Promise<
  { institutionCode: string; programCode: string; programName: string; year: number; pointsFirst: number; pointsOrdinary: number }[]
> {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 1 - i));

  try {
    const response = await fetch(DBH_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tabell_id: 571,
        api_versjon: 1,
        statuslinje: "J",
        kodetabell: "",
        variabler: [
          "Institusjonskode", "Studieprogramkode", "Studieprogramnavn",
          "Årstall", "Poenggrense førstevalgkvote", "Poenggrense ordinær kvote",
        ],
        gruppering: ["Institusjonskode", "Studieprogramkode", "Årstall"],
        filter: [
          { variabel: "Årstall", selection: { filter: "item", values: years } },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      logger.warn(`DBH tabell 571 svarte ${response.status}`);
      return [];
    }

    const raw = await response.json() as Record<string, unknown>[];
    return raw.map((row) => ({
      institutionCode: String(row["Institusjonskode"] ?? ""),
      programCode: String(row["Studieprogramkode"] ?? ""),
      programName: String(row["Studieprogramnavn"] ?? ""),
      year: Number(row["Årstall"] ?? 0),
      pointsFirst: Number(row["Poenggrense førstevalgkvote"] ?? 0),
      pointsOrdinary: Number(row["Poenggrense ordinær kvote"] ?? 0),
    }));
  } catch (err) {
    logger.error("Feil ved henting av historiske poenggrenser:", err);
    return [];
  }
}

/** Lagre historiske poenggrenser til Firestore */
export async function ingestHistoricalAdmissionPoints(
  data: { institutionCode: string; programCode: string; programName: string; year: number; pointsFirst: number; pointsOrdinary: number }[]
): Promise<number> {
  if (data.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = data.slice(i, i + BATCH_SIZE);

    for (const d of chunk) {
      const docId = `${d.institutionCode}_${d.programCode}_${d.year}`;
      const ref = db.collection("admissionHistory").doc(docId);
      batch.set(ref, {
        ...d,
        source: "dbh-571",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      written++;
    }

    await batch.commit();
  }

  return written;
}

/** Lagre opptakspoeng til Firestore */
export async function ingestAdmissionStats(
  stats: { nusCode: string; year: number; points: number; quota: string }[]
): Promise<number> {
  if (stats.length === 0) return 0;

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < stats.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = stats.slice(i, i + BATCH_SIZE);

    for (const s of chunk) {
      const docId = `${s.nusCode}_${s.year}_${s.quota}`;
      const ref = db.collection("admissionStats").doc(docId);
      batch.set(ref, {
        ...s,
        source: "dbh",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      written++;
    }

    await batch.commit();
  }

  return written;
}
