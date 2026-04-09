/**
 * FINT-integrasjon (Issue #142)
 *
 * Henter skoledata fra FINT (Felles INTegrering) — Norges standard
 * for datadeling i utdanningssektoren.
 *
 * FINT leverer:
 * - Elevgrupper (klasser og basisgrupper)
 * - Elevfag (fagvalg per elev)
 * - Skoleorganisasjon (avdelinger, nivåer)
 *
 * API-dokumentasjon: https://informasjonsmodell.felleskomponent.no
 * Autentisering: OAuth2 client_credentials via FINT IdP
 *
 * Kjøres som Cloud Scheduler daglig kl 02:30 norsk tid.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { withAuth } from "../middleware";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

/** FINT Elevgruppe (basisgruppe / undervisningsgruppe) */
type FintElevgruppe = {
  systemId: { identifikatorverdi: string };
  navn: string;
  beskrivelse?: string;
  periode?: Array<{ start: string; slutt?: string }>;
  /** Relasjoner til elever */
  elevforhold?: Array<{ href: string }>;
  /** Relasjoner til undervisningsfag */
  fag?: Array<{ href: string }>;
  /** Relasjon til skole */
  skole?: Array<{ href: string }>;
};

/** FINT Undervisningsfag */
type FintFag = {
  systemId: { identifikatorverdi: string };
  navn: string;
  beskrivelse?: string;
  /** Grep-fagkode (kobles til UDIR) */
  grepreferanse?: Array<{ href: string }>;
};

/** FINT Skole */
type FintSkole = {
  systemId: { identifikatorverdi: string };
  navn: string;
  organisasjonsnummer?: { identifikatorverdi: string };
  kontaktinformasjon?: { epostadresse?: string };
};

/** OAuth2 token-respons */
type FintTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

// ---------------------------------------------------------------------------
// Firestore-dokumenttyper
// ---------------------------------------------------------------------------

type FintGroupDocument = {
  fintSystemId: string;
  name: string;
  description: string | null;
  tenantId: string;
  memberCount: number;
  members: FintGroupMember[];
  subjects: string[];
  schoolYear: string;
  lastSyncedAt: FirebaseFirestore.FieldValue;
};

type FintGroupMember = {
  fintElevId: string;
  name: string;
  email: string | null;
  firebaseUid: string | null;
};

type FintSubjectDocument = {
  fintSystemId: string;
  name: string;
  description: string | null;
  grepFagkode: string | null;
  tenantId: string;
  lastSyncedAt: FirebaseFirestore.FieldValue;
};

// ---------------------------------------------------------------------------
// FINT OAuth2 Client
// ---------------------------------------------------------------------------

/**
 * Hent OAuth2-token fra FINT IdP.
 * Bruker client_credentials flow.
 */
