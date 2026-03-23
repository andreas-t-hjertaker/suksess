/**
 * Admin Dashboard Backend — aggregerte statistikker (Issue #45)
 *
 * Cloud Functions som beregner og serverer dashbord-data for
 * skolens rådgivere og administratorer. All data er anonymisert —
 * individuelle profiler er aldri synlige uten eksplisitt samtykke.
 */

import * as admin from "firebase-admin";
import { withTenant } from "./middleware";
import type { RouteContext } from "./middleware";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type SchoolStats = {
  tenantId: string;
  generatedAt: string;
  /** Totalt antall elever i tenant */
  totalStudents: number;
  /** Elever aktive siste 7 dager */
  activeStudents7d: number;
  /** Andel som har fullført personlighetstest */
  personalityTestCompletionRate: number;
  /** Andel som har valgt programfag */
  programfagSelectionRate: number;
  /** Gjennomsnittlig karaktersnitt for tenanten */
  avgGradeAverage: number | null;
  /** Fordeling av RIASEC-toppkoder (anonymisert) */
  riasecDistribution: Record<string, number>;
  /** Fordeling av klynger (K-means personas) */
  clusterDistribution: Record<string, number>;
  /** Populære karriereveier (topp 10) */
  topCareerPaths: Array<{ id: string; count: number }>;
  /** AI-chat statistikk */
  aiChatStats: {
    totalConversations: number;
    avgMessagesPerConversation: number;
  };
  /** LLM-kostnad siste 30 dager (NOK) */
  llmCostLast30Days: number;
  /** Frafallsrisiko-oversikt */
  dropoutRiskOverview: {
    high: number;
    medium: number;
    low: number;
  };
};

// ---------------------------------------------------------------------------
// Aggregeringsfunksjoner
// ---------------------------------------------------------------------------

async function getStudentsInTenant(tenantId: string): Promise<string[]> {
  const snap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .select() // Kun IDs
    .get();
  return snap.docs.map((d) => d.id);
}

async function calcRiasecDistribution(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const dist: Record<string, number> = {};

  // Batch i grupper av 10 for å unngå Firestore-limits
  const batches = [];
  for (let i = 0; i < userIds.length; i += 10) {
    batches.push(userIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const snaps = await Promise.all(
      batch.map((uid) => db.collection("users").doc(uid).collection("profile").doc("riasec").get())
    );
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data()!;
      // Finn toppkode
      const topCode = Object.entries(data as Record<string, number>)
        .sort(([, a], [, b]) => b - a)[0]?.[0]?.charAt(0).toUpperCase();
      if (topCode) dist[topCode] = (dist[topCode] ?? 0) + 1;
    }
  }

  return dist;
}

async function calcLlmCost(tenantId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snap = await db.collection("llmLogs")
    .where("tenantId", "==", tenantId)
    .where("createdAt", ">=", thirtyDaysAgo)
    .get();

  return snap.docs.reduce((sum, d) => sum + ((d.data().costNok as number) || 0), 0);
}

/**
 * Beregn gjennomsnittlig karaktersnitt for tenant-elever.
 * Henter `gradeAverage` fra users-dokumentet (denormalisert felt).
 * Faller tilbake til null dersom ingen elever har lagret karaktersnitt.
 */
async function calcAvgGradeAverage(tenantId: string): Promise<number | null> {
  const snap = await db.collection("users")
    .where("tenantId", "==", tenantId)
    .where("gradeAverage", ">", 0)
    .select("gradeAverage")
    .get();

  if (snap.empty) return null;

  const sum = snap.docs.reduce(
    (acc, d) => acc + ((d.data().gradeAverage as number) || 0), 0
  );
  return Math.round((sum / snap.size) * 100) / 100;
}

/**
 * Aggreger topp karriereveier basert på `topCareers` felt på brukerdokumenter.
 * Feltet settes av karrieregraf-siden (career_path_viewed XP-event).
 */
async function calcTopCareerPaths(userIds: string[]): Promise<Array<{ id: string; count: number }>> {
  if (userIds.length === 0) return [];

  const freq: Record<string, number> = {};
  const batches: string[][] = [];
  for (let i = 0; i < userIds.length; i += 10) {
    batches.push(userIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const snaps = await Promise.all(
      batch.map((uid) =>
        db.collection("users").doc(uid).collection("jobbmatch").get()
      )
    );
    for (const snap of snaps) {
      for (const d of snap.docs) {
        const careerId = d.data().careerId as string | undefined;
        if (careerId) freq[careerId] = (freq[careerId] ?? 0) + 1;
      }
    }
  }

  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));
}

