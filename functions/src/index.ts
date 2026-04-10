import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { fail, rateLimit, validateCsrf } from "./middleware";
import { db } from "./constants";
import { FUNCTIONS_REGION } from "./constants";
import { routes, findParamRoute } from "./router";
import {
  syncChatFeedbackToNotion,
  syncTilbakemeldingToNotion,
} from "./handlers/feedback-notion-sync";
import { ingestFintScheduled, triggerFintSync } from "./ingest/fint";

// Tillatte CORS-origins (produksjon + dev)
const ALLOWED_ORIGINS = [
  "https://suksess.no",
  "https://www.suksess.no",
  "https://karriere.ketl.cloud",
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
// FINT-integrasjon (#142)
// ============================================================

export { ingestFintScheduled, triggerFintSync };

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
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onChatFeedbackCreated] Tomt snapshot — ignorerer");
      return;
    }

    const feedbackId = event.params.feedbackId;
    const data = snapshot.data();

    const notionId = await syncChatFeedbackToNotion(feedbackId, {
      userId: data.userId ?? "",
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? "",
      rating: data.rating ?? "thumbs_down",
      reason: data.reason ?? null,
      messageContent: data.messageContent ?? "",
      createdAt: data.createdAt,
    });

    if (notionId) {
      await db.collection("chatFeedback").doc(feedbackId).update({ notionSideId: notionId });
      logger.info(`[onChatFeedbackCreated] Synkronisert ${feedbackId} → Notion ${notionId}`);
    }
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
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onTilbakemeldingCreated] Tomt snapshot — ignorerer");
      return;
    }

    const feedbackId = event.params.feedbackId;
    const data = snapshot.data();

    const notionId = await syncTilbakemeldingToNotion(feedbackId, {
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

    if (notionId) {
      await db.collection("feedback").doc(feedbackId).update({ notionSideId: notionId });
      logger.info(`[onTilbakemeldingCreated] Synkronisert ${feedbackId} → Notion ${notionId}`);
    }
  }
);

// ============================================================
// Backfill: HTTP-endepunkt for å synke eksisterende feedback
// ============================================================

/**
 * HTTP-trigger: backfill eksisterende feedback til Notion.
 * Itererer over feedback- og chatFeedback-samlingene og oppretter
 * Notion-sider for dokumenter som mangler notionSideId.
 *
 * Kall: GET/POST https://europe-west1-suksess-842ed.cloudfunctions.net/backfillFeedbackTilNotion
 */
export const backfillFeedbackTilNotion = onRequest(
  { region: FUNCTIONS_REGION, cors: true, timeoutSeconds: 300 },
  async (_req, res) => {
    const notionToken = process.env.NOTION_API_TOKEN;
    const notionDbId = process.env.NOTION_FEEDBACK_DB_ID;

    if (!notionToken || !notionDbId) {
      res.status(500).json({ error: "Mangler NOTION_API_TOKEN eller NOTION_FEEDBACK_DB_ID" });
      return;
    }

    const results: Array<{ id: string; collection: string; status: string; notionId?: string; error?: string }> = [];

    // --- Backfill feedback-samlingen ---
    try {
      const feedbackSnap = await db.collection("feedback").get();
      for (const doc of feedbackSnap.docs) {
        const data = doc.data();
        if (data.notionSideId) {
          results.push({ id: doc.id, collection: "feedback", status: "skipped", notionId: data.notionSideId as string });
          continue;
        }
        try {
          const notionId = await syncTilbakemeldingToNotion(doc.id, {
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
          if (notionId) {
            await db.collection("feedback").doc(doc.id).update({ notionSideId: notionId });
            results.push({ id: doc.id, collection: "feedback", status: "created", notionId });
          } else {
            results.push({ id: doc.id, collection: "feedback", status: "error", error: "Notion returnerte null" });
          }
        } catch (err: unknown) {
          results.push({ id: doc.id, collection: "feedback", status: "error", error: (err as Error).message });
        }
      }
    } catch (err) {
      logger.error("[backfill] Feil ved lesing av feedback-samlingen:", err);
    }

    // --- Backfill chatFeedback-samlingen ---
    try {
      const chatSnap = await db.collection("chatFeedback").get();
      for (const doc of chatSnap.docs) {
        const data = doc.data();
        if (data.notionSideId) {
          results.push({ id: doc.id, collection: "chatFeedback", status: "skipped", notionId: data.notionSideId as string });
          continue;
        }
        try {
          const notionId = await syncChatFeedbackToNotion(doc.id, {
            userId: data.userId ?? "",
            conversationId: data.conversationId ?? null,
            messageId: data.messageId ?? "",
            rating: data.rating ?? "thumbs_down",
            reason: data.reason ?? null,
            messageContent: data.messageContent ?? "",
            createdAt: data.createdAt,
          });
          if (notionId) {
            await db.collection("chatFeedback").doc(doc.id).update({ notionSideId: notionId });
            results.push({ id: doc.id, collection: "chatFeedback", status: "created", notionId });
          } else {
            results.push({ id: doc.id, collection: "chatFeedback", status: "error", error: "Notion returnerte null" });
          }
        } catch (err: unknown) {
          results.push({ id: doc.id, collection: "chatFeedback", status: "error", error: (err as Error).message });
        }
      }
    } catch (err) {
      logger.error("[backfill] Feil ved lesing av chatFeedback-samlingen:", err);
    }

    const summary = {
      total: results.length,
      skipped: results.filter(r => r.status === "skipped").length,
      created: results.filter(r => r.status === "created").length,
      errors: results.filter(r => r.status === "error").length,
      details: results,
    };
    logger.info("[backfillFeedbackTilNotion]", summary);
    res.json(summary);
  }
);
