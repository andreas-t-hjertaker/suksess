/**
 * Samtykke-handlers (#106, #166).
 *
 * Håndterer foresatt-samtykke verifisering via e-post-lenke.
 */

import * as admin from "firebase-admin";
import { fail, type RouteContext } from "../middleware";
import { db } from "../constants";

/** GET /consent/verify/:token — Verifiser foresatt-samtykke via e-post-lenke */
export async function verifyConsent({ req, res }: RouteContext): Promise<void> {
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
}
