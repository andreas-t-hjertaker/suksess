/**
 * Hook for NAV jobblistinger fra Firestore (Issue #52)
 *
 * Leser fra jobListings/ collection (populert av nav-stillinger.ts ingest).
 * Fallback til tom liste ved feil eller manglende data.
 *
 * Bruker useFirestoreQuery (Issue #31) for SWR-style localStorage-caching med
 * 5 minutters TTL — samme public API som før.
 */

"use client";

import { useMemo } from "react";
import { collection, query, orderBy, limit, where, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";
import { useFirestoreQuery } from "@/hooks/use-firestore-query";

export type NavJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "heltid" | "deltid" | "lærling" | "internship" | "annet";
  sector: string;
  description: string;
  applicationUrl: string | null;
  deadline: string | null;
  published: string;
  styrk08Code?: string;
  riasecCodes?: string[];
};

function db() {
  return getFirestore(app);
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useNavJobs(opts?: {
  sector?: string;
  type?: NavJob["type"];
  maxResults?: number;
}): {
  jobs: NavJob[];
  loading: boolean;
  fromFirestore: boolean;
} {
  const sector = opts?.sector;
  const type = opts?.type;
  const maxResults = opts?.maxResults ?? 100;

  // Build a stable cache key from the query parameters
  const cacheKey = `nav-jobs:${sector ?? ""}:${type ?? ""}:${maxResults}`;

  // Build the Firestore query. useMemo keeps the Query reference stable across
  // renders so useFirestoreQuery does not re-fetch unnecessarily.
  const firestoreQuery = useMemo(() => {
    const constraints = [
      orderBy("published", "desc"),
      limit(maxResults),
    ] as Parameters<typeof query>[1][];

    if (sector) {
      constraints.unshift(where("sector", "==", sector));
    }
    if (type) {
      constraints.unshift(where("type", "==", type));
    }

    return query(collection(db(), "jobListings"), ...constraints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, type, maxResults]);

  const { data, loading } = useFirestoreQuery<NavJob>(
    firestoreQuery,
    cacheKey,
    CACHE_TTL_MS
  );

  return {
    jobs: data,
    loading,
    fromFirestore: data.length > 0,
  };
}
