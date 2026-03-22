"use client";

/**
 * useImplicitProfiling — sporer implisitte atferdssignaler og justerer
 * PersonalityUIConfig gradvis over tid (issue #6).
 *
 * Signaler som spores (anonymisert):
 * - Navigasjonsmønster: lineær vs. utforskende
 * - Innholdsvalg: tekst vs. visuelt
 * - Scroll-hastighet (proxy for animasjonstolerance)
 * - Tid på sider (engasjement)
 *
 * Justeringene er subtile og ikke-inngripende.
 */

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePersonality } from "@/components/personality-provider";

// ---------------------------------------------------------------------------
// Lokalt atferdsminne (ikke-persisterbart — reset ved reload)
// ---------------------------------------------------------------------------

type BehaviorSignals = {
  pagesVisited: Set<string>;
  totalClicks: number;
  avgTimeOnPage: number;
  visualPageVisits: number; // Besøk på karriere/analyse/graf
  analyticalPageVisits: number; // Besøk på karakterer/dokumenter
  fastScrollCount: number;
};

const signals: BehaviorSignals = {
  pagesVisited: new Set(),
  totalClicks: 0,
  avgTimeOnPage: 0,
  visualPageVisits: 0,
  analyticalPageVisits: 0,
  fastScrollCount: 0,
};

const VISUAL_PAGES = ["/dashboard/karriere", "/dashboard/karrieregraf", "/dashboard/analyse", "/dashboard/veileder"];
const ANALYTICAL_PAGES = ["/dashboard/karakterer", "/dashboard/dokumenter", "/dashboard/mine-data", "/dashboard/fremgang"];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useImplicitProfiling() {
  const pathname = usePathname();
  const { overrideConfig } = usePersonality();
  // Initialiser med 0, sett riktig tid i effect (unngår impure Date.now() under render)
  const pageEntryTime = useRef<number>(0);

  function adjustUiFromSignals() {
    const totalVisits = signals.visualPageVisits + signals.analyticalPageVisits;
    if (totalVisits < 3) return;

    const visualRatio = signals.visualPageVisits / totalVisits;
    const exploratoryNav = signals.pagesVisited.size > 5;

    if (signals.fastScrollCount > 10) {
      overrideConfig({ animationIntensity: "subtle" });
    }
    if (exploratoryNav) {
      overrideConfig({ navigationStyle: "exploratory" });
    }
    if (visualRatio > 0.7) {
      overrideConfig({ infoDensity: "minimal" });
    } else if (visualRatio < 0.3) {
      overrideConfig({ infoDensity: "detailed" });
    }
  }

  // Initialiser pageEntryTime ved mount
  useEffect(() => {
    pageEntryTime.current = Date.now();
  }, []);

  // Spor sideskifte
  useEffect(() => {
    signals.pagesVisited.add(pathname);

    if (VISUAL_PAGES.some((p) => pathname.startsWith(p))) {
      signals.visualPageVisits++;
    } else if (ANALYTICAL_PAGES.some((p) => pathname.startsWith(p))) {
      signals.analyticalPageVisits++;
    }

    // Registrer tid på forrige side
    const timeSpent = (Date.now() - pageEntryTime.current) / 1000;
    if (signals.avgTimeOnPage === 0) {
      signals.avgTimeOnPage = timeSpent;
    } else {
      signals.avgTimeOnPage = (signals.avgTimeOnPage + timeSpent) / 2;
    }
    pageEntryTime.current = Date.now();

    adjustUiFromSignals();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spor hurtig scroll (proxy for animasjonstolerance)
  useEffect(() => {
    let lastY = 0;
    let lastTime = Date.now();

    function onScroll() {
      const now = Date.now();
      const deltaY = Math.abs(window.scrollY - lastY);
      const deltaT = now - lastTime;
      if (deltaT > 0 && deltaY / deltaT > 5) {
        // Hurtig scroll: > 5px/ms
        signals.fastScrollCount++;
      }
      lastY = window.scrollY;
      lastTime = now;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const trackClick = useCallback((_elementType: string) => {
    signals.totalClicks++;
    // Logg implisitt preferanse uten å sende data eksternt
  }, []);

  return { trackClick };
}
