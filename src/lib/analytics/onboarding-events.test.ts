/**
 * Tester for onboarding analytics (#143)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ONBOARDING_EVENTS,
  ACTIVATION_STEPS,
  trackOnboardingStarted,
  trackOnboardingStep,
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
  trackPersonalityTest,
  trackCareerExplorer,
  trackAiChat,
  trackFeatureUsed,
  trackUserActivated,
  markOnboardingStart,
  calculateTTV,
  clearOnboardingStart,
} from "./onboarding-events";

// Mock Firebase analytics
vi.mock("@/lib/firebase/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { trackEvent } from "@/lib/firebase/analytics";

const mockTrackEvent = vi.mocked(trackEvent);

// ─── Event-konstanter ────────────────────────────────────────────────────────

describe("ONBOARDING_EVENTS", () => {
  it("definerer alle påkrevde events", () => {
    expect(ONBOARDING_EVENTS.ONBOARDING_STARTED).toBe("onboarding_started");
    expect(ONBOARDING_EVENTS.ONBOARDING_COMPLETED).toBe("onboarding_completed");
    expect(ONBOARDING_EVENTS.ONBOARDING_ABANDONED).toBe("onboarding_abandoned");
    expect(ONBOARDING_EVENTS.PERSONALITY_TEST_STARTED).toBe("personality_test_started");
    expect(ONBOARDING_EVENTS.PERSONALITY_TEST_COMPLETED).toBe("personality_test_completed");
    expect(ONBOARDING_EVENTS.CAREER_EXPLORER_OPENED).toBe("career_explorer_opened");
    expect(ONBOARDING_EVENTS.AI_CHAT_FIRST_MESSAGE).toBe("ai_chat_first_message");
    expect(ONBOARDING_EVENTS.CV_CREATED).toBe("cv_created");
    expect(ONBOARDING_EVENTS.USER_ACTIVATED).toBe("user_activated");
    expect(ONBOARDING_EVENTS.FEATURE_USED).toBe("feature_used");
  });
});

describe("ACTIVATION_STEPS", () => {
  it("har 6 aktiveringssteg", () => {
    expect(ACTIVATION_STEPS).toHaveLength(6);
  });

  it("steg er nummerert 1-6", () => {
    ACTIVATION_STEPS.forEach((s, i) => {
      expect(s.step).toBe(i + 1);
    });
  });

  it("steg 3 er personlighetstest fullført (aha-øyeblikk #1)", () => {
    expect(ACTIVATION_STEPS[2].name).toBe("personality_test_completed");
  });

  it("steg 5 er første AI-chat (aktivering)", () => {
    expect(ACTIVATION_STEPS[4].name).toBe("ai_chat_first_message");
  });
});

// ─── Tracking-funksjoner ─────────────────────────────────────────────────────

describe("tracking-funksjoner", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it("trackOnboardingStarted sender event med kilde", () => {
    trackOnboardingStarted("feide");
    expect(mockTrackEvent).toHaveBeenCalledWith("onboarding_started", expect.objectContaining({
      auth_source: "feide",
    }));
  });

  it("trackOnboardingStep sender steg-info", () => {
    trackOnboardingStep(2, "personality_test_started", 5000);
    expect(mockTrackEvent).toHaveBeenCalledWith("onboarding_step_completed", {
      step: 2,
      step_name: "personality_test_started",
      duration_ms: 5000,
    });
  });

  it("trackOnboardingCompleted sender total varighet", () => {
    trackOnboardingCompleted(120_000, 4);
    expect(mockTrackEvent).toHaveBeenCalledWith("onboarding_completed", {
      total_duration_ms: 120_000,
      steps_completed: 4,
    });
  });

  it("trackOnboardingAbandoned sender siste steg", () => {
    trackOnboardingAbandoned(3, "personality_test_completed");
    expect(mockTrackEvent).toHaveBeenCalledWith("onboarding_abandoned", {
      last_step: 3,
      last_step_name: "personality_test_completed",
    });
  });

  it("trackPersonalityTest sender test-type", () => {
    trackPersonalityTest("started", "riasec");
    expect(mockTrackEvent).toHaveBeenCalledWith("personality_test_started", {
      test_type: "riasec",
    });
  });

  it("trackPersonalityTest inkluderer varighet ved fullføring", () => {
    trackPersonalityTest("completed", "bigfive", 45_000);
    expect(mockTrackEvent).toHaveBeenCalledWith("personality_test_completed", {
      test_type: "bigfive",
      duration_ms: 45_000,
    });
  });

  it("trackCareerExplorer sender opened-event", () => {
    trackCareerExplorer("opened");
    expect(mockTrackEvent).toHaveBeenCalledWith("career_explorer_opened", {});
  });

  it("trackCareerExplorer inkluderer karriere-id ved lagring", () => {
    trackCareerExplorer("saved", "dataingeniør");
    expect(mockTrackEvent).toHaveBeenCalledWith("career_path_saved", {
      career_id: "dataingeniør",
    });
  });

  it("trackAiChat sender first_message-event", () => {
    trackAiChat("first_message");
    expect(mockTrackEvent).toHaveBeenCalledWith("ai_chat_first_message", {});
  });

  it("trackFeatureUsed sender modul-navn", () => {
    trackFeatureUsed("karriere");
    expect(mockTrackEvent).toHaveBeenCalledWith("feature_used", { module: "karriere" });
  });

  it("trackUserActivated sender TTV", () => {
    trackUserActivated(180_000);
    expect(mockTrackEvent).toHaveBeenCalledWith("user_activated", {
      ttv_ms: 180_000,
      ttv_minutes: 3,
    });
  });
});

// ─── TTV-beregning ───────────────────────────────────────────────────────────

describe("TTV (Time to Value)", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("markOnboardingStart lagrer tidsstempel", () => {
    markOnboardingStart();
    const stored = sessionStorage.getItem("suksess_onboarding_start");
    expect(stored).not.toBeNull();
    expect(parseInt(stored!, 10)).toBeGreaterThan(0);
  });

  it("markOnboardingStart lagrer ikke på nytt hvis allerede satt", () => {
    markOnboardingStart();
    const first = sessionStorage.getItem("suksess_onboarding_start");
    markOnboardingStart(); // andre gang
    const second = sessionStorage.getItem("suksess_onboarding_start");
    expect(first).toBe(second);
  });

  it("calculateTTV returnerer varighet i ms", () => {
    sessionStorage.setItem("suksess_onboarding_start", String(Date.now() - 5000));
    const ttv = calculateTTV();
    expect(ttv).not.toBeNull();
    expect(ttv!).toBeGreaterThanOrEqual(5000);
    expect(ttv!).toBeLessThan(6000);
  });

  it("calculateTTV returnerer null uten startpunkt", () => {
    expect(calculateTTV()).toBeNull();
  });

  it("clearOnboardingStart fjerner startpunktet", () => {
    markOnboardingStart();
    expect(calculateTTV()).not.toBeNull();
    clearOnboardingStart();
    expect(calculateTTV()).toBeNull();
  });
});
