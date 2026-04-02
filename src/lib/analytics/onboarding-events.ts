/**
 * Onboarding analytics — aktiveringshendelser og TTV-tracking (#143)
 *
 * Definerer strukturerte events for PostHog og Firebase Analytics.
 * Brukes til funnel-analyse, aktiveringsrate og B2B-rapportering.
 *
 * Aktiveringsfunnel:
 *   1. Konto opprettet
 *   2. Personlighetstest startet
 *   3. Personlighetstest fullført → Aha-øyeblikk #1
 *   4. Karrierestiutforsker besøkt → Aha-øyeblikk #2
 *   5. Første AI-chat → Aktivert bruker
 *   6. CV opprettet / Karrieremål satt → Engasjert bruker
 */

import { trackEvent } from "@/lib/firebase/analytics";

// ─── Event-navn (konstanter for konsistens) ──────────────────────────────────

export const ONBOARDING_EVENTS = {
  // Onboarding-flyt
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_ABANDONED: "onboarding_abandoned",

  // Personlighetstest
  PERSONALITY_TEST_STARTED: "personality_test_started",
  PERSONALITY_TEST_COMPLETED: "personality_test_completed",

  // Karriereutforsking
  CAREER_EXPLORER_OPENED: "career_explorer_opened",
  CAREER_PATH_SAVED: "career_path_saved",

  // AI-chat
  AI_CHAT_FIRST_MESSAGE: "ai_chat_first_message",
  AI_CHAT_SESSION_COMPLETED: "ai_chat_session_completed",

  // Engasjement
  CV_CREATED: "cv_created",
  JOB_MATCH_VIEWED: "job_match_viewed",
  FEATURE_USED: "feature_used",

  // Aktivering
  USER_ACTIVATED: "user_activated",
} as const;

export type OnboardingEventName = (typeof ONBOARDING_EVENTS)[keyof typeof ONBOARDING_EVENTS];

// ─── Aktiveringssteg ─────────────────────────────────────────────────────────

export const ACTIVATION_STEPS = [
  { step: 1, name: "account_created", label: "Konto opprettet" },
  { step: 2, name: "personality_test_started", label: "Personlighetstest startet" },
  { step: 3, name: "personality_test_completed", label: "Personlighetstest fullført" },
  { step: 4, name: "career_explorer_opened", label: "Karrierestiutforsker besøkt" },
  { step: 5, name: "ai_chat_first_message", label: "Første AI-chat" },
  { step: 6, name: "cv_created", label: "CV opprettet" },
] as const;

// ─── Event-tracking funksjoner ───────────────────────────────────────────────

type AuthSource = "feide" | "google" | "email" | "anonymous";

/** Spor at onboarding er startet */
export function trackOnboardingStarted(source: AuthSource) {
  trackEvent(ONBOARDING_EVENTS.ONBOARDING_STARTED, {
    auth_source: source,
    timestamp: Date.now(),
  });
}

/** Spor fullført onboarding-steg */
export function trackOnboardingStep(step: number, stepName: string, durationMs: number) {
  trackEvent(ONBOARDING_EVENTS.ONBOARDING_STEP_COMPLETED, {
    step,
    step_name: stepName,
    duration_ms: durationMs,
  });
}

/** Spor at onboarding er fullført */
export function trackOnboardingCompleted(totalDurationMs: number, stepsCompleted: number) {
  trackEvent(ONBOARDING_EVENTS.ONBOARDING_COMPLETED, {
    total_duration_ms: totalDurationMs,
    steps_completed: stepsCompleted,
  });
}

/** Spor at onboarding er forlatt */
export function trackOnboardingAbandoned(lastStep: number, lastStepName: string) {
  trackEvent(ONBOARDING_EVENTS.ONBOARDING_ABANDONED, {
    last_step: lastStep,
    last_step_name: lastStepName,
  });
}

/** Spor personlighetstest-hendelser */
export function trackPersonalityTest(event: "started" | "completed", testType: "bigfive" | "riasec", durationMs?: number) {
  const eventName = event === "started"
    ? ONBOARDING_EVENTS.PERSONALITY_TEST_STARTED
    : ONBOARDING_EVENTS.PERSONALITY_TEST_COMPLETED;

  trackEvent(eventName, {
    test_type: testType,
    ...(durationMs !== undefined && { duration_ms: durationMs }),
  });
}

/** Spor karriereutforsking */
export function trackCareerExplorer(event: "opened" | "saved", careerId?: string) {
  const eventName = event === "opened"
    ? ONBOARDING_EVENTS.CAREER_EXPLORER_OPENED
    : ONBOARDING_EVENTS.CAREER_PATH_SAVED;

  trackEvent(eventName, {
    ...(careerId && { career_id: careerId }),
  });
}

/** Spor AI-chat-hendelser */
export function trackAiChat(event: "first_message" | "session_completed", messageCount?: number) {
  const eventName = event === "first_message"
    ? ONBOARDING_EVENTS.AI_CHAT_FIRST_MESSAGE
    : ONBOARDING_EVENTS.AI_CHAT_SESSION_COMPLETED;

  trackEvent(eventName, {
    ...(messageCount !== undefined && { message_count: messageCount }),
  });
}

/** Spor feature-bruk (generisk) */
export function trackFeatureUsed(
  module: "cv" | "karriere" | "jobbmatch" | "analyse" | "veileder" | "studier" | "soknadscoach" | "fremgang"
) {
  trackEvent(ONBOARDING_EVENTS.FEATURE_USED, { module });
}

/** Spor brukeraktivering (nådd steg 5: første AI-chat) */
export function trackUserActivated(ttvMs: number) {
  trackEvent(ONBOARDING_EVENTS.USER_ACTIVATED, {
    ttv_ms: ttvMs,
    ttv_minutes: Math.round(ttvMs / 60_000),
  });
}

// ─── TTV (Time to Value) beregning ──────────────────────────────────────────

const TTV_STORAGE_KEY = "suksess_onboarding_start";

/** Lagre starttidspunkt for TTV-beregning */
export function markOnboardingStart() {
  if (typeof window === "undefined") return;
  if (!sessionStorage.getItem(TTV_STORAGE_KEY)) {
    sessionStorage.setItem(TTV_STORAGE_KEY, String(Date.now()));
  }
}

/** Beregn TTV fra onboarding-start til nå */
export function calculateTTV(): number | null {
  if (typeof window === "undefined") return null;
  const start = sessionStorage.getItem(TTV_STORAGE_KEY);
  if (!start) return null;
  return Date.now() - parseInt(start, 10);
}

/** Slett TTV-markering etter fullført aktivering */
export function clearOnboardingStart() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TTV_STORAGE_KEY);
}
