/**
 * Implisitt profilering — sporer brukeratferd og justerer personlighetsprofilen gradvis.
 *
 * Signaler:
 * - Navigasjonsmønster (utforskende vs. lineær)
 * - Tid brukt på analytiske vs. visuelle seksjoner
 * - Klikk på detaljert info vs. oppsummering
 * - Scroll-hastighet gjennom innhold
 */

import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { BigFiveScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// Signaltyper
// ---------------------------------------------------------------------------

export type ImplicitSignal =
  | "click_detail"       // Klikket på "Vis mer detaljer"
  | "click_summary"      // Foretrakk kortvisning
  | "explore_career"     // Utforsket karrierestiutforskeren
  | "explore_studies"    // Utforsket studieprogrammer
  | "fast_scroll"        // Scroller raskt forbi innhold
  | "slow_scroll"        // Leser grundig
  | "use_filter"         // Bruker filter/sortering aktivt
  | "open_ai_chat"       // Initierer AI-samtale
  | "complete_exercise"  // Fullfører frivillig øvelse
  | "skip_exercise"      // Hopper over øvelse
  | "dark_mode_on"       // Velger mørk modus
  | "share_result";      // Deler resultat

// Vekting av signaler på Big Five (delta: positivt øker, negativt senker)
const SIGNAL_WEIGHTS: Record<ImplicitSignal, Partial<BigFiveScores>> = {
  click_detail:      { conscientiousness: +0.3, openness: +0.2 },
  click_summary:     { conscientiousness: -0.2, extraversion: +0.1 },
  explore_career:    { openness: +0.4, conscientiousness: +0.2 },
  explore_studies:   { openness: +0.3, conscientiousness: +0.3 },
  fast_scroll:       { conscientiousness: -0.3, neuroticism: +0.1 },
  slow_scroll:       { conscientiousness: +0.3, openness: +0.1 },
  use_filter:        { conscientiousness: +0.4, openness: -0.1 },
  open_ai_chat:      { openness: +0.2, agreeableness: +0.2, extraversion: +0.1 },
  complete_exercise: { conscientiousness: +0.5, openness: +0.2 },
  skip_exercise:     { conscientiousness: -0.3, neuroticism: +0.2 },
  dark_mode_on:      { openness: +0.1 },
  share_result:      { extraversion: +0.3, agreeableness: +0.2 },
};

// Maks justerings-delta per signal (1% av 100-skala)
const MAX_DELTA = 1.0;
// Klamp: profil-scorer forblir i 0–100
function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

// ---------------------------------------------------------------------------
// Session-buffer (unngå Firestore-skriving for hvert signal)
// ---------------------------------------------------------------------------

type SignalBuffer = Partial<Record<ImplicitSignal, number>>;
const sessionBuffer: SignalBuffer = {};

/** Registrer et implisitt signal i session-bufferen */
export function trackSignal(signal: ImplicitSignal) {
  sessionBuffer[signal] = (sessionBuffer[signal] ?? 0) + 1;
}

/** Tøm bufferen og returner akkumulerte delta */
function flushBuffer(): Partial<BigFiveScores> {
  const delta: Partial<BigFiveScores> = {};

  for (const [signal, count] of Object.entries(sessionBuffer)) {
    const weights = SIGNAL_WEIGHTS[signal as ImplicitSignal];
    for (const [trait, weight] of Object.entries(weights)) {
      const key = trait as keyof BigFiveScores;
      const adj = Math.min(weight! * (count ?? 1), MAX_DELTA);
      delta[key] = (delta[key] ?? 0) + adj;
    }
    delete sessionBuffer[signal as ImplicitSignal];
  }

  return delta;
}

// ---------------------------------------------------------------------------
// Firestore-oppdatering
// ---------------------------------------------------------------------------

/**
 * Persister akkumulerte signal-justeringer til brukerens personlighetsprofil.
 * Kalles ved sesjonsavslutning eller periodisk (f.eks. hvert 5. minutt).
 */
export async function persistImplicitAdjustments(userId: string): Promise<void> {
  const delta = flushBuffer();
  if (Object.keys(delta).length === 0) return;

  try {
    const profileRef = doc(db, "profiles", userId);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return;

    const profile = snap.data() as { bigFive?: BigFiveScores };
    if (!profile.bigFive) return;
    const current = profile.bigFive;

    const updated: BigFiveScores = {
      openness:          clamp(current.openness          + (delta.openness          ?? 0)),
      conscientiousness: clamp(current.conscientiousness + (delta.conscientiousness ?? 0)),
      extraversion:      clamp(current.extraversion      + (delta.extraversion      ?? 0)),
      agreeableness:     clamp(current.agreeableness     + (delta.agreeableness     ?? 0)),
      neuroticism:       clamp(current.neuroticism       + (delta.neuroticism       ?? 0)),
    };

    await updateDoc(profileRef, {
      "bigFive": updated,
      "implicitAdjustments": {
        lastApplied: serverTimestamp(),
        totalSessions: 1, // Inkrementert via Firestore increment i produksjon
      },
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Implisitt justering er ikke kritisk — feiler stille
  }
}

// ---------------------------------------------------------------------------
// React-hook for enkel bruk i komponenter
// ---------------------------------------------------------------------------

/**
 * Returnerer en `track`-funksjon som komponenter kaller ved brukerinteraksjoner.
 * Flusher automatisk ved sidenavigasjon (beforeunload).
 *
 * NB: Dette er ikke en React hook — ikke kall betinget.
 * Bruk `useImplicitTracker` hookene i hooks-mappen.
 */
export function createImplicitTracker(userId: string | null) {
  if (!userId) {
    return { track: (_signal: ImplicitSignal) => {} };
  }

  // Flush ved sidenavigasjon
  if (typeof window !== "undefined") {
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        persistImplicitAdjustments(userId);
      }
    });
  }

  return {
    track: (signal: ImplicitSignal) => trackSignal(signal),
    flush: () => persistImplicitAdjustments(userId),
  };
}
