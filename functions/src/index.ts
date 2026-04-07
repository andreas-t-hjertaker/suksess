import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { fail, rateLimit, validateCsrf } from "./middleware";
import { db } from "./constants";
import { routes, findParamRoute } from "./router";

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
