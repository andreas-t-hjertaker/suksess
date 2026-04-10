/**
 * Data-ingest: NAV Arbeidsplassen — jobbmarkedsdata
 *
 * Henter yrkesstatistikk og stillingsprognose fra NAV Arbeidsmarkedsprognose API.
 * Brukes til å beregne "demand"-feltet på CareerPath-dokumenter.
 *
 * API-dok: https://arbeidsplassen.nav.no/api-dokumentasjon
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

const NAV_BASE = process.env.NAV_API_BASE ?? "https://arbeidsplassen.nav.no/api/intern";

// NavJobListing-type fjernet (ubrukt) — data mappes direkte i ingestNavJobs()

/** Hent aktive stillingsannonser for et yrkesområde */
export async function fetchJobMarketData(
  occupationCategory: string
): Promise<number> {
  try {
    const url = new URL(`${NAV_BASE}/search`);
    url.searchParams.set("occupation", occupationCategory);
    url.searchParams.set("size", "1");
    url.searchParams.set("country", "NORGE");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.NAV_API_TOKEN ?? ""}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return 0;

    const data = await response.json() as { totalAds?: number };
    return data.totalAds ?? 0;
  } catch {
    return 0;
  }
}

/** Klassifiser etterspørsel basert på antall annonser */
export function classifyDemand(adCount: number): "high" | "medium" | "low" {
  if (adCount >= 500) return "high";
  if (adCount >= 100) return "medium";
  return "low";
}

/** Oppdater CareerPath-dokumenter med etterspørselsdata fra NAV */
export async function updateCareerPathDemand(): Promise<void> {
  const snapshot = await db.collection("careerPaths").get();
  if (snapshot.empty) return;

  const batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const title: string = data.title ?? "";
    const adCount = await fetchJobMarketData(title);
    const demand = classifyDemand(adCount);

    batch.update(doc.ref, {
      demand,
      navAdCount: adCount,
      demandUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    count++;
    if (count % 400 === 0) {
      await batch.commit();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }
}

/** Placeholder: hent SSB-yrkesstatistikk (implementeres i fase 2) */
export async function fetchSsbOccupationStats(): Promise<null> {
  // SSB API: https://data.ssb.no/api/v0/no/table/13315/
  // Implementeres når NAV-integrasjon er validert
  logger.info("SSB-integrasjon ikke implementert ennå");
  return null;
}

// Eksporter for Cloud Scheduler-trigger
export const NAV_JOBS: Record<string, () => Promise<unknown>> = {
  "updateCareerPathDemand": updateCareerPathDemand,
};
