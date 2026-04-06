import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ALLOWED_ORIGINS, FUNCTIONS_REGION } from "./constants";
import { rateLimit, validateCsrf, fail } from "./middleware";
import { matchRoute } from "./router";

admin.initializeApp();

// Rate limiter-instans
const apiRateLimit = rateLimit(100, 60_000);

/**
 * Health check / API-status
 */
export const health = onRequest(
  { region: FUNCTIONS_REGION, cors: ALLOWED_ORIGINS },
  async (_req, res) => {
    const db = admin.firestore();
    const checks: Record<string, "connected" | "error"> = {
      firestore: "error",
      storage: "error",
      functions: "connected",
    };

    // Ekte Firestore-sjekk: les featureFlags-samlingen
    try {
      const snap = await db.collection("featureFlags").limit(1).get();
      checks.firestore = snap !== undefined ? "connected" : "error";
    } catch {
      checks.firestore = "error";
    }

    // Ekte Storage-sjekk: sjekk at bucket eksisterer
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
  { region: FUNCTIONS_REGION, cors: ALLOWED_ORIGINS, invoker: "public" },
  async (req, res) => {
    // Rate limiting
    if (!apiRateLimit({ req, res })) return;

    // CSRF-validering på muterende forespørsler (#139)
    if (!validateCsrf({ req, res })) return;

    // Match route (exact + parameterized)
    const handler = matchRoute(req.method, req.path);

    if (handler) {
      await handler({ req, res });
      return;
    }

    fail(res, "Ikke funnet", 404);
  }
);
