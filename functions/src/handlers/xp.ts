import * as admin from "firebase-admin";
import { success, fail, withAuth, withRateLimit } from "../middleware";

const db = admin.firestore();

// ============================================================
// XP-system
// ============================================================

/** Gyldige XP-kildetyper med maksimalt antall poeng per handling */
export const XP_SOURCES: Record<string, number> = {
  profile_complete: 50,
  grade_added: 10,
  daily_login: 5,
  career_explored: 5,
  test_taken: 30,
  cv_downloaded: 20,
  job_applied: 25,
  coach_session: 15,
};

/** POST /xp/award — Tildel XP server-side (forhindrer klient-manipulasjon, rate-begrenset) */
export const awardXp = withRateLimit("api", async ({ user, req, res }) => {
  const { source, amount } = req.body as { source?: string; amount?: number };

  if (!source || !(source in XP_SOURCES)) {
    fail(res, `Ugyldig XP-kilde. Tillatte: ${Object.keys(XP_SOURCES).join(", ")}`);
    return;
  }

  const maxXp = XP_SOURCES[source];
  const xpToAward = Math.min(Math.max(1, Number(amount) || maxXp), maxXp);

  const userRef = db.collection("users").doc(user.uid);
  // Bruker samme sti som klient-hooken: users/{uid}/gamification/xp
  const xpRef = userRef.collection("gamification").doc("xp");

  const xpDoc = await xpRef.get();
  const currentXp = (xpDoc.data()?.totalXp as number) || 0;
  const newTotal = currentXp + xpToAward;

  await xpRef.set({
    totalXp: newTotal,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  success(res, { awarded: xpToAward, total: newTotal });
});

/** GET /xp — Hent brukerens XP-status */
export const getXp = withAuth(async ({ user, res }) => {
  const xpRef = db.collection("users").doc(user.uid).collection("gamification").doc("xp");
  const snap = await xpRef.get();

  success(res, {
    totalXp: (snap.data()?.totalXp as number) || 0,
    streak: (snap.data()?.streak as number) || 0,
    lastUpdated: snap.data()?.updatedAt ?? null,
  });
});
