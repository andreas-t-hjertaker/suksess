/**
 * Data-ingest koordinator (Issue #11)
 *
 * Eksporterer alle planlagte Cloud Functions for data-ingest:
 *
 * Schedule (norsk tid, UTC):
 *   03:00 (01:00 UTC) — utdanning.no studieprogrammer + poenggrenser
 *   03:30 (01:30 UTC) — DBH opptaksstatistikk og gjennomstrøming
 *   04:00 (02:00 UTC) — SSB yrkesstatistikk og framskrivninger
 *   06:00 (04:00 UTC) — NAV pam-stilling-feed (se nav-stillinger.ts)
 *
 * Alle ingest-jobber:
 * - Lagrer til Firestore (primær kilde for frontend)
 * - Er idempotente (upsert)
 * - Logger resultater til Cloud Logging
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { withAdmin } from "../middleware";
import {
  fetchUtdanningNoPrograms, ingestStudyPrograms,
  fetchGrepUtdanningsprogram, ingestVgsPrograms,
  fetchUtdanningsbeskrivelser, ingestUtdanningsbeskrivelser,
} from "./utdanning-no";
import { fetchAdmissionStats, ingestAdmissionStats } from "./dbh";
import { fetchJobMarketData } from "./nav-arbeidsplassen";
import { fetchFagvelger, ingestTradeCertificates, fetchLaerebedrifter, ingestLaerebedrifter, fetchGrepFagkoder, ingestFagkoder } from "./laerling";

// Re-eksporter NAV stillinger (allerede definert i nav-stillinger.ts)
export { ingestNavStillingerScheduled } from "./nav-stillinger";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Utdanning.no scheduler (daglig 03:00)
// ---------------------------------------------------------------------------

export const ingestUtdanningNoScheduled = onSchedule(
  {
    schedule: "0 1 * * *", // 03:00 Oslo (UTC+2 sommertid)
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    console.info("[ingest] Starter utdanning.no ingest...");
    const programs = await fetchUtdanningNoPrograms();
    const count = await ingestStudyPrograms(programs);
    console.info(`[ingest] utdanning.no studievelgeren: ${count} programmer lagret`);

    const vgsPrograms = await fetchGrepUtdanningsprogram();
    const vgsCount = await ingestVgsPrograms(vgsPrograms);
    console.info(`[ingest] Grep VGS-program: ${vgsCount} poster lagret`);

    const beskrivelser = await fetchUtdanningsbeskrivelser();
    const beskrivelserCount = await ingestUtdanningsbeskrivelser(beskrivelser);
    console.info(`[ingest] Utdanningsbeskrivelser: ${beskrivelserCount} poster lagret`);
  }
);

// ---------------------------------------------------------------------------
// DBH scheduler (daglig 03:30)
// ---------------------------------------------------------------------------

export const ingestDBHScheduled = onSchedule(
  {
    schedule: "30 1 * * *", // 03:30 Oslo
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    console.info("[ingest] Starter DBH ingest...");
    const stats = await fetchAdmissionStats();
    const count = await ingestAdmissionStats(stats);
    console.info(`[ingest] DBH: ${count} opptaksrekorder lagret`);
  }
);

// ---------------------------------------------------------------------------
// Lærling-scheduler (daglig 04:30) — Issue #62
// ---------------------------------------------------------------------------

export const ingestLaerlingScheduled = onSchedule(
  {
    schedule: "30 2 * * *", // 04:30 Oslo
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    console.info("[ingest] Starter lærlingdata-ingest...");

    const fagvelger = await fetchFagvelger();
    const fagvelgerCount = await ingestTradeCertificates(fagvelger);
    console.info(`[ingest] Fagvelger/fagbrev: ${fagvelgerCount} poster`);

    const bedrifter = await fetchLaerebedrifter();
    const bedrifterCount = await ingestLaerebedrifter(bedrifter);
    console.info(`[ingest] Lærebedrifter: ${bedrifterCount} poster`);

    const fagkoder = await fetchGrepFagkoder();
    const fagkoderCount = await ingestFagkoder(fagkoder);
    console.info(`[ingest] Grep fagkoder: ${fagkoderCount} poster`);
  }
);

// ---------------------------------------------------------------------------
// SSB scheduler (ukentlig mandag 04:00)
// ---------------------------------------------------------------------------

export const ingestSSBScheduled = onSchedule(
  {
    schedule: "0 2 * * 1", // Mandag 04:00 Oslo
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    console.info("[ingest] Starter SSB yrkesstatistikk ingest...");
    const count = await ingestSSBOccupationStats();
    console.info(`[ingest] SSB: ${count} yrkesrekorder oppdatert`);
  }
);

async function ingestSSBOccupationStats(): Promise<number> {
  // SSB API: https://data.ssb.no/api/v0/no/table/
  // Tabell 07984: Sysselsatte etter næring og yrke (STYRK-08)
  const SSB_API = "https://data.ssb.no/api/v0/no/table/07984";

  try {
    const resp = await fetch(SSB_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          {
            code: "Tid",
            selection: { filter: "top", values: ["1"] },
          },
        ],
        response: { format: "json-stat2" },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      console.warn(`SSB API svarte ${resp.status}`);
      return 0;
    }

    const data = await resp.json() as {
      dataset?: {
        value?: number[];
        dimension?: {
          STYRK?: { category?: { label?: Record<string, string> } };
        };
      };
    };

    const labels = data.dataset?.dimension?.STYRK?.category?.label ?? {};
    const values = data.dataset?.value ?? [];
    const entries = Object.entries(labels);

    const batch = db.batch();
    let count = 0;

    for (let i = 0; i < entries.length && i < values.length; i++) {
      const [code, label] = entries[i];
      const employed = values[i];
      if (!employed) continue;

      const ref = db.collection("ssbOccupations").doc(code);
      batch.set(ref, {
        styrk08Code: code,
        label,
        employed,
        year: new Date().getFullYear(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      count++;

      // Batch-skriv hvert 500. dokument
      if (count % 500 === 0) {
        await batch.commit();
      }
    }

    await batch.commit();
    return count;
  } catch (err) {
    console.error("[ingest] SSB feil:", err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Manuell trigger (for admin-utvikling og testing)
// ---------------------------------------------------------------------------

export const triggerIngest = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const handler = withAdmin(async ({ req: authReq, res: authRes }) => {
      const source = (authReq.body as { source?: string })?.source ?? "all";
      const results: Record<string, number> = {};

      if (source === "all" || source === "utdanning-no") {
        const programs = await fetchUtdanningNoPrograms();
        results["utdanning-no"] = await ingestStudyPrograms(programs);
      }

      if (source === "all" || source === "dbh") {
        const stats = await fetchAdmissionStats();
        results.dbh = await ingestAdmissionStats(stats);
      }

      if (source === "all" || source === "nav-market") {
        // Oppdater demand-felt på karriereveier basert på NAV jobbmarked
        const careerSnap = await db.collection("careerPaths").limit(100).get();
        let updated = 0;
        for (const doc of careerSnap.docs) {
          const data = doc.data();
          const count = await fetchJobMarketData(data.sector ?? "");
          const demand = count > 500 ? "high" : count > 100 ? "medium" : "low";
          if (demand !== data.demand) {
            await doc.ref.update({ demand, navJobCount: count });
            updated++;
          }
        }
        results["nav-market"] = updated;
      }

      authRes.status(200).json({ success: true, data: results });
    });

    await handler({ req, res });
  }
);
