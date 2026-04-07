import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { fail, rateLimit, validateCsrf } from "./middleware";
import { db } from "./constants";
import { FUNCTIONS_REGION } from "./constants";
import { routes, findParamRoute } from "./router";
import {
  syncChatFeedbackToNotion,
  syncTilbakemeldingToNotion,
  feedbackNotionSecrets,
} from "./handlers/feedback-notion-sync";

// Tillatte CORS-origins (produksjon + dev)
const ALLOWED_ORIGINS = [
  "https://suksess.no",
  "https://www.suksess.no",
  "https://suksess-842ed.web.app",
  "https://suksess-842ed.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
];

// Rate limiter-instans
const apiRateLimit = rateLimit(100, 60_000);

/**
 * Health check / API-status
 */
export const health = onRequest(
  { region: "europe-west1", cors: ALLOWED_ORIGINS },
  async (_req, res) => {
    const checks: Record<string, "connected" | "error"> = {
      firestore: "error",
      storage: "error",
      functions: "connected",
    };

    try {
      const snap = await db.collection("featureFlags").limit(1).get();
      checks.firestore = snap !== undefined ? "connected" : "error";
    } catch {
      checks.firestore = "error";
    }

    try {
      const bucket = admin.storage().bucket();
      const [exists] = await bucket.exists();
      checks.storage = exists ? "connected" : "error";
    } catch {
      checks.storage = "error";
    }

    const allOk = Object.values(checks).every((v) => v === "connected");

    res.json({
      status: allOk ? "ok" : "degraded",
      project: "suksess-842ed",
      timestamp: new Date().toISOString(),
      services: checks,
    });
  }
);

/**
 * Hoved-API med stibasert ruting og middleware
 */
export const api = onRequest(
  { region: "europe-west1", cors: ALLOWED_ORIGINS, invoker: "public" },
  async (req, res) => {
    // Rate limiting
    if (!apiRateLimit({ req, res })) return;

    // CSRF-validering på muterende forespørsler (#139)
    if (!validateCsrf({ req, res })) return;

    // Eksakt sti-matching
    const route = routes.find(
      (r) => r.method === req.method && r.path === req.path
    );

    if (route) {
      await route.handler({ req, res });
      return;
    }

    // Parametrisk sti-matching (prefix-basert)
    const paramRoute = findParamRoute(req.method, req.path);
    if (paramRoute) {
      await paramRoute.handler({ req, res });
      return;
    }

    fail(res, "Ikke funnet", 404);
  }
);

// ============================================================
// Firestore-triggere
// ============================================================

/**
 * AI-chat feedback → Notion sync
 *
 * Trigges automatisk når et nytt chatFeedback-dokument opprettes.
 * Synkroniserer thumbs up/down feedback til Notion-database.
 */
export const onChatFeedbackCreated = onDocumentCreated(
  {
    document: "chatFeedback/{feedbackId}",
    region: FUNCTIONS_REGION,
    secrets: feedbackNotionSecrets,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.warn("[onChatFeedbackCreated] Tomt snapshot — ignorerer");
      return;
    }

    const feedbackId = event.params.feedbackId;
    const data = snapshot.data();

    await syncChatFeedbackToNotion(feedbackId, {
      userId: data.userId ?? "",
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? "",
      rating: data.rating ?? "thumbs_down",
      reason: data.reason ?? null,
      messageContent: data.messageContent ?? "",
      createdAt: data.createdAt,
    });
  }
);

/**
 * Generell plattform-feedback → Notion sync
 *
 * Trigges automatisk når et nytt feedback-dokument opprettes (feil/forslag/ros).
 * Synkroniserer tilbakemeldinger med full kontekst til Notion-database.
 */
export const onTilbakemeldingCreated = onDocumentCreated(
  {
    document: "feedback/{feedbackId}",
    region: FUNCTIONS_REGION,
    secrets: feedbackNotionSecrets,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.warn("[onTilbakemeldingCreated] Tomt snapshot — ignorerer");
      return;
    }

    const feedbackId = event.params.feedbackId;
    const data = snapshot.data();

    await syncTilbakemeldingToNotion(feedbackId, {
      type: data.type ?? "forslag",
      tittel: data.tittel ?? "(uten tittel)",
      beskrivelse: data.beskrivelse ?? "",
      prioritet: data.prioritet ?? null,
      kilde: data.kilde ?? "fab",
      side: data.side ?? "ukjent",
      nettleser: data.nettleser ?? "ukjent",
      skjermstorrelse: data.skjermstorrelse ?? "ukjent",
      uid: data.uid ?? "",
      epost: data.epost ?? null,
      feilmelding: data.feilmelding ?? null,
      stackTrace: data.stackTrace ?? null,
      status: data.status ?? "ny",
      createdAt: data.createdAt,
    });
  }
);
