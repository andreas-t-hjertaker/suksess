/**
 * LLM Backend — server-side AI-chat og innholdsgenerering (Issue #34, #64, #57)
 *
 * Hybrid-arkitektur:
 * - Enkel chat: klientside Firebase AI SDK (billig, rask)
 * - RAG-chat: server-side Cloud Function (Weaviate-henting + kostnadskontroll)
 * - Innholdsgenerering: server-side (token-tracking, L2-cache)
 *
 * GDPR: Vertex AI Node SDK med europe-west1 endpoint (ADC, ingen API-nøkkel).
 * Safety: BLOCK_LOW_AND_ABOVE på alle kategorier for mindreårige.
 * Alle kall logges med tokens + kostnad, aldri brukerinnhold.
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import { withValidation, success, fail } from "./middleware";
import { z } from "zod";

// ─── Vertex AI (europe-west1, ADC) ────────────────────────────────────────────
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
const VERTEX_LOCATION = "europe-west1";
const DEFAULT_MODEL = "gemini-2.5-flash";

const vertexAI = new VertexAI({ project: PROJECT_ID, location: VERTEX_LOCATION });

// ─── Safety settings — KRITISK for mindreårige (Issue #57) ───────────────────
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

// ─── Token-kostnad-estimat (Gemini 2.5 Flash, USD → NOK) ─────────────────────
const USD_TO_NOK = 10.5;
const COST_PER_1K_INPUT = 0.000075 * USD_TO_NOK;
const COST_PER_1K_OUTPUT = 0.0003 * USD_TO_NOK;

function estimateCost(inputTokens: number, outputTokens: number) {
  return (inputTokens / 1000) * COST_PER_1K_INPUT
    + (outputTokens / 1000) * COST_PER_1K_OUTPUT;
}

// ─── Firestore cache ──────────────────────────────────────────────────────────
const db = admin.firestore();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 timer

async function getL2Cache(clusterId: string, contentType: string): Promise<string | null> {
  const cacheKey = `${clusterId}_${contentType}`;
  const snap = await db.collection("generatedContent").doc(cacheKey).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const age = Date.now() - (data.createdAt?.toMillis() ?? 0);
  if (age > CACHE_TTL_MS) return null;
  return data.content as string;
}

async function setL2Cache(
  clusterId: string,
  contentType: string,
  content: string,
  model: string
): Promise<void> {
  const cacheKey = `${clusterId}_${contentType}`;
  await db.collection("generatedContent").doc(cacheKey).set({
    content, model, clusterId, contentType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─── LLM-kall med Vertex AI SDK og GDPR-logging ──────────────────────────────

async function callGemini(
  prompt: string,
  systemInstruction: string,
  userId: string,
  feature: string,
  modelName = DEFAULT_MODEL
): Promise<{ text: string; inputTokens: number; outputTokens: number; costNok: number; budgetWarning?: number; budgetBlocked?: boolean }> {
  const start = Date.now();

  const model = vertexAI.getGenerativeModel({
    model: modelName,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const costNok = estimateCost(inputTokens, outputTokens);
  const latencyMs = Date.now() - start;

  // GDPR-kompatibel logging: kun metadata + sikkerhetsratings, aldri brukerinnhold
  db.collection("llmLogs").add({
    userId,
    feature,
    model: modelName,
    location: VERTEX_LOCATION,
    inputTokens,
    outputTokens,
    costNok,
    latencyMs,
    safetyRatings: response.candidates?.[0]?.safetyRatings ?? [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {/* logging skal ikke stoppe svaret */});

  // Token-budsjett-sjekk (Issue #34)
  const budget = await trackAndCheckBudget(userId, costNok);

  return { text, inputTokens, outputTokens, costNok, budgetWarning: budget.warningPct, budgetBlocked: budget.blocked };
}

// ─── Token-budsjett per bruker/skole (Issue #34) ─────────────────────────────

