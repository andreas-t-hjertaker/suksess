"use client";

/**
 * useJobSearch — hook for jobbsøk mot NAV-stillinger i Firestore (#129).
 *
 * Bruker searchJobs() fra nav-stillinger.ts for å hente ekte stillinger
 * med RIASEC-matching, filtrering og cursor-basert paginering.
 *
 * Følger useOpptaksdata-mønsteret med request-ID stale-sjekk og debounce.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchJobs,
  getAvailableLocations,
  type NavJobListing,
  type JobSearchResult,
} from "@/lib/jobbmatch/nav-stillinger";
import type { RiasecScores } from "@/types/domain";
import type { QueryDocumentSnapshot } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type UseJobSearchParams = {
  riasecProfile: RiasecScores | null;
  query?: string;
  location?: string;
  type?: string;
  pageSize?: number;
};

export type UseJobSearchResult = {
  jobs: NavJobListing[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  locations: string[];
  total: number;
  loadMore: () => void;
  retry: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJobSearch(params: UseJobSearchParams): UseJobSearchResult {
  const { riasecProfile, query, location, type, pageSize = 20 } = params;

  const [jobs, setJobs] = useState<NavJobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const requestIdRef = useRef(0);

  // Hent tilgjengelige lokasjoner en gang
  useEffect(() => {
    getAvailableLocations()
      .then(setLocations)
      .catch(() => {});
  }, []);

  // Hovedsøk — kjøres ved filter-/parameterendring med debounce for query
  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    const isStale = () => currentRequestId !== requestIdRef.current;

    const doSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const result: JobSearchResult = await searchJobs({
          query: query || undefined,
          location: location || undefined,
          type: type || undefined,
          riasecProfile: riasecProfile ?? undefined,
          limit: pageSize,
        });

        if (isStale()) return;

        setJobs(result.jobs);
        setTotal(result.total);
        setHasMore(result.hasMore);
        cursorRef.current = result.cursor;
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : "Kunne ikke hente stillinger");
        setJobs([]);
        setTotal(0);
        setHasMore(false);
      } finally {
        if (!isStale()) setLoading(false);
      }
    };

    // Debounce query-endringer med 300ms, men kjør umiddelbart for filter-endringer
    const delay = query !== undefined ? 300 : 0;
    const timer = setTimeout(doSearch, delay);
    return () => clearTimeout(timer);
  }, [query, location, type, riasecProfile, pageSize]);

  // Last inn flere (paginering)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;

    setLoadingMore(true);
    try {
      const result = await searchJobs({
        query: query || undefined,
        location: location || undefined,
        type: type || undefined,
        riasecProfile: riasecProfile ?? undefined,
        limit: pageSize,
        cursor: cursorRef.current,
      });

      setJobs((prev) => [...prev, ...result.jobs]);
      setTotal((prev) => prev + result.total);
      setHasMore(result.hasMore);
      cursorRef.current = result.cursor;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste flere stillinger");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, query, location, type, riasecProfile, pageSize]);

  // Prøv på nytt
  const retry = useCallback(() => {
    // Trigger ny søk ved å bumpe request-ID
    requestIdRef.current++;
    setLoading(true);
    setError(null);

    searchJobs({
      query: query || undefined,
      location: location || undefined,
      type: type || undefined,
      riasecProfile: riasecProfile ?? undefined,
      limit: pageSize,
    })
      .then((result) => {
        setJobs(result.jobs);
        setTotal(result.total);
        setHasMore(result.hasMore);
        cursorRef.current = result.cursor;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Kunne ikke hente stillinger");
      })
      .finally(() => setLoading(false));
  }, [query, location, type, riasecProfile, pageSize]);

  return {
    jobs,
    loading,
    loadingMore,
    error,
    hasMore,
    locations,
    total,
    loadMore,
    retry,
  };
}
