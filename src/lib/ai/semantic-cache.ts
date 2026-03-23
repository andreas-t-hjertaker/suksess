/**
 * Semantisk caching for LLM-spørsmål (Issue #44)
 *
 * Like spørsmål (cosine-likhet > 0.95) returnerer cachet svar
 * uten å gjøre et nytt LLM-kall. Bruker enkle n-gram-fingeravtrykk
 * (ingen embedding-API nødvendig for MVP) — bytt til Weaviate-søk i prod.
 *
 * Strategi:
 * 1. Semantisk cache (n-gram): Like spørsmål → cachet svar
 * 2. API-respons cache: Statiske data fra utdanning.no, DBH, SSB
 * 3. RAG-kontekst cache: Weaviate-søkeresultater for vanlige queries
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// N-gram fingeravtrykk (tekst → numerisk hash)
// ---------------------------------------------------------------------------

/** Generer 3-gram-sett fra en streng */
function ngrams(text: string, n = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/[^a-zæøå0-9\s]/g, "").trim();
  const grams = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.slice(i, i + n));
  }
  return grams;
}

/** Dice-koeffisient mellom to n-gram-sett (0–1) */
function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/** Enkel hash av streng til hex */
function simpleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return hash.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type SemanticCacheEntry = {
  queryHash: string;
  queryText: string;
  responseText: string;
  feature: string;
  createdAt: string;
  hitCount: number;
  /** Dice-koeffisient-terskel brukt ved lagring */
  threshold: number;
};

export type ApiCacheEntry = {
  key: string;
  data: unknown;
  source: string;
  expiresAt: string;
};

const SEMANTIC_CACHE_COLLECTION = "semanticCache";
const API_CACHE_COLLECTION = "apiResponseCache";
const SEMANTIC_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dager
const API_CACHE_TTL_MS = 24 * 60 * 60 * 1000;     // 24 timer
const SIMILARITY_THRESHOLD = 0.85; // Dice > 0.85 = semantisk like

// ---------------------------------------------------------------------------
// Semantisk cache
// ---------------------------------------------------------------------------

/**
 * Sjekk semantisk cache. Returnerer cachet svar hvis et lignende
 * spørsmål er besvart tidligere (Dice-koeffisient > SIMILARITY_THRESHOLD).
 */
export async function getSemanticCache(
  queryText: string,
  feature: string
): Promise<string | null> {
  try {
    const queryGrams = ngrams(queryText);
    const q = query(
      collection(db, SEMANTIC_CACHE_COLLECTION),
      where("feature", "==", feature),
      orderBy("hitCount", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      const entry = d.data() as SemanticCacheEntry;
      // Sjekk TTL
      const age = Date.now() - new Date(entry.createdAt).getTime();
      if (age > SEMANTIC_TTL_MS) continue;

      const entryGrams = ngrams(entry.queryText);
      const similarity = diceCoefficient(queryGrams, entryGrams);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Inkrementer hit-teller asynkront
        const ref = doc(db, SEMANTIC_CACHE_COLLECTION, d.id);
        setDoc(ref, { hitCount: (entry.hitCount ?? 0) + 1 }, { merge: true }).catch(() => {});
        return entry.responseText;
      }
    }
  } catch {
    // Cache-feil skal aldri stoppe AI-kallet
  }
  return null;
}

/**
 * Lagre et spørsmål-svar-par i semantisk cache.
 */
export async function setSemanticCache(
  queryText: string,
  responseText: string,
  feature: string
): Promise<void> {
  try {
    const hash = simpleHash(queryText.toLowerCase().trim());
    const ref = doc(db, SEMANTIC_CACHE_COLLECTION, `${feature}_${hash}`);
    const entry: SemanticCacheEntry = {
      queryHash: hash,
      queryText,
      responseText,
      feature,
      createdAt: new Date().toISOString(),
      hitCount: 0,
      threshold: SIMILARITY_THRESHOLD,
    };
    await setDoc(ref, entry);
  } catch {
    // Ignorer cache-skriv-feil
  }
}

// ---------------------------------------------------------------------------
// API-respons cache (statiske data fra utdanning.no, DBH, SSB)
// ---------------------------------------------------------------------------

/**
 * Hent cachet API-respons. Returnerer null ved cache-miss eller utløpt TTL.
 */
export async function getApiCache<T = unknown>(key: string): Promise<T | null> {
  try {
    const ref = doc(db, API_CACHE_COLLECTION, key);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const entry = snap.data() as ApiCacheEntry;
    if (new Date(entry.expiresAt).getTime() < Date.now()) return null;

    return entry.data as T;
  } catch {
    return null;
  }
}

/**
 * Sett cachet API-respons med TTL.
 */
export async function setApiCache(
  key: string,
  data: unknown,
  source: string,
  ttlMs = API_CACHE_TTL_MS
): Promise<void> {
  try {
    const ref = doc(db, API_CACHE_COLLECTION, key);
    const entry: ApiCacheEntry = {
      key,
      data,
      source,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
    await setDoc(ref, entry);
  } catch {
    // Ignorer cache-skriv-feil
  }
}

// ---------------------------------------------------------------------------
// Hjelpefunksjon: cache-nøkkel
// ---------------------------------------------------------------------------

/** Generer stabil cache-nøkkel fra API-URL og evt. parametere */
export function apiCacheKey(url: string, params?: Record<string, string>): string {
  const paramStr = params ? "_" + Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join("&") : "";
  return simpleHash(url + paramStr);
}
