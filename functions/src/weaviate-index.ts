/**
 * Weaviate vektordatabase-oppsett og indeksering (Issue #8)
 *
 * Funksjoner:
 * 1. provisionWeaviateSchema: Oppretter Weaviate-schema (klasser og egenskaper)
 * 2. indexStudyPrograms: Indekserer studieprogram fra Firestore → Weaviate
 * 3. indexCareerPaths: Indekserer karriereveier → Weaviate
 * 4. Scheduled: Daglig re-indeksering av nye data
 *
 * Arkitektur:
 *   Firestore (kilde) → Cloud Function → Weaviate Cloud (søkeindeks)
 *   Frontend → Cloud Function proxy → Weaviate (semantisk søk)
 *
 * Weaviate Cloud er konfigurert i EU (GCP) for GDPR-compliance.
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { withAdmin } from "./middleware";

const db = admin.firestore();

// Weaviate API-nøkkel fra Firebase Secret Manager
const WEAVIATE_API_KEY = defineSecret("WEAVIATE_API_KEY");
const WEAVIATE_URL = defineSecret("WEAVIATE_URL");

// ---------------------------------------------------------------------------
// Weaviate REST-klient (ingen SDK — bruker fetch direkte)
// ---------------------------------------------------------------------------

async function weaviateRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
  apiKey?: string,
  baseUrl?: string
): Promise<unknown> {
  const url = `${baseUrl ?? "https://suksess.weaviate.network"}${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY ?? "",
      Authorization: `Bearer ${apiKey ?? ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Weaviate ${method} ${path} failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

// ---------------------------------------------------------------------------
// Schema-definisjon
// ---------------------------------------------------------------------------

const WEAVIATE_SCHEMA = {
  classes: [
    {
      class: "StudyProgram",
      description: "Studieprogram ved norske universiteter og høgskoler",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      properties: [
        { name: "firestoreId", dataType: ["text"], skipVectorization: true },
        { name: "name", dataType: ["text"] },
        { name: "institution", dataType: ["text"] },
        { name: "description", dataType: ["text"] },
        { name: "nusCode", dataType: ["text"], skipVectorization: true },
        { name: "level", dataType: ["text"], skipVectorization: true },
        { name: "requiredGpa", dataType: ["number"], skipVectorization: true },
        { name: "riasecCodes", dataType: ["text[]"], skipVectorization: true },
        { name: "url", dataType: ["text"], skipVectorization: true },
        { name: "updatedAt", dataType: ["date"], skipVectorization: true },
      ],
    },
    {
      class: "CareerPath",
      description: "Karriereveier og yrkesbeskrivelser",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      properties: [
        { name: "firestoreId", dataType: ["text"], skipVectorization: true },
        { name: "title", dataType: ["text"] },
        { name: "description", dataType: ["text"] },
        { name: "sector", dataType: ["text"] },
        { name: "demand", dataType: ["text"], skipVectorization: true },
        { name: "medianSalaryNok", dataType: ["number"], skipVectorization: true },
        { name: "riasecCodes", dataType: ["text[]"], skipVectorization: true },
      ],
    },
    {
      class: "KnowledgeArticle",
      description: "Kunnskapsartikler om studier, søknad og karriere",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      properties: [
        { name: "firestoreId", dataType: ["text"], skipVectorization: true },
        { name: "title", dataType: ["text"] },
        { name: "body", dataType: ["text"] },
        { name: "source", dataType: ["text"], skipVectorization: true },
        { name: "url", dataType: ["text"], skipVectorization: true },
        { name: "lastUpdated", dataType: ["date"], skipVectorization: true },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------

/**
 * POST /weaviate-provision
 * Oppretter Weaviate-schema (kun admin).
 * Idempotent — hopper over eksisterende klasser.
 */
export const weaviateProvision = onRequest(
  {
    region: "europe-west1",
    secrets: [WEAVIATE_API_KEY, WEAVIATE_URL],
  },
  async (req, res) => {
    const handler = withAdmin(async ({ res: authRes }) => {
      const apiKey = WEAVIATE_API_KEY.value();
      const baseUrl = WEAVIATE_URL.value();

      const results: string[] = [];

      for (const classSchema of WEAVIATE_SCHEMA.classes) {
        try {
          // Sjekk om klassen allerede finnes
          await weaviateRequest(
            `/v1/schema/${classSchema.class}`,
            "GET",
            undefined,
            apiKey,
            baseUrl
          );
          results.push(`${classSchema.class}: allerede eksisterer`);
        } catch {
          // Klassen finnes ikke — opprett den
          await weaviateRequest(
            "/v1/schema",
            "POST",
            classSchema,
            apiKey,
            baseUrl
          );
          results.push(`${classSchema.class}: opprettet`);
        }
      }

      authRes.status(200).json({ success: true, data: { results } });
    });

    await handler({ req, res });
  }
);

/**
 * Scheduled: Daglig indeksering av studieprogram og karriereveier
 * Kjøres 04:00 Norwegian time (02:00 UTC)
 */
export const weaviateIndexScheduled = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Europe/Oslo",
    region: "europe-west1",
    secrets: [WEAVIATE_API_KEY, WEAVIATE_URL],
  },
  async () => {
    const apiKey = WEAVIATE_API_KEY.value();
    const baseUrl = WEAVIATE_URL.value();

    const [studyCount, careerCount] = await Promise.allSettled([
      indexStudyProgramsToWeaviate(apiKey, baseUrl),
      indexCareerPathsToWeaviate(apiKey, baseUrl),
    ]);

    console.info("Weaviate indeksering fullført:", {
      studyPrograms: studyCount.status === "fulfilled" ? studyCount.value : "feilet",
      careerPaths: careerCount.status === "fulfilled" ? careerCount.value : "feilet",
    });
  }
);

// ---------------------------------------------------------------------------
// Indekserings-hjelpefunksjoner
// ---------------------------------------------------------------------------

async function indexStudyProgramsToWeaviate(
  apiKey: string,
  baseUrl: string
): Promise<number> {
  const snap = await db.collection("studyPrograms").limit(1000).get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    try {
      await weaviateRequest(
        "/v1/objects",
        "POST",
        {
          class: "StudyProgram",
          properties: {
            firestoreId: doc.id,
            name: data.name ?? data.title ?? "",
            institution: data.institution ?? "",
            description: data.description ?? "",
            nusCode: data.nusCode ?? "",
            level: data.level ?? "",
            requiredGpa: data.requiredGpa ?? 0,
            riasecCodes: data.riasecCodes ?? [],
            url: data.url ?? "",
            updatedAt: new Date().toISOString(),
          },
        },
        apiKey,
        baseUrl
      );
      count++;
    } catch (err) {
      console.warn(`Feil ved indeksering av studieprogram ${doc.id}:`, err);
    }
  }

  return count;
}

async function indexCareerPathsToWeaviate(
  apiKey: string,
  baseUrl: string
): Promise<number> {
  const snap = await db.collection("careerPaths").limit(500).get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    try {
      await weaviateRequest(
        "/v1/objects",
        "POST",
        {
          class: "CareerPath",
          properties: {
            firestoreId: doc.id,
            title: data.title ?? "",
            description: data.description ?? "",
            sector: data.sector ?? "",
            demand: data.demand ?? "medium",
            medianSalaryNok: data.medianSalary ?? 0,
            riasecCodes: data.riasecCodes ?? [],
          },
        },
        apiKey,
        baseUrl
      );
      count++;
    } catch (err) {
      console.warn(`Feil ved indeksering av karrierevei ${doc.id}:`, err);
    }
  }

  return count;
}
