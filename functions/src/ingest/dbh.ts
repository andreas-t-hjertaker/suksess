/**
 * Data-ingest: DBH (Database for høyere utdanning)
 *
 * Henter opptaksstatistikk og frafallsrater fra DBH sitt REST API.
 * DBH er åpent tilgjengelig uten API-nøkkel.
 *
 * API-dok: https://dbh.hkdir.no/api-dokumentasjon
 */

import * as admin from "firebase-admin";

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
      console.warn(`DBH API svarte ${response.status}`);
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
    console.error("Feil ved henting fra DBH:", err);
    return [];
  }
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
