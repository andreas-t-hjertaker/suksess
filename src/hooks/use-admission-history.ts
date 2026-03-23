/**
 * Hook for opptakshistorikk fra Firestore (Issue #52, #60)
 *
 * Henter historiske poenggrenser fra admissionHistory/ collection
 * (populert av DBH-ingest). Fallback til tom liste om ikke funnet.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";

export type AdmissionEntry = {
  year: number;
  quota: string;
  points: number;
  applicants?: number;
  admitted?: number;
};

function db() { return getFirestore(app); }

export function useAdmissionHistory(nusCode: string | null): {
  history: AdmissionEntry[];
  loading: boolean;
  ordinaer: AdmissionEntry[];
  forste: AdmissionEntry[];
  latestOrdinaer: number | null;
} {
  const [history, setHistory] = useState<AdmissionEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nusCode) { setHistory([]); return; }

    let cancelled = false;
    setLoading(true);

    getDocs(
      query(
        collection(db(), "admissionHistory"),
        where("nusCode", "==", nusCode),
        orderBy("year", "asc")
      )
    )
      .then((snap) => {
        if (!cancelled) {
          setHistory(snap.docs.map((d) => d.data() as AdmissionEntry));
        }
      })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [nusCode]);

  const ordinaer = history.filter((h) => h.quota.toLowerCase().includes("ordin"));
  const forste = history.filter((h) => h.quota.toLowerCase().includes("forste") || h.quota.toLowerCase().includes("første"));
  const latestOrdinaer = ordinaer.at(-1)?.points ?? null;

  return { history, loading, ordinaer, forste, latestOrdinaer };
}
