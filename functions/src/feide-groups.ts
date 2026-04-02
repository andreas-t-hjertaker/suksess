/**
 * Feide gruppe-synkronisering (#135).
 *
 * Synkroniserer elevgrupper fra Feide Groups API til Firestore.
 * Brukes av:
 * - Rådgivere: se klasser og grupper
 * - Skole-dashboard: filtrere per klasse
 * - Automatisk tildeling av elever til rådgivere
 *
 * Feide Groups API: https://docs.feide.no/reference/apis/groups_api/
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { withAuth } from "./middleware";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type FeideGroup = {
  id: string;
  displayName: string;
  type: "fc:org" | "fc:gogroup" | "fc:orgunit" | "fc:coursegroup" | string;
  /** Feide-org som eier gruppen */
  parent?: string;
  membership: {
    basic: "member" | "admin" | "owner";
  };
};

type FeideGroupMember = {
  userid_sec: string[];
  name: string;
  email?: string;
};

type SyncedGroup = {
  feideGroupId: string;
  displayName: string;
  type: string;
  tenantId: string;
  memberCount: number;
  members: {
    feideId: string;
    name: string;
    email: string | null;
    firebaseUid: string | null;
    role: "student" | "teacher";
  }[];
  lastSyncedAt: FirebaseFirestore.FieldValue;
};

// ---------------------------------------------------------------------------
// Feide API-klient
// ---------------------------------------------------------------------------

const FEIDE_GROUPS_API = "https://groups-api.dataporten.no";

/**
 * Hent brukerens grupper fra Feide Groups API.
 */
