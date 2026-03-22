/**
 * AI-innholds-caching — lag 1 og lag 3 av 3-lags caching-modellen (issue #9)
 *
 * Lag 1: Profil-spesifikt innhold caches i Firestore under users/{uid}/aiCache
 * Lag 3: Live-generert innhold caches i localStorage for rask tilgang
 *
 * TTL: Lag 1 = 7 dager, Lag 3 = 24 timer
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type CacheLevel = 1 | 3;

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

export function hashCacheKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
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

    const data = snap.data() as CacheEntry;
    const createdAt = data.createdAt?.toDate?.() ?? null;
    if (!createdAt) return null;

    const ageHours = (Date.now() - createdAt.getTime()) / 3600000;
    if (ageHours > data.ttlHours) return null; // Utløpt

    return data.content;
  } catch {
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
  } catch {
    // Silently fail — caching er ikke kritisk
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
    const ageHours = (Date.now() - timestamp) / 3600000;
    if (ageHours > L3_TTL_HOURS) {
      localStorage.removeItem(L3_PREFIX + cacheKey);
      return null;
    }
    return content;
  } catch {
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
  } catch {
    // localStorage full — ignorer
  }
}

// ---------------------------------------------------------------------------
// Hoved-cache-oppslag (sjekker L3 → L1 → null)
// ---------------------------------------------------------------------------

export async function getCachedContent(
  userId: string | null,
  prompt: string
): Promise<string | null> {
  const key = hashCacheKey(prompt);

  // L3 er raskest — sjekk først
  const l3 = getL3Cache(key);
  if (l3) return l3;

  // L1 — Firestore (krever bruker)
  if (userId) {
    const l1 = await getL1Cache(userId, key);
    if (l1) {
      // Hydrer L3-cache
      setL3Cache(key, l1);
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
  const key = hashCacheKey(prompt);

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
      const ageHours = (Date.now() - timestamp) / 3600000;
      if (ageHours > L3_TTL_HOURS) keysToDelete.push(key);
    } catch {
      keysToDelete.push(key!);
    }
  }
  keysToDelete.forEach((k) => localStorage.removeItem(k));
}
