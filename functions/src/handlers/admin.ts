import * as admin from "firebase-admin";
import { success, fail, withAdmin, type RouteContext } from "../middleware";
import { deleteSubcollection } from "./account";
import { db } from "../constants";

// ============================================================
// Admin-handlers
// ============================================================

/** POST /admin/set-role — Sett rolle og tenant på en bruker */
export const setAdminRole = withAdmin(async ({ req, res }) => {
  const { uid, role, tenantId, admin: isAdmin } = req.body as {
    uid?: string;
    role?: string;
    tenantId?: string;
    admin?: boolean;
  };

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  // Støtte for både nytt rolle-system og gammelt admin-bool
  const existingUser = await admin.auth().getUser(uid);
  const existingClaims = (existingUser.customClaims as Record<string, unknown>) || {};

  const newClaims: Record<string, unknown> = { ...existingClaims };

  if (role !== undefined) {
    const validRoles = ["student", "counselor", "admin", "superadmin"];
    if (!validRoles.includes(role)) {
      fail(res, `Ugyldig rolle. Tillatte verdier: ${validRoles.join(", ")}`);
      return;
    }
    newClaims.role = role;
    newClaims.admin = ["admin", "superadmin"].includes(role);
  } else if (isAdmin !== undefined) {
    // Bakoverkompatibel boolean-admin-flag
    newClaims.admin = !!isAdmin;
    newClaims.role = isAdmin ? "admin" : "student";
  }

  if (tenantId !== undefined) {
    newClaims.tenantId = tenantId || null;
  }

  await admin.auth().setCustomUserClaims(uid, newClaims);
  success(res, { uid, ...newClaims });
});

/** GET /admin/users — List alle brukere */
export const listAdminUsers = withAdmin(async ({ req, res }) => {
  const pageToken = req.query.pageToken as string | undefined;
  const result = await admin.auth().listUsers(100, pageToken || undefined);

  const users = result.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    disabled: u.disabled,
    creationTime: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime,
    customClaims: u.customClaims ?? {},
  }));

  success(res, { users, pageToken: result.pageToken ?? null });
});

/** GET /admin/users/:uid — Hent brukerdetaljer med abonnement og API-nøkler */
export const getAdminUser = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  const uid = parts[parts.length - 1];

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    const subDoc = await db.collection("subscriptions").doc(uid).get();
    const keysSnap = await db.collection("apiKeys")
      .where("userId", "==", uid)
      .get();

    success(res, {
      user: {
        uid: userRecord.uid,
        email: userRecord.email ?? null,
        displayName: userRecord.displayName ?? null,
        photoURL: userRecord.photoURL ?? null,
        disabled: userRecord.disabled,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        customClaims: userRecord.customClaims ?? {},
      },
      subscription: subDoc.exists ? subDoc.data() : null,
      apiKeyCount: keysSnap.size,
    });
  } catch {
    fail(res, "Bruker ikke funnet", 404);
  }
});

/** POST /admin/users/:uid/disable — Aktiver/deaktiver bruker */
export const disableAdminUser = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  // Sti: /admin/users/:uid/disable — uid er nest siste
  const uid = parts[parts.length - 2];
  const { disabled } = req.body as { disabled?: boolean };

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  await admin.auth().updateUser(uid, { disabled: !!disabled });
  success(res, { uid, disabled: !!disabled });
});

