/**
 * NAV pam-stilling-feed integrasjon (Issue #48)
 *
 * Henter ekte stillingsannonser fra NAV Arbeidsplassen og lagrer
 * dem i Firestore (jobListings/) for jobbmatch-siden.
 *
 * API: https://pam-stilling-feed.nav.no/api/v1/feed
 * Token: https://pam-stilling-feed.nav.no/api/publicToken (testing)
 * Produksjon: Send e-post til nav.team.arbeidsplassen@nav.no
 *
 * Kjøres som Cloud Scheduler daglig kl 06:00 norsk tid.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type NavStilling = {
  id: string;
  title: string;
  employer?: { name: string; location?: string };
  location?: { address?: string; municipalityName?: string };
  occupationList?: Array<{ level1?: string; level2?: string }>;
  properties?: {
    adtext?: string;
    extent?: string; // "Heltid" | "Deltid"
    jobtitle?: string;
    applicationemail?: string;
    applicationurl?: string;
    deadline?: string;
    sector?: string;
    styrk08?: string;
  };
  published?: string;
  expires?: string;
};

type NavFeedResponse = {
  content: NavStilling[];
  totalElements?: number;
  page?: { number: number; totalPages: number };
};

export type JobListing = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "heltid" | "deltid" | "lærling" | "internship" | "annet";
  sector: string;
  description: string;
  applicationUrl: string | null;
  deadline: string | null;
  published: string;
  /** STYRK-08 yrkeskode — brukes for RIASEC-matching */
  styrkCode: string | null;
  /** Utledet RIASEC-matching basert på STYRK-08 */
  riasecMatch: string[];
  /** Aktiv stilling (brukes for filtrering i searchJobs) */
  active: boolean;
  source: "nav";
  updatedAt: admin.firestore.FieldValue;
};

// ---------------------------------------------------------------------------
// STYRK-08 → RIASEC-mapping (forenklet)
// ---------------------------------------------------------------------------

const STYRK_TO_RIASEC: Record<string, string[]> = {
  "2": ["I", "R"],    // 2xxx: Akademiske yrker
  "21": ["I", "R"],   // IKT-yrker
  "22": ["I", "R"],   // Realfag og ingeniør
  "23": ["S", "A"],   // Undervisning
  "24": ["I", "S"],   // Helse og biologi
  "25": ["I", "C"],   // IKT-spesialister
  "26": ["A", "E"],   // Juridisk, samfunnsvitenskap
  "3": ["R", "I"],    // Teknikere
  "4": ["C", "E"],    // Kontor og kundeservice
  "5": ["E", "S"],    // Salg og service
  "6": ["R", "I"],    // Jordbruk, skog
  "7": ["R", "C"],    // Håndverk
  "8": ["R", "C"],    // Prosess og maskin
  "9": ["R", "S"],    // Elementære yrker
};

function getRiasecFromStyrk(styrk08: string | null): string[] {
  if (!styrk08) return [];
  const prefix2 = styrk08.slice(0, 2);
  const prefix1 = styrk08.slice(0, 1);
  return STYRK_TO_RIASEC[prefix2] ?? STYRK_TO_RIASEC[prefix1] ?? [];
}

function mapExtent(extent?: string): JobListing["type"] {
  if (!extent) return "annet";
  const lower = extent.toLowerCase();
  if (lower.includes("heltid")) return "heltid";
  if (lower.includes("deltid")) return "deltid";
  if (lower.includes("lærling")) return "lærling";
  if (lower.includes("internship") || lower.includes("praksis")) return "internship";
  return "annet";
}

// ---------------------------------------------------------------------------
// Hent og transformer stillinger
// ---------------------------------------------------------------------------

async function fetchNavToken(): Promise<string> {
  const privateToken = process.env.NAV_STILLINGER_TOKEN;
  if (privateToken) return privateToken;

  // Bruk offentlig test-token
  const res = await fetch("https://pam-stilling-feed.nav.no/api/publicToken");
  if (!res.ok) throw new Error(`NAV token-kall feilet: ${res.status}`);
  const data = await res.json() as { token: string };
  return data.token;
}

async function fetchStillinger(
  token: string,
  page = 0,
  size = 100
): Promise<NavFeedResponse> {
  const res = await fetch(
    `https://pam-stilling-feed.nav.no/api/v1/feed?page=${page}&size=${size}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`NAV stilling-feed feilet: ${res.status}`);
  return res.json() as Promise<NavFeedResponse>;
}

export async function ingestNavStillinger(maxPages = 5): Promise<void> {
  const token = await fetchNavToken();
  let page = 0;
  let totalIngested = 0;

  while (page < maxPages) {
    const data = await fetchStillinger(token, page);
    if (!data.content || data.content.length === 0) break;

    const batch = db.batch();

    for (const stilling of data.content) {
      const jobRef = db.collection("jobListings").doc(stilling.id);
      const job: JobListing = {
        id: stilling.id,
        title: stilling.title || stilling.properties?.jobtitle || "Ukjent stilling",
        company: stilling.employer?.name ?? "Ukjent arbeidsgiver",
        location: stilling.location?.municipalityName
          || stilling.employer?.location
          || "Ukjent sted",
        type: mapExtent(stilling.properties?.extent),
        sector: stilling.occupationList?.[0]?.level1 ?? stilling.properties?.sector ?? "Ukjent",
        description: stilling.properties?.adtext?.slice(0, 500) ?? "",
        applicationUrl: stilling.properties?.applicationurl
          || (stilling.properties?.applicationemail
            ? `mailto:${stilling.properties.applicationemail}`
            : null),
        deadline: stilling.properties?.deadline ?? null,
        published: stilling.published ?? new Date().toISOString(),
        styrkCode: stilling.properties?.styrk08 ?? null,
        riasecMatch: getRiasecFromStyrk(stilling.properties?.styrk08 ?? null),
        active: true,
        source: "nav",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      batch.set(jobRef, job, { merge: true });
    }

    await batch.commit();
    totalIngested += data.content.length;

    const totalPages = data.page?.totalPages ?? 1;
    if (page >= totalPages - 1) break;
    page++;
  }

  // Oppdater metadata
  await db.collection("ingestMeta").doc("navStillinger").set({
    lastRun: admin.firestore.FieldValue.serverTimestamp(),
    totalIngested,
  });
}

// ---------------------------------------------------------------------------
// Scheduled Cloud Function
// ---------------------------------------------------------------------------

export const ingestNavStillingerScheduled = onSchedule(
  {
    schedule: "0 6 * * *", // Kl 06:00 daglig
    timeZone: "Europe/Oslo",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    await ingestNavStillinger(10); // Hent inntil 1000 stillinger
  }
);
