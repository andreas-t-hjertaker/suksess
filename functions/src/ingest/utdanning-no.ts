/**
 * Data-ingest: utdanning.no studieprogrammer
 *
 * Henter studieprogramdata fra utdanning.no sitt REST API og
 * lagrer til Firestore studyPrograms-collection.
 *
 * Kjøres som Cloud Scheduler-jobb (daglig, kl 03:00 UTC).
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

type UtdanningNoProgram = {
  id: string;
  name: string;
  institution: string;
  nusCode?: string;
  level?: string;
  description?: string;
  url?: string;
};

/**
 * Hent alle studieprogrammer fra utdanning.no API.
 * Returnerer normalisert liste klar for Firestore.
 */
export async function fetchUtdanningNoPrograms(): Promise<UtdanningNoProgram[]> {
  // NB: utdanning.no har ikke et offentlig API — i produksjon bruk scraping
  // eller samarbeidsavtale. Her bruker vi et stub som returnerer mock-data.
  const UTDANNING_NO_BASE = process.env.UTDANNING_NO_API ?? "https://api.utdanning.no";

  try {
    const response = await fetch(`${UTDANNING_NO_BASE}/v1/studieprogrammer?limit=500`, {
      headers: {
        "Accept": "application/json",
        "X-Api-Key": process.env.UTDANNING_NO_API_KEY ?? "",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn(`utdanning.no API svarte ${response.status} — hopper over`);
      return [];
    }

    const data = await response.json() as { results?: UtdanningNoProgram[] };
    return data.results ?? [];
  } catch (err) {
    console.error("Feil ved henting fra utdanning.no:", err);
    return [];
  }
}

/**
 * Skriv programmer til Firestore i batch.
 */
export async function ingestStudyPrograms(
  programs: UtdanningNoProgram[]
): Promise<number> {
  if (programs.length === 0) return 0;

  const BATCH_SIZE = 400; // Firestore maks 500 per batch
  let written = 0;

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = programs.slice(i, i + BATCH_SIZE);

    for (const p of chunk) {
      const ref = db.collection("studyPrograms").doc(p.id);
      batch.set(
        ref,
        {
          name: p.name,
          institution: p.institution,
          nusCode: p.nusCode ?? null,
          level: normalizeLevel(p.level ?? ""),
          description: p.description ?? "",
          url: p.url ?? null,
          source: "utdanning.no",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      written++;
    }

    await batch.commit();
  }

  return written;
}

function normalizeLevel(level: string): string {
  const map: Record<string, string> = {
    "bachelor": "bachelor",
    "master": "master",
    "phd": "phd",
    "doktorgrad": "phd",
    "fagskole": "vocational",
    "vgs": "vgs",
  };
  return map[level.toLowerCase()] ?? "bachelor";
}
