/**
 * Hook for NAV jobblistinger fra Firestore (Issue #52)
 *
 * Leser fra jobListings/ collection (populert av nav-stillinger.ts ingest).
 * Fallback til tom liste ved feil eller manglende data.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, where, getDocs, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";

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

export function useNavJobs(opts?: {
  sector?: string;
  type?: NavJob["type"];
  maxResults?: number;
}): {
  jobs: NavJob[];
  loading: boolean;
  fromFirestore: boolean;
} {
  const [jobs, setJobs] = useState<NavJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const constraints = [
      orderBy("published", "desc"),
      limit(opts?.maxResults ?? 100),
    ] as Parameters<typeof query>[1][];

    if (opts?.sector) {
      constraints.unshift(where("sector", "==", opts.sector));
    }
    if (opts?.type) {
      constraints.unshift(where("type", "==", opts.type));
    }

    getDocs(query(collection(db(), "jobListings"), ...constraints))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.empty) {
          const mapped: NavJob[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<NavJob, "id">),
          }));
          setJobs(mapped);
          setFromFirestore(true);
        } else {
          setFromFirestore(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFromFirestore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.sector, opts?.type, opts?.maxResults]);

  return { jobs, loading, fromFirestore };
}
