/**
 * API key handlers — list, create, revoke.
 */

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { success, fail, withAuth } from "../middleware";
import { extractPathParam } from "../utils/path";
import { API_KEY_TTL_DAYS } from "../constants";

// ============================================================
// API-nøkkel-handlers
// ============================================================

/** GET /api-keys — List brukerens API-nøkler */
export const listApiKeys = withAuth(async ({ user, res }) => {
  const db = admin.firestore();
  const snapshot = await db.collection("apiKeys")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get();

  const keys = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      prefix: data.prefix,
      createdAt: data.createdAt?.toDate() ?? null,
      lastUsedAt: data.lastUsedAt?.toDate() ?? null,
      expiresAt: data.expiresAt?.toDate() ?? null,
      revoked: data.revoked,
    };
  });

  success(res, keys);
});

/** POST /api-keys — Opprett ny API-nøkkel */
export const createApiKey = withAuth(async ({ user, req, res }) => {
  const db = admin.firestore();
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    fail(res, "Navn er påkrevd");
    return;
  }

  // Generer nøkkel
  const rawKey = crypto.randomBytes(32).toString("hex");
  const fullKey = `sk_live_${rawKey}`;
  const hashedKey = crypto.createHash("sha256").update(fullKey).digest("hex");
  const prefix = fullKey.substring(0, 16);

  const ttlMs = API_KEY_TTL_DAYS * 24 * 60 * 60 * 1000;

  const docRef = await db.collection("apiKeys").add({
    name: name.trim(),
    prefix,
    hashedKey,
    userId: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsedAt: null,
    expiresAt: new Date(Date.now() + ttlMs),
    revoked: false,
  });

  success(res, {
    key: fullKey,
    apiKey: {
      id: docRef.id,
      name: name.trim(),
      prefix,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + ttlMs),
      revoked: false,
    },
  }, 201);
});

/** DELETE /api-keys/:id — Tilbakekall en API-nøkkel */
export const revokeApiKey = withAuth(async ({ user, req, res }) => {
  const db = admin.firestore();
  const keyId = extractPathParam(req.path, "/api-keys/");

  if (!keyId) {
    fail(res, "Nøkkel-ID er påkrevd");
    return;
  }

  const keyDoc = await db.collection("apiKeys").doc(keyId).get();

  if (!keyDoc.exists) {
    fail(res, "API-nøkkel ikke funnet", 404);
    return;
  }

  // Sikre at nøkkelen tilhører brukeren
  if (keyDoc.data()?.userId !== user.uid) {
    fail(res, "Ikke autorisert", 403);
    return;
  }

  await keyDoc.ref.update({ revoked: true });
  success(res, { id: keyId, revoked: true });
});
