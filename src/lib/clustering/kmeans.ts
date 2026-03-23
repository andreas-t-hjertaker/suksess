/**
 * K-means clustering av brukerprofiler.
 *
 * Brukes til å gruppere brukere i «personas» basert på Big Five + RIASEC.
 * Cluster-ID lagres i users/{uid}.clusterId og brukes av L2-cachen til
 * å dele AI-generert innhold mellom brukere med lik profil.
 *
 * Kjøres som en Cloud Scheduler-jobb (ukentlig) i functions/src/clustering/.
 * Frontend-klassen her er ren beregning uten Firestore-avhengighet.
 */

export type ProfileVector = {
  userId: string;
  /** Normaliserte verdier 0–1 */
  features: number[];
};

export type ClusterResult = {
  userId: string;
  clusterId: string;
  centroidIndex: number;
  distanceToCentroid: number;
};

// ---------------------------------------------------------------------------
// Intern hjelp
// ---------------------------------------------------------------------------

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
}

function mean(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0) as number[];
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((s) => s / vectors.length);
}

// ---------------------------------------------------------------------------
// K-means++ initialisering
// ---------------------------------------------------------------------------

function initCentroids(points: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  // Velg første tilfeldig
  centroids.push(points[Math.floor(Math.random() * points.length)]);

  for (let c = 1; c < k; c++) {
    const distances = points.map((p) =>
      Math.min(...centroids.map((cent) => euclidean(p, cent) ** 2))
    );
    const total = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let chosen = 0;
    for (let i = 0; i < distances.length; i++) {
      rand -= distances[i];
      if (rand <= 0) { chosen = i; break; }
    }
    centroids.push(points[chosen]);
  }
  return centroids;
}

// ---------------------------------------------------------------------------
// Hoved-algoritme
// ---------------------------------------------------------------------------

export function kmeans(
  profiles: ProfileVector[],
  k: number,
  maxIterations = 100
): ClusterResult[] {
  if (profiles.length === 0) return [];
  k = Math.min(k, profiles.length);

  const points = profiles.map((p) => p.features);
  const centroids = initCentroids(points, k);

  let assignments = new Array(profiles.length).fill(-1) as number[];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Tilordne punkter til nærmeste sentroid
    const newAssignments = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = euclidean(p, c);
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      return best;
    });

    // Konvergens-sjekk
    if (newAssignments.every((a, i) => a === assignments[i])) break;
    assignments = newAssignments;

    // Oppdater sentroider
    for (let ci = 0; ci < k; ci++) {
      const cluster = points.filter((_, i) => assignments[i] === ci);
      if (cluster.length > 0) centroids[ci] = mean(cluster);
    }
  }

  return profiles.map((p, i) => {
    const ci = assignments[i];
    return {
      userId: p.userId,
      clusterId: `cluster-${ci}`,
      centroidIndex: ci,
      distanceToCentroid: euclidean(p.features, centroids[ci]),
    };
  });
}

// ---------------------------------------------------------------------------
// Normalisering av Big Five + RIASEC til feature-vektor
// ---------------------------------------------------------------------------

export type UserProfileData = {
  userId: string;
  bigFive?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  riasec?: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
};

/** Konverter brukerprofil til normalisert feature-vektor (11 dimensjoner) */
export function profileToVector(profile: UserProfileData): ProfileVector {
  const bf = profile.bigFive;
  const ri = profile.riasec;

  // Normaliser fra 0–100 til 0–1
  const norm = (v: number | undefined, fallback = 50) => (v ?? fallback) / 100;

  return {
    userId: profile.userId,
    features: [
      norm(bf?.openness),
      norm(bf?.conscientiousness),
      norm(bf?.extraversion),
      norm(bf?.agreeableness),
      norm(bf?.neuroticism),
      norm(ri?.realistic),
      norm(ri?.investigative),
      norm(ri?.artistic),
      norm(ri?.social),
      norm(ri?.enterprising),
      norm(ri?.conventional),
    ],
  };
}

// ---------------------------------------------------------------------------
// Kollaborativ filtering — enkel Cosine-similaritet
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, ai, i) => s + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

/**
 * Finn k nærmeste naboer basert på Cosine-similaritet.
 * Brukes til å anbefale karriereveier eller studieprogram basert på
 * hva lignende brukere valgte.
 */
export function findNearestNeighbors(
  targetVector: number[],
  candidates: ProfileVector[],
  k: number
): Array<{ userId: string; similarity: number }> {
  return candidates
    .map((c) => ({ userId: c.userId, similarity: cosineSimilarity(targetVector, c.features) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
