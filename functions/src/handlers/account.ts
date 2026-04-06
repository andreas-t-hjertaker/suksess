/**
 * Account handlers — delete account, subcollection helper.
 */

import * as admin from "firebase-admin";
import type { DocumentReference } from "firebase-admin/firestore";
import { success, withAuth } from "../middleware";

// ============================================================
// Konto-sletting
// ============================================================

/** Hjelpefunksjon: slett en hel subcollection */
export async function deleteSubcollection(parentRef: DocumentReference, subcollectionName: string) {
  const db = admin.firestore();
  const snap = await parentRef.collection(subcollectionName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/** DELETE /account — Slett alt brukerdata fra Firestore (GDPR-rett til sletting) */
export const deleteAccount = withAuth(async ({ user, res }) => {
  const db = admin.firestore();
  const uid = user.uid;
  const userRef = db.collection("users").doc(uid);

  // Slett subcollections under users/{uid}
  const subcollections = [
    "personalityProfile",
    "grades",
    "xp",
    "achievements",
    "notifications",
    "aiCache",
    "documents",
    "soknader",
  ];

  await Promise.all(subcollections.map((s) => deleteSubcollection(userRef, s)));

  // Slett bruker-dokumentet selv
  const batch = db.batch();
  batch.delete(userRef);

  // Slett abonnement og API-nøkler
  batch.delete(db.collection("subscriptions").doc(uid));

  const keysSnap = await db.collection("apiKeys").where("userId", "==", uid).get();
  keysSnap.docs.forEach((d) => batch.delete(d.ref));

  const notesSnap = await db.collection("notes").where("userId", "==", uid).get();
  notesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  success(res, { deleted: true });
});
