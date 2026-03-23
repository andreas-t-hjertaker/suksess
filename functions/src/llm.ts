/**
 * LLM Backend — server-side AI-chat og innholdsgenerering (Issue #34)
 *
 * Hybrid-arkitektur:
 * - Enkel chat: klientside Firebase AI SDK (billig, rask)
 * - RAG-chat: server-side Cloud Function (Weaviate-henting + kostnadskontroll)
 * - Innholdsgenerering: server-side (token-tracking, L2-cache)
 *
 * Alle kall fra denne modulen logges med tokens + kostnad for observability.
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { withAuth, withValidation, success, fail } from "./middleware";
import { z } from "zod";

// ─── Firebase Vertex AI (server-side) ────────────────────────────────────────
// Vi bruker Google AI Node SDK mot Vertex AI endepunkt i europe-west1
// Merk: dette er server-side SDK, ikke firebase/ai klient-SDK

const VERTEX_LOCATION = "europe-west1";
const DEFAULT_MODEL = "gemini-2.5-flash";

const googleApiKey = defineSecret("GOOGLE_GEMINI_API_KEY");

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
  const ref = db.collection("generatedContent").doc(cacheKey);
  const snap = await ref.get();
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
    content,
    model,
    clusterId,
    contentType,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─── LLM-kall med logging ─────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  systemInstruction: string,
  userId: string,
  feature: string
): Promise<{ text: string; inputTokens: number; outputTokens: number; costNok: number }> {
  const start = Date.now();

  // Bruk Google AI Studio API (kompatibel med Gemini 2.5 Flash)
  // I produksjon: bytt til Vertex AI Node SDK for europe-west1
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${googleApiKey.value()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generation_config: { max_output_tokens: 2048, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API-feil: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  const text = data.candidates[0]?.content.parts[0]?.text ?? "";
  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  const costNok = estimateCost(inputTokens, outputTokens);
  const latencyMs = Date.now() - start;

  // Log til Firestore for observability
  db.collection("llmLogs").add({
    userId,
    feature,
    model: DEFAULT_MODEL,
    location: VERTEX_LOCATION,
    inputTokens,
    outputTokens,
    costNok,
    latencyMs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {/* logging skal ikke stoppe svaret */});

  return { text, inputTokens, outputTokens, costNok };
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

  const systemInstruction = [
    "Du er Suksess AI-karriereveileder for norske VGS-elever.",
    profileContext ? `\nElevprofil:\n${profileContext}` : "",
    "\nSvar alltid på norsk. Vær konkret, støttende og aldersadekvat (16–19 år).",
  ].join("");

  // Bygg samtalehistorikk som del av prompten
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Elev" : "Veileder"}: ${m.content}`)
    .join("\n");

  const fullPrompt = historyText
    ? `${historyText}\nElev: ${message}`
    : message;

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
    secrets: [googleApiKey],
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
