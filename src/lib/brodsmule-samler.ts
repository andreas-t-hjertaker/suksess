/**
 * Brødsmule-samler — sporer siste brukerhandlinger for feilrapport-kontekst.
 *
 * Ringbuffer som lagrer de siste 20 handlingene (navigering, klikk, API-kall, feil).
 * Brukes av useFeedback-hooken for å sende kontekst med tilbakemeldinger.
 */

import type { Brodsmuler } from "@/types/domain";

const MAX_BRODSMLER = 20;
const brodsmler: Brodsmuler[] = [];

/**
 * Legg til en brødsmule (brukerhandling).
 * Gamle handlinger fjernes automatisk når bufferen er full.
 */
export function leggTilBrodsmuler(
  handling: string,
  data?: Record<string, unknown>
): void {
  brodsmler.push({
    handling,
    tidspunkt: Date.now(),
    data,
  });

  // Hold bufferen på maks størrelse
  while (brodsmler.length > MAX_BRODSMLER) {
    brodsmler.shift();
  }
}

/** Hent alle lagrede brødsmler (kopi) */
export function hentBrodsmler(): Brodsmuler[] {
  return [...brodsmler];
}

/** Tøm alle brødsmler (etter innsending) */
export function tomBrodsmler(): void {
  brodsmler.length = 0;
}

// ---------------------------------------------------------------------------
// Nettleser-/OS-deteksjon
// ---------------------------------------------------------------------------

/** Enkel nettleser-deteksjon basert på user agent */
export function detekterNettleser(): string {
  if (typeof navigator === "undefined") return "ukjent";
  const ua = navigator.userAgent;

  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "annen";
}

/** Enkel OS-deteksjon basert på user agent */
export function detekterOS(): string {
  if (typeof navigator === "undefined") return "ukjent";
  const ua = navigator.userAgent;

  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "annen";
}

/** Hent skjermstørrelse som "BxH" streng */
export function hentSkjermstorrelse(): string {
  if (typeof window === "undefined") return "ukjent";
  return `${window.innerWidth}x${window.innerHeight}`;
}