/** DELETE /admin/users/:uid — Slett bruker og all data (kun superadmin) */
export const deleteAdminUser = withAdmin(async ({ user, req, res }) => {
  // Kun superadmin kan slette brukere
  const callerRecord = await admin.auth().getUser(user.uid);
  const callerRole = callerRecord.customClaims?.role;
  if (callerRole !== "superadmin") {
    fail(res, "Kun superadmin kan slette brukere", 403);
    return;
  }

  const parts = req.path.split("/");
  const uid = parts[parts.length - 1];

  if (!uid) {
    fail(res, "uid er påkrevd");
    return;
  }

  // Forhindre at man sletter seg selv
  if (uid === user.uid) {
    fail(res, "Du kan ikke slette din egen konto via admin", 400);
    return;
  }

  // Slett Suksess subcollections
  const userRef = db.collection("users").doc(uid);
  const subcollections = [
    "personalityProfile", "grades", "xp", "achievements",
    "notifications", "aiCache", "documents", "soknader",
  ];
  await Promise.all(subcollections.map((s) => deleteSubcollection(userRef, s)));

  // Slett Firestore toppnivå-data
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.collection("subscriptions").doc(uid));

  const keysSnap = await db.collection("apiKeys").where("userId", "==", uid).get();
  keysSnap.docs.forEach((d) => batch.delete(d.ref));

  const notesSnap = await db.collection("notes").where("userId", "==", uid).get();
  notesSnap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();

  // Slett Firebase Auth-bruker
  await admin.auth().deleteUser(uid);

  success(res, { uid, deleted: true });
});

/** GET /admin/stats — Aggregerte statistikker */
export const getAdminStats = withAdmin(async ({ res }) => {
  const [usersResult, subsSnap, keysSnap] = await Promise.all([
    admin.auth().listUsers(1000),
    db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("apiKeys").where("revoked", "==", false).get(),
  ]);

  success(res, {
    totalUsers: usersResult.users.length,
    activeSubscriptions: subsSnap.size,
    totalApiKeys: keysSnap.size,
  });
});

/** GET /admin/feature-flags — List alle feature flags (offentlig) */
export const listFeatureFlags = async ({ res }: RouteContext) => {
  const snap = await db.collection("featureFlags").orderBy("createdAt", "desc").get();
  const flags = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  success(res, flags);
};

/** POST /admin/feature-flags — Opprett ny feature flag */
export const createFeatureFlag = withAdmin(async ({ req, res }) => {
  const { key, label, description, enabled, plans, tenantIds, excludedTenantIds, rolloutPercentage } = req.body as {
    key?: string; label?: string; description?: string; enabled?: boolean; plans?: string[];
    tenantIds?: string[]; excludedTenantIds?: string[]; rolloutPercentage?: number;
  };

  if (!key || !label) {
    fail(res, "key og label er påkrevd");
    return;
  }

  const docRef = await db.collection("featureFlags").add({
    key,
    label,
    description: description || "",
    enabled: !!enabled,
    plans: plans || [],
    tenantIds: tenantIds || [],
    excludedTenantIds: excludedTenantIds || [],
    rolloutPercentage: typeof rolloutPercentage === "number" ? Math.max(0, Math.min(100, rolloutPercentage)) : 100,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  success(res, { id: docRef.id, key, label }, 201);
});

/** PUT /admin/feature-flags/:id — Oppdater en feature flag */
export const updateFeatureFlag = withAdmin(async ({ req, res }) => {
  const parts = req.path.split("/");
  const flagId = parts[parts.length - 1];

  if (!flagId) {
    fail(res, "Flag-ID er påkrevd");
    return;
  }

  const docRef = db.collection("featureFlags").doc(flagId);
  const doc = await docRef.get();
  if (!doc.exists) {
    fail(res, "Feature flag ikke funnet", 404);
    return;
  }

  const { key, label, description, enabled, plans, tenantIds, excludedTenantIds, rolloutPercentage } = req.body as {
    key?: string; label?: string; description?: string; enabled?: boolean; plans?: string[];
    tenantIds?: string[]; excludedTenantIds?: string[]; rolloutPercentage?: number;
  };

  const updates: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (key !== undefined) updates.key = key;
  if (label !== undefined) updates.label = label;
  if (description !== undefined) updates.description = description;
  if (enabled !== undefined) updates.enabled = enabled;
  if (plans !== undefined) updates.plans = plans;
  if (tenantIds !== undefined) updates.tenantIds = tenantIds;
  if (excludedTenantIds !== undefined) updates.excludedTenantIds = excludedTenantIds;
  if (rolloutPercentage !== undefined) updates.rolloutPercentage = Math.max(0, Math.min(100, rolloutPercentage));

  await docRef.update(updates);
  success(res, { id: flagId, ...updates });
});