/**
 * Månedlig token-budsjett i NOK. Gratis-plan: 5 kr/mnd, Pro: 50 kr/mnd, Skole: 500 kr/mnd.
 * Henter plan fra Firestore users/{uid}/subscription, default = free-tier.
 */
const TOKEN_BUDGETS_NOK: Record<string, number> = {
  free: 5,
  pro: 50,
  skole: 500,
  kommune: 5000,
};

async function trackAndCheckBudget(
  userId: string,
  costNok: number
): Promise<{ warningPct?: number; blocked?: boolean }> {
  const monthKey = `budget_${userId}_${new Date().toISOString().slice(0, 7)}`; // YYYY-MM

  // Hent abonnement + nåværende bruk parallelt
  const [userSnap, budgetSnap] = await Promise.all([
    db.collection("users").doc(userId).get(),
    db.collection("tokenBudgets").doc(monthKey).get(),
  ]);

  const plan: string = (userSnap.data()?.subscription?.plan as string) ?? "free";
  const budgetNok = TOKEN_BUDGETS_NOK[plan] ?? TOKEN_BUDGETS_NOK.free;
  const spentBefore = (budgetSnap.data()?.spentNok ?? 0) as number;
  const spentAfter = spentBefore + costNok;

  // Skriv oppdatert forbruk asynkront
  db.collection("tokenBudgets").doc(monthKey).set({
    userId,
    plan,
    spentNok: spentAfter,
    budgetNok,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(() => {});

  const pct = (spentAfter / budgetNok) * 100;

  if (pct >= 100) return { blocked: true };
  if (pct >= 80) return { warningPct: Math.round(pct) };
  return {};
}

// ─── Rate limiting (Issue #57) ────────────────────────────────────────────────

const RATE_LIMITS = { messagesPerHour: 30, messagesPerDay: 200 };

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const hourKey = `ratelimit_${userId}_${now.toISOString().slice(0, 13)}`;
  const dayKey = `ratelimit_${userId}_${now.toISOString().slice(0, 10)}`;

  const [hourSnap, daySnap] = await Promise.all([
    db.collection("rateLimits").doc(hourKey).get(),
    db.collection("rateLimits").doc(dayKey).get(),
  ]);

  const hourCount = (hourSnap.data()?.count ?? 0) as number;
  const dayCount = (daySnap.data()?.count ?? 0) as number;

  if (hourCount >= RATE_LIMITS.messagesPerHour) {
    return { allowed: false, reason: "Maks 30 meldinger per time nådd. Prøv igjen om litt." };
  }
  if (dayCount >= RATE_LIMITS.messagesPerDay) {
    return { allowed: false, reason: "Maks 200 meldinger per dag nådd. Prøv igjen i morgen." };
  }

  // Inkrementer tellere (brannmur skriver, ingen blokkering)
  const batch = db.batch();
  batch.set(db.collection("rateLimits").doc(hourKey), { count: hourCount + 1, userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  batch.set(db.collection("rateLimits").doc(dayKey), { count: dayCount + 1, userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  batch.commit().catch(() => {});

  return { allowed: true };
}

// ─── Krise-detektor (Issue #57) ───────────────────────────────────────────────

const KRISE_PATTERNS = [
  /\b(ta mitt liv|ta livet mitt|selvmord|suicid|avslutte livet)\b/i,
  /\b(skade meg selv|skader meg|kutte meg|skjære meg)\b/i,
  /\b(ikke vil leve|vil ikke leve|orker ikke mer|gir opp livet)\b/i,
  /\b(overgrep|misbruk|vold hjemme|slått hjemme)\b/i,
];

const KRISE_SVAR = `Jeg merker at det du skriver kan handle om noe vanskelig. Jeg er en AI og kan ikke hjelpe med dette, men det finnes voksne som kan:

**Kristelefonen:** 116 111 (døgnet rundt, gratis)
**ung.no/rådogrett:** Chat med rådgivere
**Helsesykepleier på skolen din** kan også hjelpe

Du trenger ikke ha det slik alene. Ring eller chat nå.`;

// PII-mønstre (norsk)
const PII_PATTERNS = [
  /\b\d{6}\s?\d{5}\b/,           // personnummer
  /\b(\+47|0047)?\s?[2-9]\d{7}\b/, // telefon
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // e-post
];

// Prompt-injeksjonsmønstre
const INJEKSJON_PATTERNS = [
  /ignore (previous|all) instructions/i,
  /you are now (a|an|the)/i,
  /forget (everything|your|all) (you|previous)/i,
  /\[SYSTEM\]|\[INST\]|<\|im_start\|>/i,
  /jailbreak|DAN mode|developer mode/i,
];

function sanitizeAndCheck(message: string): { safe: boolean; sanitized: string; kriseResponse?: string } {
  for (const p of KRISE_PATTERNS) {
    if (p.test(message)) return { safe: false, sanitized: message, kriseResponse: KRISE_SVAR };
  }
  for (const p of INJEKSJON_PATTERNS) {
    if (p.test(message)) return { safe: false, sanitized: message };
  }
  let sanitized = message;
  for (const p of PII_PATTERNS) sanitized = sanitized.replace(p, "[FJERNET]");
  return { safe: true, sanitized };
}

// ─── Zod-skjemaer ─────────────────────────────────────────────────────────────

const generateContentSchema = z.object({
  contentType: z.enum(["career_summary", "study_tips", "motivation"]),
  clusterId: z.string().min(1),
  profileContext: z.string().max(2000).optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  profileContext: z.string().max(2000).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(20).optional(),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /llm/generate — Generer profilbasert innhold med 3-lags cache (Issue #9)
 * Lag 1 (profil-spesifikt, 7 d) → Lag 2 (klynge-delt, 24 t) → Lag 3 (live)
 */
const generateContent = withValidation(generateContentSchema, async ({ user, data, res }) => {
  const { contentType, clusterId, profileContext } = data;

  // Lag 1: profil-spesifikt innhold (7 dager TTL)
  const { getL1Cache } = await import("./content-cache");
  const l1Cached = await getL1Cache(user.uid, contentType);
  if (l1Cached) {
    success(res, { content: l1Cached, cached: true, cacheLayer: 1 });
    return;
  }

  // Lag 2: klynge-delt innhold (24 timer TTL)
  const cached = await getL2Cache(clusterId, contentType);
  if (cached) {
    success(res, { content: cached, cached: true, cacheLayer: 2 });
    return;
  }

  const systemPrompts: Record<typeof contentType, string> = {
    career_summary: "Du er en norsk karriereveileder. Skriv et kort (3–4 setninger) karrieresammendrag basert på elevprofilen. Norsk bokmål.",
    study_tips: "Du er en norsk studieveileder. Gi 3 konkrete studietips tilpasset elevens profil. Norsk bokmål.",
    motivation: "Du er en oppmuntrende mentor. Skriv en kort (2–3 setninger) motiverende melding til eleven. Norsk bokmål.",
  };

  const prompt = profileContext
    ? `Elevprofil:\n${profileContext}\n\nGenerer ${contentType}.`
    : `Generer ${contentType} for en gjennomsnittlig norsk VGS-elev.`;

  try {
    const { text } = await callGemini(prompt, systemPrompts[contentType], user.uid, contentType);
    await setL2Cache(clusterId, contentType, text, DEFAULT_MODEL);
    success(res, { content: text, cached: false });
  } catch (err) {
    fail(res, err instanceof Error ? err.message : "LLM-kall feilet", 500);
  }
});

/**
 * POST /llm/chat — Server-side chat med samtalehistorikk
 * Brukes når klientside-chat ikke er tilstrekkelig (f.eks. med RAG)
 */
const serverChat = withValidation(chatSchema, async ({ user, data, res }) => {
  const { message, profileContext, conversationHistory = [] } = data;

  // Rate limiting (Issue #57)
  const rateCheck = await checkRateLimit(user.uid);
  if (!rateCheck.allowed) {
    fail(res, rateCheck.reason ?? "For mange meldinger", 429);
    return;
  }

  // Krise + PII + injeksjonsdetektor (Issue #57)
  const safetyCheck = sanitizeAndCheck(message);
  if (!safetyCheck.safe) {
    if (safetyCheck.kriseResponse) {
      success(res, { reply: safetyCheck.kriseResponse, krise: true });
      return;
    }
    fail(res, "Meldingen ble blokkert av sikkerhetsfilter.", 400);
    return;
  }

  const systemInstruction = [
    "Du er Suksess AI-karriereveileder for norske VGS-elever.",
    "VIKTIG: Du er ikke en terapeut eller krisehjelper. Hvis elever uttrykker krise, selvskading eller selvmordstanker, henvis alltid til Kristelefonen 116 111.",
    "Beskytt alltid elevenes personvern — gjengi aldri personlig informasjon.",
    profileContext ? `\nElevprofil:\n${profileContext}` : "",
    "\nSvar alltid på norsk. Vær konkret, støttende og aldersadekvat (16–19 år).",
  ].join("");

  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Elev" : "Veileder"}: ${m.content}`)
    .join("\n");

  const fullPrompt = historyText
    ? `${historyText}\nElev: ${safetyCheck.sanitized}`
    : safetyCheck.sanitized;

  try {
    const { text, inputTokens, outputTokens, costNok, budgetWarning, budgetBlocked } = await callGemini(
      fullPrompt,
      systemInstruction,
      user.uid,
      "chat"
    );
    if (budgetBlocked) {
      fail(res, "Månedlig AI-kvote er brukt opp. Oppgrader abonnementet for mer tilgang.", 429);
      return;
    }
    success(res, { reply: text, usage: { inputTokens, outputTokens, costNok }, budgetWarning });
  } catch (err) {
    fail(res, err instanceof Error ? err.message : "Chat-kall feilet", 500);
  }
});

// ─── RAG Pipeline (Issue #35) ─────────────────────────────────────────────────

const WEAVIATE_URL_SECRET = process.env.WEAVIATE_URL ?? "";
const WEAVIATE_API_KEY_SECRET = process.env.WEAVIATE_API_KEY ?? "";

type WeaviateDoc = {
  _additional?: { id?: string; score?: number };
  name?: string;
  title?: string;
  description?: string;
  institution?: string;
  source?: string;
};

async function weaviateHybridSearch(
  query: string,
  className: string,
  topK = 3
): Promise<WeaviateDoc[]> {
  if (!WEAVIATE_URL_SECRET || !WEAVIATE_API_KEY_SECRET) return [];

  try {
    const resp = await fetch(`${WEAVIATE_URL_SECRET}/v1/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WEAVIATE_API_KEY_SECRET}`,
      },
      body: JSON.stringify({
        query: `{
          Get {
            ${className}(
              hybrid: { query: ${JSON.stringify(query)}, alpha: 0.75 },
              limit: ${topK}
            ) {
              _additional { id score }
              name description institution source
            }
          }
        }`,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!resp.ok) return [];
    const data = await resp.json() as { data?: { Get?: Record<string, WeaviateDoc[]> } };
    return data.data?.Get?.[className] ?? [];
  } catch {
    return [];
  }
}

function buildRagContext(
  studyDocs: WeaviateDoc[],
  careerDocs: WeaviateDoc[]
): { contextBlock: string; sources: string[] } {
  const sources: string[] = [];
  const lines: string[] = ["## Hentet kontekst fra utdanningsdatabasen\n"];

  if (studyDocs.length > 0) {
    lines.push("### Studieprogram");
    for (const d of studyDocs) {
      const title = d.name ?? d.title ?? "Ukjent";
      const desc = (d.description ?? "").slice(0, 300);
      const src = d.source ?? d.institution ?? "utdanning.no";
      lines.push(`- **${title}** (${src}): ${desc}`);
      sources.push(`${title} — ${src}`);
    }
  }

  if (careerDocs.length > 0) {
    lines.push("\n### Karriereveier");
    for (const d of careerDocs) {
      const title = d.name ?? d.title ?? "Ukjent";
      const desc = (d.description ?? "").slice(0, 300);
      lines.push(`- **${title}**: ${desc}`);
      sources.push(title);
    }
  }

  return {
    contextBlock: lines.join("\n"),
    sources: [...new Set(sources)].slice(0, 5),
  };
}

const ragChatSchema = z.object({
  message: z.string().min(1).max(4000),
  profileContext: z.string().max(2000).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(20).optional(),
});

/**
 * POST /llm/rag-chat — RAG-augmentert chat (Issue #35)
 *
 * Henter kontekst fra Weaviate (studieprogram + karriereveier) og
 * injiserer det i system-prompten før LLM-kallet.
 * Returnerer svar med kildehenvisninger.
 */
const ragChat = withValidation(ragChatSchema, async ({ user, data, res }) => {
  const { message, profileContext, conversationHistory = [] } = data;

  // Rate limiting + sikkerhetssjekk
  const rateCheck = await checkRateLimit(user.uid);
  if (!rateCheck.allowed) {
    fail(res, rateCheck.reason ?? "For mange meldinger", 429);
    return;
  }

  const safetyCheck = sanitizeAndCheck(message);
  if (!safetyCheck.safe) {
    if (safetyCheck.kriseResponse) {
      success(res, { reply: safetyCheck.kriseResponse, krise: true, sources: [] });
      return;
    }
    fail(res, "Meldingen ble blokkert av sikkerhetsfilter.", 400);
    return;
  }

  // Parallelt: hent kontekst fra Weaviate
  const [studyDocs, careerDocs] = await Promise.all([
    weaviateHybridSearch(safetyCheck.sanitized!, "StudyProgram", 3),
    weaviateHybridSearch(safetyCheck.sanitized!, "CareerPath", 3),
  ]);

  const { contextBlock, sources } = buildRagContext(studyDocs, careerDocs);

  const systemInstruction = [
    "Du er Suksess AI-karriereveileder for norske VGS-elever.",
    "VIKTIG: Henvis alltid til krise-hjelp (Kristelefonen 116 111) ved krise-signaler.",
    profileContext ? `\nElevprofil:\n${profileContext}` : "",
    studyDocs.length > 0 || careerDocs.length > 0 ? `\n${contextBlock}` : "",
    "\nSvar alltid på norsk. Vær konkret, støttende og aldersadekvat (16–19 år).",
    "\nNår du refererer til studieprogram eller karriereveier fra konteksten, nevn kilden.",
  ].join("");

  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Elev" : "Veileder"}: ${m.content}`)
    .join("\n");

  const fullPrompt = historyText
    ? `${historyText}\nElev: ${safetyCheck.sanitized}`
    : safetyCheck.sanitized!;

  try {
    const { text, inputTokens, outputTokens, costNok, budgetWarning, budgetBlocked } = await callGemini(
      fullPrompt,
      systemInstruction,
      user.uid,
      "rag-chat"
    );
    if (budgetBlocked) {
      fail(res, "Månedlig AI-kvote er brukt opp. Oppgrader abonnementet for mer tilgang.", 429);
      return;
    }
    success(res, {
      reply: text,
      sources,
      usage: { inputTokens, outputTokens, costNok },
      ragDocCount: studyDocs.length + careerDocs.length,
      budgetWarning,
    });
  } catch (err) {
    fail(res, err instanceof Error ? err.message : "RAG-chat feilet", 500);
  }
});

// ─── Cloud Functions exports ──────────────────────────────────────────────────

export const llmApi = onRequest(
  {
    region: "europe-west1",
    cors: true,
    invoker: "public",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method === "POST" && req.path === "/llm/generate") {
      await generateContent({ req, res });
      return;
    }
    if (req.method === "POST" && req.path === "/llm/chat") {
      await serverChat({ req, res });
      return;
    }
    if (req.method === "POST" && req.path === "/llm/rag-chat") {
      await ragChat({ req, res });
      return;
    }
    fail(res, "Ikke funnet", 404);
  }
);
