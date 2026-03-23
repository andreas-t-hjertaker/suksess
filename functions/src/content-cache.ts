/**
 * 3-lags AI-innholds-cache (Issue #9)
 *
 * Lag 1 — Profil-spesifikt: Genereres ved profilendring, TTL 7 dager.
 *   Nøkkel: `profile_{userId}_{contentType}`
 *   Trigger: onDocumentUpdated på profiles/{userId}
 *
 * Lag 2 — Klynge-delt: Deles mellom elever i same klynge, TTL 24 timer.
 *   Nøkkel: `cluster_{clusterId}_{contentType}`
 *   Allerede implementert i llm.ts — se getL2Cache/setL2Cache
 *
 * Lag 3 — Live-generert: Sanntidsgenerering for unike spørsmål.
 *   Caches i semanticCache/ etter generering (implementert i semantic-cache.ts).
 *
 * Innholdstyper (contentType):
 *   - career_suggestions: 3 karriereforslag basert på profil
 *   - study_tips: 3 studietips tilpasset læringsstil
 *   - strengths_summary: Personlig styrke-sammendrag
 *   - riasec_insight: Innsikt i RIASEC-profil
 */

import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";

const db = admin.firestore();
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
const vertexAI = new VertexAI({ project: PROJECT_ID, location: "europe-west1" });

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const L1_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dager
const CONTENT_TYPES = ["career_suggestions", "study_tips", "strengths_summary", "riasec_insight"] as const;
type ContentType = typeof CONTENT_TYPES[number];

// ---------------------------------------------------------------------------
// Lag 1 cache — hent og sett
// ---------------------------------------------------------------------------

export async function getL1Cache(userId: string, contentType: string): Promise<string | null> {
  const key = `profile_${userId}_${contentType}`;
  const snap = await db.collection("generatedContent").doc(key).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const age = Date.now() - (data.createdAt?.toMillis() ?? 0);
  if (age > L1_TTL_MS) return null;
  return data.content as string;
}

async function setL1Cache(
  userId: string,
  contentType: string,
  content: string
): Promise<void> {
  const key = `profile_${userId}_${contentType}`;
  await db.collection("generatedContent").doc(key).set({
    content,
    layer: 1,
    userId,
    contentType,
    model: "gemini-2.5-flash",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function invalidateL1Cache(userId: string): Promise<void> {
  const batch = db.batch();
  for (const contentType of CONTENT_TYPES) {
    const key = `profile_${userId}_${contentType}`;
    batch.delete(db.collection("generatedContent").doc(key));
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Innholds-prompts
// ---------------------------------------------------------------------------

function buildPrompt(
  contentType: ContentType,
  profile: FirebaseFirestore.DocumentData
): string {
  const bf = profile.bigFive ?? {};
  const ri = profile.riasec ?? {};
  const riasecCode = Object.entries(ri as Record<string, number>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k.charAt(0).toUpperCase())
    .join("");
  const gradeAvg = profile.gradeAverage?.toFixed(1) ?? "ukjent";
  const strengths = (profile.strengths as string[] | undefined)?.slice(0, 3).join(", ") ?? "ikke oppgitt";

  const profileSummary = `
Big Five: Åpenhet=${bf.openness ?? 50}, Planmessighet=${bf.conscientiousness ?? 50}, Utadvendthet=${bf.extraversion ?? 50}, Medmenneskelighet=${bf.agreeableness ?? 50}, Nevrotisisme=${bf.neuroticism ?? 50}
RIASEC-kode: ${riasecCode}
Karaktersnitt: ${gradeAvg}
Styrker: ${strengths}
`.trim();

  const prompts: Record<ContentType, string> = {
    career_suggestions: `
Du er en norsk karriereveileder for videregående elever. Basert på elevens profil nedenfor, gi 3 konkrete karriereveier som passer godt. For hver karriere: navn, kort begrunnelse (1 setning), og ett studieprogram å se på.

Profil:
${profileSummary}

Svar på norsk bokmål. Format: numrert liste.
    `.trim(),

    study_tips: `
Du er en læringscoach for norske videregående elever. Gi 3 personaliserte studietips basert på profilen. Fokuser på metoder som passer personlighetsprofilen.

Profil:
${profileSummary}

Svar på norsk bokmål. Format: numrert liste med tittel og forklaring.
    `.trim(),

    strengths_summary: `
Skriv et kort, motiverende styrke-sammendrag (3–4 setninger) for denne eleven. Fokuser på det positive og vær konkret.

Profil:
${profileSummary}

Svar på norsk bokmål. Skriv direkte til eleven (du-form).
    `.trim(),

    riasec_insight: `
Gi eleven en innsiktsfull forklaring av deres RIASEC-profil. Forklar hva koden betyr, hvilke arbeidsmiljøer som passer, og 2 yrker som er kjent for å trives med denne profilen.

Profil:
${profileSummary}

Svar på norsk bokmål. Maks 150 ord.
    `.trim(),
  };

  return prompts[contentType];
}

// ---------------------------------------------------------------------------
// Generer innhold med Vertex AI
// ---------------------------------------------------------------------------

async function generateContent(prompt: string): Promise<string> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: SAFETY_SETTINGS,
    systemInstruction: {
      role: "system",
      parts: [{ text: "Du er en hjelpsom norsk karriere- og studieveileder for videregående elever. Svar alltid på norsk bokmål. Vær konkret, oppmuntrende og presis." }],
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 512, temperature: 0.6 },
  });

  return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// Firestore trigger — generer L1-innhold ved profilendring
// ---------------------------------------------------------------------------

export const onProfileUpdatedGenerateContent = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west1" },
  async (event) => {
    const userId = event.params.userId;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    // Sjekk om profil-relevante felter har endret seg
    const profileChanged =
      JSON.stringify(before.bigFive) !== JSON.stringify(after.bigFive) ||
      JSON.stringify(before.riasec) !== JSON.stringify(after.riasec) ||
      before.gradeAverage !== after.gradeAverage;

    if (!profileChanged) return;
    if (!after.bigFiveCompleted) return;

    console.info(`[content-cache] Profil endret for ${userId} — invaliderer og regenererer L1-cache`);

    // Invalider gammel cache
    await invalidateL1Cache(userId);

    // Generer karriereforslag og studietips asynkront (ikke blokker trigger)
    const priorityTypes: ContentType[] = ["career_suggestions", "study_tips"];

    for (const contentType of priorityTypes) {
      try {
        const prompt = buildPrompt(contentType, after);
        const content = await generateContent(prompt);
        if (content) {
          await setL1Cache(userId, contentType, content);
          console.info(`[content-cache] Generert ${contentType} for ${userId}`);
        }
      } catch (err) {
        console.error(`[content-cache] Feil ved generering av ${contentType} for ${userId}:`, err);
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Eksporter cache-oppslag for bruk i llm.ts og andre handlers
// ---------------------------------------------------------------------------

export type { ContentType };
