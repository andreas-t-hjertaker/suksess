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
import { withAdmin, withValidation, success, fail } from "./middleware";
import { z } from "zod";

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
    {
      class: "Occupation",
      description: "Yrkesbeskrivelser fra STYRK-08 og utdanning.no",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      properties: [
        { name: "firestoreId", dataType: ["text"], skipVectorization: true },
        { name: "title", dataType: ["text"] },
        { name: "description", dataType: ["text"] },
        { name: "styrk08Code", dataType: ["text"], skipVectorization: true },
        { name: "riasecCodes", dataType: ["text[]"], skipVectorization: true },
        { name: "educationRequirement", dataType: ["text"], skipVectorization: true },
        { name: "sector", dataType: ["text"], skipVectorization: true },
        { name: "medianSalaryNok", dataType: ["number"], skipVectorization: true },
      ],
    },
    {
      class: "JobListing",
      description: "Aktive stillingsannonser fra NAV Arbeidsplassen",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      properties: [
        { name: "navId", dataType: ["text"], skipVectorization: true },
        { name: "title", dataType: ["text"] },
        { name: "description", dataType: ["text"] },
        { name: "employer", dataType: ["text"], skipVectorization: true },
        { name: "municipality", dataType: ["text"], skipVectorization: true },
        { name: "occupationCode", dataType: ["text"], skipVectorization: true },
        { name: "applicationDeadline", dataType: ["date"], skipVectorization: true },
        { name: "url", dataType: ["text"], skipVectorization: true },
        { name: "publishedAt", dataType: ["date"], skipVectorization: true },
      ],
    },
    {
      // ConversationMemory bruker multi-tenancy for GDPR-isolasjon per skole
      class: "ConversationMemory",
      description: "Bruker-chat-historikk for langsiktig AI-minne (per tenant)",
      vectorizer: "text2vec-openai",
      moduleConfig: {
        "text2vec-openai": { model: "text-embedding-3-small", dimensions: 1536 },
      },
      multiTenancyConfig: { enabled: true },
      properties: [
        { name: "userId", dataType: ["text"], skipVectorization: true },
        { name: "tenantId", dataType: ["text"], skipVectorization: true },
        { name: "message", dataType: ["text"] },
        { name: "role", dataType: ["text"], skipVectorization: true },
        { name: "conversationId", dataType: ["text"], skipVectorization: true },
        { name: "createdAt", dataType: ["date"], skipVectorization: true },
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

    const [studyCount, careerCount, jobCount] = await Promise.allSettled([
      indexStudyProgramsToWeaviate(apiKey, baseUrl),
      indexCareerPathsToWeaviate(apiKey, baseUrl),
      indexJobListingsToWeaviate(apiKey, baseUrl),
    ]);

    console.info("Weaviate indeksering fullført:", {
      studyPrograms: studyCount.status === "fulfilled" ? studyCount.value : "feilet",
      careerPaths: careerCount.status === "fulfilled" ? careerCount.value : "feilet",
      jobListings: jobCount.status === "fulfilled" ? jobCount.value : "feilet",
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

async function indexJobListingsToWeaviate(
  apiKey: string,
  baseUrl: string
): Promise<number> {
  const snap = await db.collection("navJobs").limit(500).get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    try {
      await weaviateRequest(
        "/v1/objects",
        "POST",
        {
          class: "JobListing",
          properties: {
            navId: data.id ?? doc.id,
            title: data.title ?? "",
            description: data.description ?? "",
            employer: data.employer ?? "",
            municipality: data.municipality ?? "",
            occupationCode: data.occupationCode ?? "",
            applicationDeadline: data.applicationDeadline
              ? new Date(data.applicationDeadline).toISOString()
              : new Date().toISOString(),
            url: data.url ?? "",
            publishedAt: data.publishedAt
              ? new Date(data.publishedAt).toISOString()
              : new Date().toISOString(),
          },
        },
        apiKey,
        baseUrl
      );
      count++;
    } catch (err) {
      console.warn(`Feil ved indeksering av jobb ${doc.id}:`, err);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Search Proxy — POST /search (Issue #65)
// Skjuler Weaviate API-nøkkel, verifiserer auth, rate-limiter
// ---------------------------------------------------------------------------

const searchParamsSchema = z.object({
  query: z.string().min(1).max(500),
  className: z.enum(["StudyProgram", "CareerPath", "JobListing", "Occupation", "KnowledgeArticle"]),
  limit: z.number().int().min(1).max(50).optional().default(10),
  alpha: z.number().min(0).max(1).optional().default(0.75), // hybrid: 0=keyword, 1=vector
  filters: z.record(z.string()).optional(),
});

const RATE_LIMIT_MAX = 50; // søk per minutt per bruker

async function checkSearchRateLimit(userId: string): Promise<boolean> {
  const minuteKey = `search_rl_${userId}_${new Date().toISOString().slice(0, 16)}`;
  const ref = db.collection("rateLimits").doc(minuteKey);

  const snap = await ref.get();
  const count = (snap.data()?.count ?? 0) as number;
  if (count >= RATE_LIMIT_MAX) return false;

  ref.set({ count: count + 1, userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    .catch(() => {});
  return true;
}

/**
 * POST /search — Weaviate hybrid-søk proxy (Issue #65)
 *
 * Skjuler Weaviate API-nøkkel, verifiserer Firebase auth,
 * rate-limiter søk, logger responstid.
 */
export const searchProxy = onRequest(
  {
    region: "europe-west1",
    cors: true,
    invoker: "public",
    secrets: [WEAVIATE_API_KEY, WEAVIATE_URL],
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    const handler = withValidation(searchParamsSchema, async ({ user, data }) => {
      // Rate limiting
      const allowed = await checkSearchRateLimit(user.uid);
      if (!allowed) {
        fail(res, "For mange søk. Prøv igjen om litt.", 429);
        return;
      }

      const start = Date.now();
      const apiKey = WEAVIATE_API_KEY.value();
      const baseUrl = WEAVIATE_URL.value();
      const { query, className, limit: lim, alpha, filters } = data;

      // Hybrid-søk (vektor + BM25 for norsk-støtte)
      const hybridQuery = {
        query: `{
          Get {
            ${className}(
              hybrid: {
                query: ${JSON.stringify(query)},
                alpha: ${alpha}
              },
              limit: ${lim}
              ${filters ? `, where: { operator: And, operands: [${Object.entries(filters).map(([k, v]) => `{ path: ["${k}"], operator: Equal, valueString: "${v}" }`).join(", ")}] }` : ""}
            ) {
              _additional { id score distance }
              name
              description
              institution
              level
            }
          }
        }`,
      };

      try {
        const result = await weaviateRequest(
          "/v1/graphql",
          "POST",
          hybridQuery,
          apiKey,
          baseUrl
        ) as { data?: { Get?: Record<string, unknown[]> } };

        const hits = result.data?.Get?.[className] ?? [];
        const latencyMs = Date.now() - start;

        // Log for observability (aldri brukerinnhold lagres)
        db.collection("searchLogs").add({
          userId: user.uid,
          className,
          resultCount: hits.length,
          latencyMs,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});

        success(res, { results: hits, count: hits.length, latencyMs });
      } catch (err) {
        fail(res, err instanceof Error ? err.message : "Søk feilet", 500);
      }
    });

    if (req.method !== "POST") {
      fail(res, "Metode ikke tillatt", 405);
      return;
    }

    await handler({ req, res });
  }
);
