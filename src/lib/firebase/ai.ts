"use client";

import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import type { SafetySetting } from "firebase/ai";
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
 * Safety settings — KRITISK for mindreårige (Issue #57)
 * BLOCK_LOW_AND_ABOVE på alle 4 kategorier.
 */
const SAFETY_SETTINGS: SafetySetting[] = [
  { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_LOW_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_LOW_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
];

/**
 * Hent en Gemini-modell for generativ AI.
 * Standard: gemini-2.5-flash — rask, billig og stabil.
 * Safety settings er alltid aktivert for mindreårige.
 */
export function getModel(modelName = "gemini-2.5-flash") {
  return getGenerativeModel(ai, { model: modelName, safetySettings: SAFETY_SETTINGS });
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
