"use client";

/**
 * Hook for å hente karrieredata fra data-service (#128).
 *
 * Bruker getCareerData() som prøver Firestore først, med fallback til
 * lokalt hardkodet CAREER_NODES-datasett.
 */

import { useState, useEffect, useRef } from "react";
import type { EnrichedCareer } from "@/lib/karriere/data-service";
import { enrichCareerWithLiveData } from "@/lib/karriere/data-service";

/**
 * Henter karrieredata asynkront med Firestore-fallback.
 * Returnerer { careers, loading, error, source }.
 */
export function useCareerData() {
  const [careers, setCareers] = useState<EnrichedCareer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<"firestore" | "local" | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    async function load() {
      try {
        // Dynamisk import for å unngå at Firestore-klienten lastes unødvendig
        const { getCareerData } = await import("@/lib/karriere/data-service");
        const data = await getCareerData();
        setCareers(data);
        setSource(data.length > 0 ? data[0].source : "local");
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Kunne ikke laste karrieredata"));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { careers, loading, error, source };
}

/**
 * Henter live-data for en enkelt karriere (stillingsantall + studieprogram).
 */
export function useCareerLiveData(careerId: string | null) {
  const [data, setData] = useState<{
    activeJobs: number;
    studyPrograms: { name: string; institution: string; requiredGpa: number | null; url: string | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!careerId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    enrichCareerWithLiveData(careerId).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setData(null);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [careerId]);

  return { data, loading };
}