async function fetchFeideGroups(accessToken: string): Promise<FeideGroup[]> {
  const response = await fetch(`${FEIDE_GROUPS_API}/groups/me/groups`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Feide Groups API feil: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<FeideGroup[]>;
}

/**
 * Hent medlemmer av en spesifikk Feide-gruppe.
 */
async function fetchGroupMembers(
  accessToken: string,
  groupId: string
): Promise<FeideGroupMember[]> {
  const response = await fetch(`${FEIDE_GROUPS_API}/groups/${encodeURIComponent(groupId)}/members`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    // 403 betyr at tokenet ikke har tilgang til gruppemedlemmer
    if (response.status === 403) return [];
    throw new Error(`Feide Members API feil: ${response.status}`);
  }

  return response.json() as Promise<FeideGroupMember[]>;
}

/**
 * Finn Firebase UID for en Feide-bruker via e-post.
 */
async function findFirebaseUid(feideId: string): Promise<string | null> {
  // Søk i users-samlingen etter feideId
  const snap = await db
    .collection("users")
    .where("feideId", "==", feideId)
    .limit(1)
    .get();

  if (!snap.empty) return snap.docs[0].id;

  // Fallback: søk via e-post
  try {
    const userRecord = await admin.auth().getUserByEmail(feideId);
    return userRecord.uid;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Synkroniserings-logikk
// ---------------------------------------------------------------------------

/**
 * Synkroniser grupper for en gitt tenant.
 * Henter grupper og medlemmer fra Feide, oppdaterer Firestore.
 */
async function syncGroupsForTenant(
  tenantId: string,
  accessToken: string
): Promise<{ groupsSynced: number; membersSynced: number }> {
  const groups = await fetchFeideGroups(accessToken);

  // Filtrer relevante grupper (klasser og kursgrupper)
  const relevantGroups = groups.filter(
    (g) =>
      g.type === "fc:gogroup" || // Grunnopplæring-grupper (klasser)
      g.type === "fc:coursegroup" || // Kursgrupper
      g.type === "fc:orgunit" // Organisasjonsenheter (avdelinger)
  );

  let totalMembers = 0;

  for (const group of relevantGroups) {
    const members = await fetchGroupMembers(accessToken, group.id);

    const syncedMembers = await Promise.all(
      members.map(async (m) => {
        const feideId = m.userid_sec?.find((id) => id.startsWith("feide:"))?.replace("feide:", "") || "";
        const firebaseUid = feideId ? await findFirebaseUid(feideId) : null;

        return {
          feideId,
          name: m.name || "",
          email: m.email || null,
          firebaseUid,
          role: "student" as const,
        };
      })
    );

    totalMembers += syncedMembers.length;

    // Lagre/oppdater gruppen i Firestore
    const groupDocId = Buffer.from(group.id).toString("base64url").slice(0, 40);
    const groupData: SyncedGroup = {
      feideGroupId: group.id,
      displayName: group.displayName,
      type: group.type,
      tenantId,
      memberCount: syncedMembers.length,
      members: syncedMembers,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .collection("tenants")
      .doc(tenantId)
      .collection("groups")
      .doc(groupDocId)
      .set(groupData, { merge: true });
  }

  // Logg synkroniseringen
  await db.collection("tenants").doc(tenantId).update({
    lastGroupSync: admin.firestore.FieldValue.serverTimestamp(),
    groupCount: relevantGroups.length,
  });

  return { groupsSynced: relevantGroups.length, membersSynced: totalMembers };
}

// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------

/**
 * POST /feide/sync-groups — Manuell synkronisering av Feide-grupper.
 * Krever autentisert bruker med admin/counselor-rolle i tenant.
 */
export const feideSyncGroups = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const handler = withAuth(async ({ user, req: authReq, res: authRes }) => {
      const { tenantId, feideAccessToken } = authReq.body as {
        tenantId?: string;
        feideAccessToken?: string;
      };

      if (!tenantId) {
        authRes.status(400).json({ success: false, error: "tenantId er påkrevd" });
        return;
      }

      // Verifiser at brukeren har tilgang til tenanten
      const userRecord = await admin.auth().getUser(user.uid);
      const claims = userRecord.customClaims as Record<string, unknown> | undefined;
      const userTenantId = claims?.tenantId as string | undefined;
      const userRole = claims?.role as string | undefined;

      if (userTenantId !== tenantId && userRole !== "superadmin") {
        authRes.status(403).json({ success: false, error: "Ikke autorisert for denne tenanten" });
        return;
      }

      if (!["admin", "counselor", "superadmin"].includes(userRole || "")) {
        authRes.status(403).json({ success: false, error: "Kun admin/rådgivere kan synkronisere grupper" });
        return;
      }

      // Bruk enten medfølgende token eller hent fra tenant-konfig
      const token =
        feideAccessToken ||
        (await db.collection("tenants").doc(tenantId).get()).data()?.feideAccessToken;

      if (!token) {
        authRes.status(400).json({
          success: false,
          error: "Feide access token mangler. Logg inn med Feide først.",
        });
        return;
      }

      try {
        const result = await syncGroupsForTenant(tenantId, token);
        authRes.status(200).json({ success: true, data: result });
      } catch (err) {
        console.error("[feide-groups] Synkronisering feilet:", err);
        authRes.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : "Ukjent feil",
        });
      }
    });

    await handler({ req, res });
  }
);

/**
 * Planlagt synkronisering — kjøres hver natt kl. 02:00 CET.
 * Synkroniserer grupper for alle aktive tenanter med Feide-integrasjon.
 */
export const scheduledFeideGroupSync = onSchedule(
  {
    schedule: "0 2 * * *", // Daglig kl. 02:00
    region: "europe-west1",
    timeZone: "Europe/Oslo",
  },
  async () => {
    console.info("[feide-groups] Starter planlagt synkronisering");

    // Hent alle aktive tenanter med Feide-konfigurasjon
    const tenantsSnap = await db
      .collection("tenants")
      .where("active", "==", true)
      .where("feideOrgId", "!=", null)
      .get();

    let totalSynced = 0;
    let errors = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const data = tenantDoc.data();
      const token = data.feideAccessToken;

      if (!token) {
        console.warn(`[feide-groups] Tenant ${tenantDoc.id} mangler access token, hopper over`);
        continue;
      }

      try {
        const result = await syncGroupsForTenant(tenantDoc.id, token);
        totalSynced += result.groupsSynced;
        console.info(
          `[feide-groups] Synkroniserte ${result.groupsSynced} grupper, ${result.membersSynced} medlemmer for ${tenantDoc.id}`
        );
      } catch (err) {
        errors++;
        console.error(`[feide-groups] Feil for tenant ${tenantDoc.id}:`, err);
      }
    }

    console.info(
      `[feide-groups] Synkronisering fullført: ${totalSynced} grupper, ${errors} feil`
    );
  }
);
