"use client";

/**
 * useOpptaksdata — hook for live Samordna Opptak-data (#107).
 *
 * Kombinerer RIASEC-matchede studieprogram med poenggrenser, sjanse-beregning
 * og trenddata. Faller tilbake til hardkodede STUDY_PROGRAMS ved API-feil.
 *
 * Datakilde-prioritet:
 * 1. Live: finnMatchendeStudieprogram() → utdanning.no API (cachet 24t)
 * 2. Fallback: STUDY_PROGRAMS fra calculator.ts (47 programmer)
 */

import { useState, useEffect, useRef } from "react";
import {
  finnMatchendeStudieprogram,
  beregSjanse,
  beregTrend,
  hentPoenggrenser,
} from "@/lib/studiedata/samordna-opptak-live";
import { STUDY_PROGRAMS } from "@/lib/grades/calculator";
import { fetchProgramTrend } from "@/lib/grades/trend-service";
import type { TrendEntry } from "@/components/trend-sparkline";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type LiveStudyProgram = {
  kode: string;
  navn: string;
  institusjon: string;
  niva: string;
  poenggrense: number | null;
  topPoeng: number | null;
  sjanse: "god" | "usikker" | "lav" | "ukjent";
  poengDiff: number | null;
  trend: TrendEntry[];
  trendRetning: "stigende" | "stabil" | "synkende" | "ukjent";
  antallPlasser: number | null;
  url: string | null;
  kilde: "live" | "fallback";
};

type OpptaksdataState = {
  programs: LiveStudyProgram[];
  loading: boolean;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Fallback: konverter STUDY_PROGRAMS til LiveStudyProgram
// ---------------------------------------------------------------------------

function fallbackPrograms(elevPoeng: number): LiveStudyProgram[] {
  return STUDY_PROGRAMS.map((sp) => {
    const { sjanse, diff } = beregSjanse(elevPoeng, sp.requiredPoints);
    return {
      kode: `${sp.name}|${sp.institution}`,
      navn: sp.name,
      institusjon: sp.institution,
      niva: "bachelor",
      poenggrense: sp.requiredPoints,
      topPoeng: sp.topPoints,
      sjanse,
      poengDiff: diff,
      trend: [],
      trendRetning: "ukjent" as const,
      antallPlasser: null,
      url: sp.url || null,
      kilde: "fallback" as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOpptaksdata(
  elevPoeng: number,
  riasecKode: string
): OpptaksdataState {
  const [state, setState] = useState<OpptaksdataState>({
    programs: [],
    loading: true,
    error: null,
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    const isStale = () => currentRequestId !== requestIdRef.current;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        // Prøv live data fra utdanning.no / Firestore
        const matches = riasecKode
          ? await finnMatchendeStudieprogram(riasecKode, elevPoeng, 30)
          : [];

        if (isStale()) return;

        if (matches.length > 0) {
          // Hent trenddata parallelt for topp 15 programmer
          const topMatches = matches.slice(0, 15);
          const trendPromises = topMatches.map(async (m) => {
            try {
              const historikk = await hentPoenggrenser(m.program.kode);
              const trend: TrendEntry[] = historikk.map((h) => ({
                year: h.aar,
                required: h.ordinaer ?? 0,
                top: h.fvitnemaal ?? h.ordinaer ?? 0,
              }));
              return {
                kode: m.program.kode,
                trend,
                trendRetning: beregTrend(historikk),
              };
            } catch {
              return { kode: m.program.kode, trend: [] as TrendEntry[], trendRetning: "ukjent" as const };
            }
          });

          const trendResults = await Promise.all(trendPromises);
          if (isStale()) return;

          const trendMap = new Map(trendResults.map((t) => [t.kode, t]));

          const programs: LiveStudyProgram[] = matches.map((m) => {
            const trendData = trendMap.get(m.program.kode);
            return {
              kode: m.program.kode,
              navn: m.program.navn,
              institusjon: m.program.institusjon,
              niva: m.program.niva,
              poenggrense: m.program.poenggrenser?.ordinaer ?? null,
              topPoeng: m.program.poenggrenser?.forstegangsvitnemaal ?? null,
              sjanse: m.sjanse,
              poengDiff: m.poengDiff,
              trend: trendData?.trend ?? [],
              trendRetning: trendData?.trendRetning ?? "ukjent",
              antallPlasser: m.program.antallStudieplasser,
              url: m.program.url,
              kilde: "live",
            };
          });

          setState({ programs, loading: false, error: null });
          return;
        }

        // Fallback: bruk hardkodede programmer med trend-service
        const fb = fallbackPrograms(elevPoeng);

        // Hent trender asynkront for fallback (top 10)
        const trendPromises = fb.slice(0, 10).map(async (p) => {
          try {
            const trend = await fetchProgramTrend(p.navn, p.institusjon);
            return {
              kode: p.kode,
              trend: trend.years,
              trendRetning: beregTrend(
                trend.years.map((t) => ({ ordinaer: t.required }))
              ),
            };
          } catch {
            return { kode: p.kode, trend: [] as TrendEntry[], trendRetning: "ukjent" as const };
          }
        });

        const trendResults = await Promise.all(trendPromises);
        if (isStale()) return;

        const trendMap = new Map(trendResults.map((t) => [t.kode, t]));
        const enriched = fb.map((p) => {
          const trendData = trendMap.get(p.kode);
          return {
            ...p,
            trend: trendData?.trend ?? [],
            trendRetning: trendData?.trendRetning ?? ("ukjent" as const),
          };
        });

        setState({ programs: enriched, loading: false, error: null });
      } catch (err) {
        if (isStale()) return;

        // Total fallback uten trender
        const fb = fallbackPrograms(elevPoeng);
        setState({
          programs: fb,
          loading: false,
          error: err instanceof Error ? err.message : "Feil ved henting av opptaksdata",
        });
      }
    }

    load();

    return () => {
      // Ny request-ID ved neste effect-kjøring invaliderer pågående requests
    };
  }, [elevPoeng, riasecKode]);

  return state;
}
