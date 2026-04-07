import * as admin from "firebase-admin";
import { z } from "zod";
import { success, withAuth, withAdmin, withValidation, type RouteContext } from "../middleware";
import { db } from "../constants";

// ============================================================
// Zod-skjemaer
// ============================================================

export const createNoteSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(200),
  content: z.string().max(10000).optional().default(""),
});

// ============================================================
// Rute-handlers
// ============================================================

/** GET /collections — List Firestore-samlinger (kun admin) */
export const getCollections = withAdmin(async ({ res }) => {
  const collections = await db.listCollections();
  success(res, { collections: collections.map((c) => c.id) });
});

/** GET / — API-info (offentlig) */
export const getRoot = ({ res }: RouteContext) => {
  success(res, { message: "Suksess API", version: "1.0.0" });
};

/** GET /me — Brukerinfo (krever auth) */
export const getMe = withAuth(async ({ user, res }) => {
  success(res, {
    uid: user.uid,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
});

/** POST /notes — Opprett notat (krever auth + validering) */
export const createNote = withValidation(createNoteSchema, async ({ user, data, res }) => {
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
