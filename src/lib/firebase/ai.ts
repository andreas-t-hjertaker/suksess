"use client";

import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import { app } from "./config";

/**
 * Initialiser Firebase AI Logic med Vertex AI backend i europe-west1.
 *
 * VertexAIBackend er påkrevd for GDPR-compliance — alle AI-kall
 * prosesseres i EU og data forlater ikke EØS. (Issue #50)
 *
 * Forutsetning: Vertex AI API må være aktivert i Firebase-prosjektet
 * og prosjektet må ha "Pay as you go"-fakturering.
 */
const ai = getAI(app, { backend: new VertexAIBackend() });

/**
 * Hent en Gemini-modell for generativ AI.
 * Standard: gemini-2.5-flash — rask, billig og stabil.
 */
export function getModel(modelName = "gemini-2.5-flash") {
  return getGenerativeModel(ai, { model: modelName });
}

/**
 * Enkel tekst-prompt mot Gemini.
 */
export async function generateText(prompt: string, modelName?: string) {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Streaming tekst-prompt — gir chunks etter hvert.
 */
export async function* streamText(prompt: string, modelName?: string) {
  const model = getModel(modelName);
  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/**
 * Chat-sesjon med historikk.
 */
export function createChat(
  systemInstruction?: string,
  modelName?: string,
) {
  const model = getModel(modelName);
  return model.startChat({
    history: [],
    ...(systemInstruction && {
      systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
    }),
  });
}

export { ai };