async function getFintAccessToken(tenantOrgNumber: string): Promise<string> {
  const clientId = process.env.FINT_CLIENT_ID;
  const clientSecret = process.env.FINT_CLIENT_SECRET;
  const idpUrl = process.env.FINT_IDP_URL || "https://idp.felleskomponent.no/nidp/oauth/nam/token";

  if (!clientId || !clientSecret) {
    throw new Error("Mangler FINT_CLIENT_ID eller FINT_CLIENT_SECRET");
  }

  const response = await fetch(idpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: `fint-client orgId:${tenantOrgNumber}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`FINT IdP feil: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as FintTokenResponse;
  return data.access_token;
}

// ---------------------------------------------------------------------------
// FINT API-klient
// ---------------------------------------------------------------------------

const FINT_BASE_URL = process.env.FINT_API_BASE_URL || "https://api.felleskomponent.no";

async function fintFetch<T>(path: string, token: string): Promise<T> {
  const url = `${FINT_BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "x-org-id": "fint.no",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`FINT API feil: ${response.status} — ${url}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Hent alle elevgrupper (basisgrupper) fra FINT.
 */
async function fetchElevgrupper(token: string): Promise<FintElevgruppe[]> {
  const data = await fintFetch<{ _embedded?: { _entries?: FintElevgruppe[] } }>(
    "/utdanning/elev/basisgruppe",
    token
  );
  return data._embedded?._entries ?? [];
}

/**
 * Hent alle undervisningsfag fra FINT.
 */
async function fetchFag(token: string): Promise<FintFag[]> {
  const data = await fintFetch<{ _embedded?: { _entries?: FintFag[] } }>(
    "/utdanning/timeplan/fag",
    token
  );
  return data._embedded?._entries ?? [];
}

/**
 * Hent skoleinfo fra FINT.
 */
async function fetchSkoler(token: string): Promise<FintSkole[]> {
  const data = await fintFetch<{ _embedded?: { _entries?: FintSkole[] } }>(
    "/utdanning/utdanningsprogram/skole",
    token
  );
  return data._embedded?._entries ?? [];
}

// ---------------------------------------------------------------------------
// Synkroniserings-logikk
// ---------------------------------------------------------------------------

/**
 * Synkroniser FINT-data for en tenant.
 * Returnerer antall synkroniserte grupper og fag.
 */
async function syncFintForTenant(
  tenantId: string,
  orgNumber: string
): Promise<{ groups: number; subjects: number; schools: number }> {
  console.info(`[fint] Starter synkronisering for tenant ${tenantId} (org: ${orgNumber})`);

  const token = await getFintAccessToken(orgNumber);

  // Hent data parallelt
  const [grupper, fag, skoler] = await Promise.all([
    fetchElevgrupper(token),
    fetchFag(token),
    fetchSkoler(token),
  ]);

  // --- Lagre elevgrupper ---
  let groupCount = 0;
  const batch = db.batch();

  for (const gruppe of grupper) {
    const systemId = gruppe.systemId.identifikatorverdi;
    const docId = `${tenantId}_${systemId}`;

    const members: FintGroupMember[] = [];
    const elevCount = gruppe.elevforhold?.length ?? 0;

    const groupDoc: FintGroupDocument = {
      fintSystemId: systemId,
      name: gruppe.navn,
      description: gruppe.beskrivelse ?? null,
      tenantId,
      memberCount: elevCount,
      members,
      subjects: (gruppe.fag ?? []).map((f) => {
        const parts = f.href.split("/");
        return parts[parts.length - 1];
      }),
      schoolYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(
      db.collection("fintGroups").doc(docId),
      groupDoc,
      { merge: true }
    );
    groupCount++;

    if (groupCount % 400 === 0) {
      await batch.commit();
    }
  }

  // --- Lagre fag ---
  let subjectCount = 0;

  for (const f of fag) {
    const systemId = f.systemId.identifikatorverdi;
    const docId = `${tenantId}_${systemId}`;

    // Trekk ut Grep-fagkode fra URL
    let grepFagkode: string | null = null;
    if (f.grepreferanse?.[0]?.href) {
      const parts = f.grepreferanse[0].href.split("/");
      grepFagkode = parts[parts.length - 1];
    }

    const subjectDoc: FintSubjectDocument = {
      fintSystemId: systemId,
      name: f.navn,
      description: f.beskrivelse ?? null,
      grepFagkode,
      tenantId,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(
      db.collection("fintSubjects").doc(docId),
      subjectDoc,
      { merge: true }
    );
    subjectCount++;

    if ((groupCount + subjectCount) % 400 === 0) {
      await batch.commit();
    }
  }

  // --- Lagre skoler ---
  let schoolCount = 0;

  for (const skole of skoler) {
    const systemId = skole.systemId.identifikatorverdi;
    const docId = `${tenantId}_${systemId}`;

    batch.set(
      db.collection("fintSchools").doc(docId),
      {
        fintSystemId: systemId,
        name: skole.navn,
        orgNumber: skole.organisasjonsnummer?.identifikatorverdi ?? null,
        email: skole.kontaktinformasjon?.epostadresse ?? null,
        tenantId,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    schoolCount++;
  }

  await batch.commit();

  console.info(
    `[fint] Synkronisert for ${tenantId}: ${groupCount} grupper, ${subjectCount} fag, ${schoolCount} skoler`
  );

  return { groups: groupCount, subjects: subjectCount, schools: schoolCount };
}

// ---------------------------------------------------------------------------
// Planlagt synkronisering (daglig 02:30)
// ---------------------------------------------------------------------------

export const ingestFintScheduled = onSchedule(
  {
    schedule: "30 0 * * *", // 02:30 Oslo (UTC+2)
    timeZone: "Europe/Oslo",
    region: "europe-west1",
  },
  async () => {
    console.info("[fint] Starter planlagt FINT-synkronisering...");

    // Hent alle aktive tenanter med FINT-integrasjon
    const tenantsSnap = await db
      .collection("tenants")
      .where("active", "==", true)
      .where("fintEnabled", "==", true)
      .get();

    if (tenantsSnap.empty) {
      console.info("[fint] Ingen tenanter med FINT aktivert");
      return;
    }

    const results: Record<string, { groups: number; subjects: number; schools: number }> = {};

    for (const tenantDoc of tenantsSnap.docs) {
      const data = tenantDoc.data();
      const orgNumber = data.orgNumber as string | undefined;

      if (!orgNumber) {
        console.warn(`[fint] Tenant ${tenantDoc.id} mangler orgNumber — hopper over`);
        continue;
      }

      try {
        results[tenantDoc.id] = await syncFintForTenant(tenantDoc.id, orgNumber);
      } catch (err) {
        console.error(`[fint] Feil for tenant ${tenantDoc.id}:`, err);
      }
    }

    console.info("[fint] Planlagt synkronisering ferdig:", results);
  }
);

// ---------------------------------------------------------------------------
// Manuell trigger (admin)
// ---------------------------------------------------------------------------

export const triggerFintSync = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const handler = withAuth(async ({ req: authReq, res: authRes, user }) => {
      // Verifiser admin-rolle
      if (user.role !== "admin" && user.role !== "superadmin") {
        authRes.status(403).json({ success: false, error: "Krever admin-rolle" });
        return;
      }

      const { tenantId, orgNumber } = authReq.body as {
        tenantId?: string;
        orgNumber?: string;
      };

      if (!tenantId || !orgNumber) {
        authRes.status(400).json({ success: false, error: "Mangler tenantId eller orgNumber" });
        return;
      }

      const result = await syncFintForTenant(tenantId, orgNumber);
      authRes.status(200).json({ success: true, data: result });
    });

    await handler({ req, res });
  }
);