async function calcDropoutRisk(userIds: string[]): Promise<{ high: number; medium: number; low: number }> {
  const result = { high: 0, medium: 0, low: 0 };
  if (userIds.length === 0) return result;

  const batches = [];
  for (let i = 0; i < userIds.length; i += 10) {
    batches.push(userIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const snaps = await Promise.all(
      batch.map((uid) => db.collection("users").doc(uid).collection("riskScores").doc("dropout").get())
    );
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const level = snap.data()?.level as string;
      if (level === "high") result.high++;
      else if (level === "medium") result.medium++;
      else result.low++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const getSchoolStats = withTenant(async ({ tenantId, user, res }) => {
  // Superadmin kan se alle tenanter, rådgiver kun sin egen
  const effectiveTenantId = tenantId ?? (user.tenantId as string | null);
  if (!effectiveTenantId) {
    (res as import("express").Response).status(403).json({ success: false, error: "Ingen tenant-tilknytning" });
    return;
  }

  const userIds = await getStudentsInTenant(effectiveTenantId);
  const totalStudents = userIds.length;

  // Aktive siste 7 dager
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeSnap = await db.collection("users")
    .where("tenantId", "==", effectiveTenantId)
    .where("lastLoginAt", ">=", sevenDaysAgo)
    .select()
    .get();
  const activeStudents7d = activeSnap.size;

  // Fullføringsgrad personlighetstest
  const testSnap = await db.collection("users")
    .where("tenantId", "==", effectiveTenantId)
    .where("bigFiveCompleted", "==", true)
    .select()
    .get();
  const personalityTestCompletionRate = totalStudents > 0
    ? testSnap.size / totalStudents
    : 0;

  // Programfag-valg
  const pfSnap = await db.collection("users")
    .where("tenantId", "==", effectiveTenantId)
    .where("programfagSelected", "==", true)
    .select()
    .get();
  const programfagSelectionRate = totalStudents > 0
    ? pfSnap.size / totalStudents
    : 0;

  // Klyngefordeling
  const clusterSnap = await db.collection("users")
    .where("tenantId", "==", effectiveTenantId)
    .select("clusterId")
    .get();
  const clusterDistribution: Record<string, number> = {};
  for (const d of clusterSnap.docs) {
    const cid = (d.data().clusterId as string) || "ukjent";
    clusterDistribution[cid] = (clusterDistribution[cid] ?? 0) + 1;
  }

  // RIASEC-fordeling (anonymisert)
  const riasecDistribution = await calcRiasecDistribution(userIds.slice(0, 100)); // Maks 100 for ytelse

  // LLM-kostnad
  const llmCostLast30Days = await calcLlmCost(effectiveTenantId);

  // Frafallsrisiko
  const dropoutRiskOverview = await calcDropoutRisk(userIds.slice(0, 100));

  // Gjennomsnittlig karaktersnitt (denormalisert felt på user-dokument)
  const avgGradeAverage = await calcAvgGradeAverage(effectiveTenantId);

  // Topp karriereveier (fra jobbmatch-favoritter)
  const topCareerPaths = await calcTopCareerPaths(userIds.slice(0, 200));

  // AI-chat statistikk
  const convSnap = await db.collectionGroup("conversations")
    .where("tenantId", "==", effectiveTenantId)
    .select("messageCount")
    .get();
  const totalConversations = convSnap.size;
  const totalMessages = convSnap.docs.reduce(
    (sum, d) => sum + ((d.data().messageCount as number) || 0), 0
  );

  const stats: SchoolStats = {
    tenantId: effectiveTenantId,
    generatedAt: new Date().toISOString(),
    totalStudents,
    activeStudents7d,
    personalityTestCompletionRate,
    programfagSelectionRate,
    avgGradeAverage,
    riasecDistribution,
    clusterDistribution,
    topCareerPaths,
    aiChatStats: {
      totalConversations,
      avgMessagesPerConversation: totalConversations > 0
        ? Math.round(totalMessages / totalConversations)
        : 0,
    },
    llmCostLast30Days,
    dropoutRiskOverview,
  };

  (res as import("express").Response).json({ success: true, data: stats });
});

export function registerAdminStatsRoutes(
  req: import("firebase-functions/v2/https").Request,
  res: import("express").Response,
  ctx: RouteContext
) {
  if (req.method === "GET" && req.path === "/admin/school-stats") {
    return getSchoolStats(ctx);
  }
  return null;
}
