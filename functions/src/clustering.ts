/**
 * K-means clustering — klynge-personaer for elever (Issue #13)
 *
 * Kjøres som nattlig Cloud Scheduler-jobb (kl 02:00 norsk tid).
 * Grupperer elever med lignende Big Five + RIASEC-profil i 7 klynger.
 *
 * Feature-vektor per elev (13 dimensjoner):
 *   Big Five (5): openness, conscientiousness, extraversion, agreeableness, neuroticism
 *   RIASEC (6):   realistic, investigative, artistic, social, enterprising, conventional
 *   Karaktersnitt (1): gradeAverage (normalisert 0–1)
 *   Onboarding (1): onboardingCompletionPct (normalisert 0–1)
 *
 * Cluster-ID settes på users/{uid}.clusterId og oppdateres ved neste kjøring.
 * AI-genererte klynge-personaer lagres i clusterPersonas/{clusterId}.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

const K = 7; // Antall klynger
const MAX_ITERATIONS = 30;
const CONVERGENCE_THRESHOLD = 0.001;
const BATCH_SIZE = 500; // Maks elever per kjøring

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type FeatureVector = number[]; // 13 dimensjoner

type UserFeature = {
  uid: string;
  vector: FeatureVector;
};


// ---------------------------------------------------------------------------
// Klynge-personaer (statiske beskrivelser, AI-oppdatert i produksjon)
// ---------------------------------------------------------------------------

const CLUSTER_PERSONAS: Record<string, { name: string; description: string; icon: string }> = {
  cluster_0: {
    name: "Den analytiske utforskeren",
    description: "Høy åpenhet og undersøkende interesse. Trives med forskning, teknologi og komplekse problemer.",
    icon: "🔬",
  },
  cluster_1: {
    name: "Den sosiale lederen",
    description: "Høy utadvendthet og sosial interesse. Naturlig leder som motiverer andre.",
    icon: "🤝",
  },
  cluster_2: {
    name: "Den kreative skaperen",
    description: "Høy åpenhet og artistisk interesse. Drives av kreativitet og selvuttrykk.",
    icon: "🎨",
  },
  cluster_3: {
    name: "Den strukturerte planleggeren",
    description: "Høy planmessighet og konvensjonell interesse. Trives med orden, systemer og forutsigbarhet.",
    icon: "📋",
  },
  cluster_4: {
    name: "Den praktiske realisten",
    description: "Høy realistisk interesse. Liker å jobbe med hendene og se konkrete resultater.",
    icon: "🔧",
  },
  cluster_5: {
    name: "Den ambisiøse entrepenøren",
    description: "Høy entreprenant interesse og lav nevrotisisme. Drevet av mål, resultater og innflytelse.",
    icon: "🚀",
  },
  cluster_6: {
    name: "Den empatiske hjelperen",
    description: "Høy medmenneskelighet og sosial interesse. Finner mening i å hjelpe andre.",
    icon: "💙",
  },
};

// ---------------------------------------------------------------------------
// Feature-ekstraksjon
// ---------------------------------------------------------------------------

function extractVector(data: FirebaseFirestore.DocumentData): FeatureVector | null {
  const bf = data.bigFive as Record<string, number> | undefined;
  const ri = data.riasec as Record<string, number> | undefined;

  if (!bf || !ri) return null;

  const gradeAvg = typeof data.gradeAverage === "number"
    ? Math.min(1, data.gradeAverage / 6) // Normalisert 1–6 → 0–1
    : 0.5; // Default midtverdi

  const onboardingPct = typeof data.onboardingCompletionPct === "number"
    ? data.onboardingCompletionPct / 100
    : 0.5;

  return [
    (bf.openness ?? 50) / 100,
    (bf.conscientiousness ?? 50) / 100,
    (bf.extraversion ?? 50) / 100,
    (bf.agreeableness ?? 50) / 100,
    (bf.neuroticism ?? 50) / 100,
    (ri.realistic ?? 50) / 100,
    (ri.investigative ?? 50) / 100,
    (ri.artistic ?? 50) / 100,
    (ri.social ?? 50) / 100,
    (ri.enterprising ?? 50) / 100,
    (ri.conventional ?? 50) / 100,
    gradeAvg,
    onboardingPct,
  ];
}

// ---------------------------------------------------------------------------
// K-means algoritme
// ---------------------------------------------------------------------------

function euclideanDistance(a: FeatureVector, b: FeatureVector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function findClosestCentroid(vector: FeatureVector, centroids: FeatureVector[]): number {
  let minDist = Infinity;
  let closest = 0;
  for (let i = 0; i < centroids.length; i++) {
    const dist = euclideanDistance(vector, centroids[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function computeMean(vectors: FeatureVector[]): FeatureVector {
  if (vectors.length === 0) return new Array(13).fill(0.5) as FeatureVector;
  const sum = new Array(13).fill(0) as FeatureVector;
  for (const v of vectors) {
    for (let i = 0; i < v.length; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length) as FeatureVector;
}

function kMeans(users: UserFeature[], k: number): Map<string, string> {
  if (users.length === 0) return new Map();

  const dims = users[0].vector.length;

  // Initialisering: K-means++ seeding
  const centroids: FeatureVector[] = [users[Math.floor(Math.random() * users.length)].vector];
  while (centroids.length < k) {
    const distances = users.map((u) =>
      Math.min(...centroids.map((c) => euclideanDistance(u.vector, c)))
    );
    const totalDist = distances.reduce((s, d) => s + d * d, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < users.length; i++) {
      r -= distances[i] * distances[i];
      if (r <= 0) {
        centroids.push(users[i].vector);
        break;
      }
    }
    if (centroids.length < k) centroids.push(users[Math.floor(Math.random() * users.length)].vector);
  }

  // Iterasjoner
  let assignments: number[] = users.map((u) => findClosestCentroid(u.vector, centroids));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Oppdater sentroider
    const clusters: FeatureVector[][] = Array.from({ length: k }, () => []);
    for (let i = 0; i < users.length; i++) {
      clusters[assignments[i]].push(users[i].vector);
    }
    let maxShift = 0;
    for (let c = 0; c < k; c++) {
      const newCentroid = computeMean(clusters[c]);
      maxShift = Math.max(maxShift, euclideanDistance(centroids[c], newCentroid));
      centroids[c] = newCentroid;
    }

    // Ny tilordning
    const newAssignments = users.map((u) => findClosestCentroid(u.vector, centroids));
    assignments = newAssignments;

    if (maxShift < CONVERGENCE_THRESHOLD) break;
  }

  // Bygg uid → clusterId-map
  const result = new Map<string, string>();
  for (let i = 0; i < users.length; i++) {
    result.set(users[i].uid, `cluster_${assignments[i]}`);
  }

  // Lagre sentroider
  void saveCentroids(centroids, assignments, users);

  void dims; // suppress unused warning

  return result;
}

async function saveCentroids(
  centroids: FeatureVector[],
  assignments: number[],
  users: UserFeature[]
): Promise<void> {
  const memberCounts: number[] = new Array(centroids.length).fill(0);
  for (const a of assignments) memberCounts[a]++;

  const batch = db.batch();
  for (let i = 0; i < centroids.length; i++) {
    const clusterId = `cluster_${i}`;
    const persona = CLUSTER_PERSONAS[clusterId];
    batch.set(db.collection("clusterPersonas").doc(clusterId), {
      clusterId,
      centroid: centroids[i],
      memberCount: memberCounts[i],
      name: persona?.name ?? `Klynge ${i + 1}`,
      description: persona?.description ?? "",
      icon: persona?.icon ?? "🎯",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Cloud Scheduler — nattlig clustering
// ---------------------------------------------------------------------------

export const runClusteringJob = onSchedule(
  {
    schedule: "0 2 * * *", // Kl 02:00 UTC
    timeZone: "Europe/Oslo",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async () => {
    console.info("[clustering] Starter K-means clustering-jobb");

    // Hent alle brukere med fullstendige profiler
    const snap = await db.collection("users")
      .where("bigFiveCompleted", "==", true)
      .limit(BATCH_SIZE)
      .get();

    if (snap.empty) {
      console.info("[clustering] Ingen brukere å klynge");
      return;
    }

    const users: UserFeature[] = [];
    for (const d of snap.docs) {
      const vec = extractVector(d.data());
      if (vec) users.push({ uid: d.id, vector: vec });
    }

    if (users.length < K) {
      console.info(`[clustering] For få brukere (${users.length}) for K=${K}`);
      return;
    }

    console.info(`[clustering] Kjører K-means på ${users.length} brukere, K=${K}`);
    const clusterMap = kMeans(users, K);

    // Skriv clusterId tilbake til brukerdokumenter i batcher
    const batchSize = 400;
    const entries = [...clusterMap.entries()];
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = db.batch();
      for (const [uid, clusterId] of entries.slice(i, i + batchSize)) {
        batch.update(db.collection("users").doc(uid), {
          clusterId,
          clusterUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    console.info(`[clustering] Oppdatert clusterId for ${clusterMap.size} brukere`);
  }
);

// ---------------------------------------------------------------------------
// HTTP-trigger for manuell kjøring (admin only)
// ---------------------------------------------------------------------------

import { onRequest } from "firebase-functions/v2/https";
import { withAdmin } from "./middleware";

export const triggerClustering = onRequest(
  { region: "europe-west1", invoker: "private" },
  (req, res) => withAdmin(async ({ res: r }) => {
    const snap = await db.collection("users")
      .where("bigFiveCompleted", "==", true)
      .limit(BATCH_SIZE)
      .get();

    const users: UserFeature[] = [];
    for (const d of snap.docs) {
      const vec = extractVector(d.data());
      if (vec) users.push({ uid: d.id, vector: vec });
    }

    if (users.length < K) {
      (r as import("express").Response).json({ success: false, error: `For få brukere (${users.length})` });
      return;
    }

    const clusterMap = kMeans(users, K);

    const batchSize = 400;
    const entries = [...clusterMap.entries()];
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = db.batch();
      for (const [uid, clusterId] of entries.slice(i, i + batchSize)) {
        batch.update(db.collection("users").doc(uid), { clusterId });
      }
      await batch.commit();
    }

    (r as import("express").Response).json({
      success: true,
      data: { clustered: clusterMap.size, k: K },
    });
  })({ req, res })
);
