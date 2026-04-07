/**
 * AI-innholds-caching — 3-lags caching-modell
 *
 * Lag 1 — Profil-spesifikt (Firestore users/{uid}/aiCache):
 *   Genereres ved profilendring. TTL: 7 dager.
 *   Eks: personlige studietips, karriereforslag.
 *
 * Lag 2 — Klynge-delt (Firestore generatedContent/{clusterId}_{type}):
 *   Deles av alle brukere i samme k-means klynge. TTL: 24 timer.
 *   Eks: klynge-spesifikke ukesutfordringer, karriereartikler.
 *
 * Lag 3 — Live/session (localStorage):
 *   Session-cache for siste svar. TTL: 24 timer.
 *   Eks: siste AI-svar, aktive samtaler.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { CacheEntrySchema } from "@/types/schemas";
import { logger } from "@/lib/observability/logger";
import { isExpired } from "@/lib/utils/ttl";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type CacheLevel = 1 | 2 | 3;

export type CacheEntry = {
  content: string;
  cacheKey: string;
  level: CacheLevel;
  ttlHours: number;
  createdAt: { toDate?: () => Date } | null;
};

// ---------------------------------------------------------------------------
// Nøkkel-hashing (enkel, ikke kryptografisk)
// ---------------------------------------------------------------------------

export async function hashCacheKey(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for miljøer uten crypto.subtle
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ---------------------------------------------------------------------------
// Firestore cache (lag 1 — profil-spesifikt, 7 dager TTL)
// ---------------------------------------------------------------------------

const L1_TTL_HOURS = 7 * 24; // 7 dager

export async function getL1Cache(
  userId: string,
  cacheKey: string
): Promise<string | null> {
  try {
    const ref = doc(db, "users", userId, "aiCache", cacheKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const result = CacheEntrySchema.safeParse(snap.data());
    if (!result.success) return null;
    const data = result.data as unknown as CacheEntry;
    const createdAt = data.createdAt?.toDate?.() ?? null;
    if (!createdAt) return null;

    if (isExpired(createdAt, data.ttlHours)) return null;

    return data.content;
  } catch (err) {
    logger.warn("l1_cache_read_failed", { userId, cacheKey, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export async function setL1Cache(
  userId: string,
  cacheKey: string,
  content: string
): Promise<void> {
  try {
    const ref = doc(db, "users", userId, "aiCache", cacheKey);
    await setDoc(ref, {
      content,
      cacheKey,
      level: 1,
      ttlHours: L1_TTL_HOURS,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    logger.warn("l1_cache_write_failed", { userId, cacheKey, error: err instanceof Error ? err.message : "unknown" });
  }
}

// ---------------------------------------------------------------------------
// Lag 2 — Klynge-delt innhold (Firestore generatedContent/, 24 timer TTL)
// ---------------------------------------------------------------------------

const L2_TTL_HOURS = 24;

export async function getL2Cache(
  clusterId: string,
  contentType: string
): Promise<string | null> {
  try {
    const q = query(
      collection(db, "generatedContent"),
      where("clusterId", "==", clusterId),
      where("type", "==", contentType)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = snap.docs[0].data();
    const generatedAt = data.generatedAt?.toDate?.() ?? null;
    if (!generatedAt) return null;

    if (isExpired(generatedAt, L2_TTL_HOURS)) return null;

    return data.content as string;
  } catch (err) {
    logger.warn("l2_cache_read_failed", { clusterId, contentType, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export async function setL2Cache(
  clusterId: string,
  contentType: string,
  content: string,
  model = "gemini-2.0-flash"
): Promise<void> {
  try {
    const docId = `${clusterId}_${contentType}`;
    await setDoc(doc(db, "generatedContent", docId), {
      clusterId,
      type: contentType,
      content,
      userId: null, // Klynge-delt, ikke bruker-spesifikt
      model,
      generatedAt: serverTimestamp(),
      expiresAt: null, // TTL håndteres manuelt
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    logger.warn("l2_cache_write_failed", { clusterId, contentType, error: err instanceof Error ? err.message : "unknown" });
  }
}

// ---------------------------------------------------------------------------
// localStorage cache (lag 3 — live/session, 24 timer TTL)
// ---------------------------------------------------------------------------

const L3_TTL_HOURS = 24;
const L3_PREFIX = "suksess-ai-l3-";

export function getL3Cache(cacheKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(L3_PREFIX + cacheKey);
    if (!raw) return null;
    const { content, timestamp } = JSON.parse(raw) as {
      content: string;
      timestamp: number;
    };
    if (isExpired(timestamp, L3_TTL_HOURS)) {
      localStorage.removeItem(L3_PREFIX + cacheKey);
      return null;
    }
    return content;
  } catch (err) {
    logger.warn("l3_cache_read_failed", { cacheKey, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export function setL3Cache(cacheKey: string, content: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      L3_PREFIX + cacheKey,
      JSON.stringify({ content, timestamp: Date.now() })
    );
  } catch (err) {
    logger.warn("l3_cache_write_failed", { cacheKey, error: err instanceof Error ? err.message : "unknown" });
  }
}

// ---------------------------------------------------------------------------
// Hoved-cache-oppslag (sjekker L3 → L2 → L1 → null)
// ---------------------------------------------------------------------------

export async function getCachedContent(
  userId: string | null,
  prompt: string,
  clusterId?: string | null,
  contentType?: string
): Promise<string | null> {
  const key = await hashCacheKey(prompt);

  // L3 er raskest — sjekk først
  const l3 = getL3Cache(key);
  if (l3) return l3;

  // L2 — klynge-delt innhold (krever clusterId)
  if (clusterId && contentType) {
    const l2 = await getL2Cache(clusterId, contentType);
    if (l2) {
      setL3Cache(key, l2); // Hydrer L3
      return l2;
    }
  }

  // L1 — profil-spesifikt (krever bruker)
  if (userId) {
    const l1 = await getL1Cache(userId, key);
    if (l1) {
      setL3Cache(key, l1); // Hydrer L3
      return l1;
    }
  }

  return null;
}

export async function cacheContent(
  userId: string | null,
  prompt: string,
  content: string,
  level: CacheLevel = 3
): Promise<void> {
  const key = await hashCacheKey(prompt);

  // Alltid cache i L3
  setL3Cache(key, content);

  // Cache i L1 hvis bruker finnes og level ≥ 1
  if (userId && level >= 1) {
    await setL1Cache(userId, key, content);
  }
}

// ---------------------------------------------------------------------------
// Hjelpefunksjon: Rydd opp gamle L3-oppføringer
// ---------------------------------------------------------------------------

export function pruneL3Cache(): void {
  if (typeof window === "undefined") return;
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(L3_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { timestamp } = JSON.parse(raw);
      if (isExpired(timestamp, L3_TTL_HOURS)) keysToDelete.push(key);
    } catch (err) {
      logger.warn("l3_cache_prune_parse_failed", { key, error: err instanceof Error ? err.message : "unknown" });
      keysToDelete.push(key!);
    }
  }
  keysToDelete.forEach((k) => localStorage.removeItem(k));
}
