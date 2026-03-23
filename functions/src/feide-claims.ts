/**
 * Feide OIDC Custom Claims Handler (Issue #2)
 *
 * Kjøres som Firebase Auth onCreate-trigger (Cloud Functions Gen 2).
 * Henter Feide eduPersonOrgDN og eduPersonAffiliation fra OIDC-claims
 * og setter Firebase custom claims:
 *
 *   - tenantId: feide-org-ID (f.eks. "uio.no" fra eduPersonPrincipalName)
 *   - role: "student" | "counselor" | "admin"
 *   - feideId: brukerens eduPersonPrincipalName
 *
 * Brukes av:
 *   - Firestore Security Rules (isSameTenant())
 *   - withTenant() middleware i Cloud Functions
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { withAuth } from "./middleware";

const auth = admin.auth();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Feide-klaim typer (fra OIDC userinfo endpoint)
// ---------------------------------------------------------------------------

type FeideClaims = {
  /** f.eks. "fornavn.etternavn@uio.no" */
  eduPersonPrincipalName?: string;
  /** f.eks. ["member", "student"] eller ["staff", "faculty"] */
  eduPersonAffiliation?: string[];
  /** f.eks. "cn=uio.no,ou=higher education,o=feide,c=no" */
  eduPersonOrgDN?: string;
  /** Organisasjonsnavn */
  organizationName?: string;
  /** Feide-org-ID (FEIDE-nummer) */
  feideOrg?: string;
  /** Gruppe-tilknytning (kan inkludere rådgiver-gruppe) */
  isMemberOf?: string[];
};

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/**
 * Ekstraher tenantId fra Feide eduPersonPrincipalName.
 * f.eks. "ola.normann@akershus-vgs.no" → "akershus-vgs.no"
 *
 * Fallback til eduPersonOrgDN om tilgjengelig.
 */
function extractTenantId(claims: FeideClaims): string | null {
  // Prøv eduPersonPrincipalName (e-post format)
  const eppn = claims.eduPersonPrincipalName;
  if (eppn && eppn.includes("@")) {
    return eppn.split("@")[1].toLowerCase();
  }

  // Prøv feideOrg
  if (claims.feideOrg) {
    return claims.feideOrg.toLowerCase();
  }

  // Prøv eduPersonOrgDN (LDAP-format)
  const orgDN = claims.eduPersonOrgDN;
  if (orgDN) {
    const match = orgDN.match(/cn=([^,]+)/i);
    if (match) return match[1].toLowerCase();
  }

  return null;
}

/**
 * Bestem brukerrolle fra Feide eduPersonAffiliation.
 *
 * Mapping:
 *   - "staff" / "faculty" / "employee" → "counselor"
 *   - "student" → "student"
 *   - Andre → "student" (minste-privilegium prinsipp)
 */
function extractRole(
  claims: FeideClaims
): "student" | "counselor" {
  const affiliations = claims.eduPersonAffiliation ?? [];

  const isCounselor = affiliations.some((a) =>
    ["staff", "faculty", "employee"].includes(a.toLowerCase())
  );

  // Sjekk gruppe-tilknytning for eksplisitt rådgiver-gruppe
  const memberOf = claims.isMemberOf ?? [];
  const inCounselorGroup = memberOf.some((g) =>
    g.toLowerCase().includes("rådgiver") ||
    g.toLowerCase().includes("counselor") ||
    g.toLowerCase().includes("guidance")
  );

  return isCounselor || inCounselorGroup ? "counselor" : "student";
}

// ---------------------------------------------------------------------------
// Cloud Function: Sett custom claims etter Feide-innlogging
// ---------------------------------------------------------------------------

/**
 * HTTP-endepunkt som lar klienten trigge custom claim-oppdatering
 * etter en vellykket Feide OIDC-redirect.
 *
 * POST /feide-set-claims
 * Authorization: Bearer <firebase-id-token>
 * Body: { feideClaims: FeideClaims }
 */
export const feideSetClaims = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const handler = withAuth(async ({ user, req: authReq, res: authRes }) => {
      const body = authReq.body as { feideClaims?: FeideClaims };
      const feideClaims = body?.feideClaims ?? {};

      const tenantId = extractTenantId(feideClaims);
      const role = extractRole(feideClaims);
      const feideId = feideClaims.eduPersonPrincipalName ?? null;

      // Sett custom claims i Firebase Auth
      await auth.setCustomUserClaims(user.uid, {
        tenantId,
        role,
        feideId,
      });

      // Oppdater brukerdokument i Firestore
      const userRef = db.collection("users").doc(user.uid);
      const existing = await userRef.get();

      const updateData: Record<string, unknown> = {
        tenantId,
        role,
        feideId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!existing.exists) {
        // Opprett brukerdokument for ny bruker
        await userRef.set({
          ...updateData,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          bigFiveCompleted: false,
          riasecCompleted: false,
          programfagSelected: false,
          clusterId: null,
          riskLevel: null,
          riskScore: null,
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          onboardingCompleted: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await userRef.update({
          ...updateData,
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Logg til consentAudit for sporbarhet
      if (!existing.exists) {
        await db.collection("consentAudit").add({
          userId: user.uid,
          tenantId,
          action: "user_created_feide",
          category: null,
          previousValue: null,
          newValue: null,
          ipAddress: req.ip ? req.ip.split(".").slice(0, 3).join(".") + ".0" : null,
          userAgent: req.headers["user-agent"] ?? null,
          consentVersion: "2026-03-01",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      authRes.status(200).json({
        success: true,
        data: { tenantId, role, feideId },
      });
    });

    await handler({ req, res });
  }
);

// ---------------------------------------------------------------------------
// Cloud Function: Firestore trigger ved opprettelse av user-dokument
// ---------------------------------------------------------------------------

/**
 * Trigger som kjøres når et nytt brukerdokument opprettes.
 * Sender velkomstnotifikasjon og oppretter gamification-dokument.
 */
export const onUserCreated = onDocumentCreated(
  { document: "users/{userId}", region: "europe-west1" },
  async (event) => {
    const userId = event.params.userId;
    const userData = event.data?.data();
    if (!userData) return;

    // Opprett gamification-startdokument
    await db.doc(`users/${userId}/gamification/xp`).set({
      totalXp: 0,
      earnedAchievements: [],
      streak: 0,
      lastLoginDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send velkomstnotifikasjon
    await db.collection(`users/${userId}/notifications`).add({
      type: "system",
      title: "Velkommen til Suksess! 🎉",
      body: "Start med å fullføre personlighets- og interessetesten for å få personaliserte anbefalinger.",
      read: false,
      link: "/dashboard",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.info(`Ny bruker opprettet: ${userId}, rolle: ${userData.role}, tenant: ${userData.tenantId}`);
  }
);
