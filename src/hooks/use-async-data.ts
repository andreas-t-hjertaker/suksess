"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useAsyncData — generisk hook for datahenting med loading/error/retry (#140)
 *
 * Bruk:
 *   const { data, loading, error, retry } = useAsyncData(fetchFn, [dep1, dep2]);
 *
 * Støtter:
 *   - Automatisk loading state
 *   - Feilhåndtering med retry-funksjon
 *   - Avbrytelse ved unmount / dependency-endring
 *   - Stale-closure-beskyttelse
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  const execute = useCallback(async () => {
    const fetchId = ++fetchCountRef.current;
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    try {
      const result = await fetcher(controller.signal);
      if (mountedRef.current && fetchId === fetchCountRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (mountedRef.current && fetchId === fetchCountRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, retry };
}
