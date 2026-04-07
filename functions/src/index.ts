import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { fail, rateLimit, validateCsrf } from "./middleware";
import { routes } from "./router";

// Handler-imports for parametriserte ruter
import { revokeApiKey } from "./handlers/api-keys";
import { getAdminUser, disableAdminUser, deleteAdminUser, updateFeatureFlag } from "./handlers/admin";
import { setSchoolUserRole, disableSchoolUser, deleteSchoolUser } from "./handlers/school-admin";

admin.initializeApp();

const db = admin.firestore();

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

// ============================================================
// HTTP Functions
// ============================================================

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

    // Sti-parameter-matching: DELETE /api-keys/:id
    if (req.method === "DELETE" && req.path.startsWith("/api-keys/")) {
      await revokeApiKey({ req, res });
      return;
    }

    // Admin bruker-ruter: GET/DELETE /admin/users/:uid, POST /admin/users/:uid/disable
    if (req.path.startsWith("/admin/users/")) {
      if (req.method === "GET" && !req.path.endsWith("/disable")) {
        await getAdminUser({ req, res });
        return;
      }
      if (req.method === "POST" && req.path.endsWith("/disable")) {
        await disableAdminUser({ req, res });
        return;
      }
      if (req.method === "DELETE") {
        await deleteAdminUser({ req, res });
        return;
      }
    }

    // Samtykke-verifisering: GET /consent/verify/:token (#106)
    if (req.method === "GET" && req.path.startsWith("/consent/verify/")) {
      const token = req.path.split("/consent/verify/")[1];
      if (!token) {
        fail(res, "Token mangler", 400);
        return;
      }

      const tokenRef = db.collection("parentConsentTokens").doc(token);
      const tokenDoc = await tokenRef.get();

      if (!tokenDoc.exists) {
        fail(res, "Ugyldig token", 404);
        return;
      }

      const tokenData = tokenDoc.data()!;

      // Sjekk om allerede brukt
      if (tokenData.used) {
        fail(res, "Token er allerede brukt", 400);
        return;
      }

      // Sjekk utløp
      const expiresAt = tokenData.expiresAt?.toDate?.() || tokenData.expiresAt;
      if (new Date() > new Date(expiresAt)) {
        res.status(410).json({ error: "Token har utløpt" });
        return;
      }

      // Godkjenn samtykke
      const studentUid = tokenData.studentUid;

      await db.doc(`users/${studentUid}/consent/parental`).set({
        parentalConsentGiven: true,
        parentEmail: tokenData.parentEmail,
        consentedAt: admin.firestore.FieldValue.serverTimestamp(),
        token,
      });

      // Marker token som brukt
      await tokenRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Logg i consentAudit
      await db.collection("consentAudit").add({
        type: "consent_given",
        parentUid: tokenData.parentEmail,
        studentUid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: "server",
        metadata: { method: "email_link" },
      });

      // Hent elevnavn for respons
      const studentDoc = await db.doc(`users/${studentUid}`).get();
      const studentName = studentDoc.data()?.displayName || null;

      res.json({ success: true, studentName });
      return;
    }

    // Admin feature-flag-ruter: PUT /admin/feature-flags/:id
    if (req.method === "PUT" && req.path.startsWith("/admin/feature-flags/")) {
      await updateFeatureFlag({ req, res });
      return;
    }

    // School-admin bruker-ruter: POST /school-admin/users/:uid/role, /disable, DELETE /school-admin/users/:uid
    if (req.path.startsWith("/school-admin/users/") && req.path !== "/school-admin/users/bulk-import") {
      if (req.method === "POST" && req.path.endsWith("/role")) {
        await setSchoolUserRole({ req, res });
        return;
      }
      if (req.method === "POST" && req.path.endsWith("/disable")) {
        await disableSchoolUser({ req, res });
        return;
      }
      if (req.method === "DELETE") {
        await deleteSchoolUser({ req, res });
        return;
      }
    }

    fail(res, "Ikke funnet", 404);
  }
);
