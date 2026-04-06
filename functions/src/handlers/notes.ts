/**
 * Notes handlers — create, list.
 */

import * as admin from "firebase-admin";
import { z } from "zod";
import { success, withAuth, withValidation } from "../middleware";

// ============================================================
// Zod-skjemaer
// ============================================================

export const createNoteSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  content: z.string().max(10000).optional().default(""),
});

// ============================================================
// Notes-handlers
// ============================================================

/** POST /notes — Opprett notat (krever auth + validering) */
export const createNote = withValidation(createNoteSchema, async ({ user, data, res }) => {
  const db = admin.firestore();
  const note = await db.collection("notes").add({
    ...data,
    userId: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { id: note.id, ...data }, 201);
});

/** GET /notes — Hent brukerens notater (krever auth) */
export const getNotes = withAuth(async ({ user, res }) => {
  const db = admin.firestore();
  const snapshot = await db
    .collection("notes")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const notes = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  success(res, notes);
});
