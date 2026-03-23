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
): Promise<{ text: string; inputTokens: number; outputTokens: number; costNok: number }> {
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

  return { text, inputTokens, outputTokens, costNok };
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
 * POST /llm/generate — Generer profilbasert innhold med L2-cache
 * Typisk bruk: AI-genererte sammendrag, karrieretips, studiemotivasjon
 */
const generateContent = withValidation(generateContentSchema, async ({ user, data, res }) => {
  const { contentType, clusterId, profileContext } = data;

  // Sjekk L2-cache (delt mellom brukere i same klynge)
  const cached = await getL2Cache(clusterId, contentType);
  if (cached) {
    success(res, { content: cached, cached: true });
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
    const { text, inputTokens, outputTokens, costNok } = await callGemini(
      fullPrompt,
      systemInstruction,
      user.uid,
      "chat"
    );
    success(res, { reply: text, usage: { inputTokens, outputTokens, costNok } });
  } catch (err) {
    fail(res, err instanceof Error ? err.message : "Chat-kall feilet", 500);
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
    fail(res, "Ikke funnet", 404);
  }
);
