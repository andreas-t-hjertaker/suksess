"use client";

/**
 * LiveRegion — ARIA live region for dynamisk innhold (WCAG 2.1, 4.1.3)
 *
 * Brukes for å annonsere:
 * - AI-svar under streaming
 * - Statusmeldinger (lagring, feil, fullføring)
 * - Sidenavigasjon (route-endringer)
 *
 * polite: Leser opp etter gjeldende tekst er ferdig lest
 * assertive: Avbryter og leser opp umiddelbart (kun for feil)
 */

import { useEffect, useRef, type ReactNode } from "react";

type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive" | "off";
  clearDelay?: number;
  className?: string;
};

/**
 * Usynlig live region som annonserer dynamisk innhold til skjermlesere.
 * Trikset: bytt innhold via tom streng → ny melding for å trigge re-annonsering.
 */
export function LiveRegion({
  message,
  politeness = "polite",
  clearDelay = 5000,
  className,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!regionRef.current || !message) return;

    // Tøm og sett ny melding for å sikre re-annonsering
    regionRef.current.textContent = "";
    const timer = setTimeout(() => {
      if (regionRef.current) regionRef.current.textContent = message;
    }, 100);

    // Rens etter clearDelay
    if (clearDelay > 0) {
      timerRef.current = setTimeout(() => {
        if (regionRef.current) regionRef.current.textContent = "";
      }, clearDelay);
    }

    return () => {
      clearTimeout(timer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, clearDelay]);

  return (
    <span
      ref={regionRef}
      aria-live={politeness}
      aria-atomic="true"
      className={className ?? "sr-only"}
      role={politeness === "assertive" ? "alert" : "status"}
    />
  );
}

// ---------------------------------------------------------------------------
// Imperativ API for bruk utenfor React-komponenttreet
// ---------------------------------------------------------------------------

let globalPoliteRegion: HTMLElement | null = null;
let globalAssertiveRegion: HTMLElement | null = null;

/** Initialiser globale live regions. Kall fra layout.tsx. */
export function initLiveRegions() {
  if (typeof document === "undefined") return;

  if (!globalPoliteRegion) {
    globalPoliteRegion = document.createElement("div");
    globalPoliteRegion.setAttribute("aria-live", "polite");
    globalPoliteRegion.setAttribute("aria-atomic", "true");
    globalPoliteRegion.setAttribute("role", "status");
    globalPoliteRegion.className = "sr-only";
    document.body.appendChild(globalPoliteRegion);
  }

  if (!globalAssertiveRegion) {
    globalAssertiveRegion = document.createElement("div");
    globalAssertiveRegion.setAttribute("aria-live", "assertive");
    globalAssertiveRegion.setAttribute("aria-atomic", "true");
    globalAssertiveRegion.setAttribute("role", "alert");
    globalAssertiveRegion.className = "sr-only";
    document.body.appendChild(globalAssertiveRegion);
  }
}

/** Annonser en melding til skjermlesere (polite). */
export function announce(message: string) {
  if (!globalPoliteRegion) initLiveRegions();
  if (!globalPoliteRegion) return;
  globalPoliteRegion.textContent = "";
  setTimeout(() => { if (globalPoliteRegion) globalPoliteRegion.textContent = message; }, 100);
}

/** Annonser en feilmelding til skjermlesere (assertive). */
export function announceError(message: string) {
  if (!globalAssertiveRegion) initLiveRegions();
  if (!globalAssertiveRegion) return;
  globalAssertiveRegion.textContent = "";
  setTimeout(() => { if (globalAssertiveRegion) globalAssertiveRegion.textContent = message; }, 100);
}

// ---------------------------------------------------------------------------
// RouteAnnouncer — annonserer sidenavigasjon for skjermlesere
// ---------------------------------------------------------------------------

type RouteAnnouncerProps = {
  children: ReactNode;
};

/**
 * Wrapper som annonserer tittelen på ny side ved navigasjon.
 * Plasser rundt children i layout.tsx.
 */
export function RouteAnnouncer({ children }: RouteAnnouncerProps) {
  return (
    <>
      {children}
      <div
        id="route-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
