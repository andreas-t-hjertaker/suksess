/**
 * Generic SWR-style Firestore hook with localStorage caching (Issue #31).
 *
 * useFirestoreQuery<T>(query, cacheKey, ttlMs?) returns { data, loading, error, refresh }.
 * On cache hit (within TTL) the cached value is returned immediately and no Firestore
 * request is made.  On cache miss or TTL expiry the hook falls back to Firestore and
 * updates the cache.
 *
 * localStorage access is guarded by `typeof window === "undefined"` so the hook is safe
 * to import in SSR/RSC files (though it only does work in the browser).
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getDocs, type Query, type DocumentData } from "firebase/firestore";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = {
  data: T[];
  timestamp: number;
};

function readCache<T>(cacheKey: string, ttlMs: number): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(cacheKey: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Quota exceeded or private browsing — silently skip
  }
}

function invalidateCache(cacheKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(cacheKey);
  } catch {
    // ignore
  }
}

export type UseFirestoreQueryResult<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};

export function useFirestoreQuery<T = DocumentData>(
  firestoreQuery: Query<DocumentData>,
  cacheKey: string,
  ttlMs: number = DEFAULT_TTL_MS
): UseFirestoreQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementing this triggers a manual refresh (bypasses TTL)
  const [refreshCount, setRefreshCount] = useState(0);
  const isManualRefresh = useRef(false);

  const refresh = useCallback(() => {
    invalidateCache(cacheKey);
    isManualRefresh.current = true;
    setRefreshCount((n) => n + 1);
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Guard: no localStorage on server
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      // Check cache (skip on manual refresh — cache was already invalidated)
      if (!isManualRefresh.current) {
        const cached = readCache<T>(cacheKey, ttlMs);
        if (cached !== null) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
            setError(null);
          }
          return;
        }
      }
      isManualRefresh.current = false;

      setLoading(true);
      try {
        const snap = await getDocs(firestoreQuery);
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
        writeCache<T>(cacheKey, docs);
        setData(docs);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // firestoreQuery is intentionally omitted from the dep array because Query
    // objects are new references on every render.  Callers should memoize the
    // query themselves if they want reactivity based on query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ttlMs, refreshCount]);

  return { data, loading, error, refresh };
}
