import { trackEvent } from "@/lib/firebase/analytics";

/** Onboarding-hendelser */
export const onboardingEvents = {
  stepCompleted: (step: number, total: number) =>
    trackEvent("onboarding_step_completed", { step, total }),
  testCompleted: (testType: "big_five" | "riasec", durationMs: number) =>
    trackEvent("onboarding_test_completed", { test_type: testType, duration_ms: durationMs }),
  profileCreated: () => trackEvent("onboarding_profile_created"),
};

/** Chat-hendelser */
export const chatEvents = {
  messageSent: () => trackEvent("chat_message_sent"),
  crisisDetected: () => trackEvent("chat_crisis_detected"),
  responseReceived: (latencyMs: number) =>
    trackEvent("chat_response_received", { latency_ms: latencyMs }),
  ragUsed: (sourceCount: number) =>
    trackEvent("chat_rag_used", { source_count: sourceCount }),
};

/** Karriere-hendelser */
export const karriereEvents = {
  pathExplored: (pathId: string) =>
    trackEvent("karriere_path_explored", { path_id: pathId }),
  pathFavorited: (pathId: string) =>
    trackEvent("karriere_path_favorited", { path_id: pathId }),
};

/** CV-hendelser */
export const cvEvents = {
  generated: () => trackEvent("cv_generated"),
  downloaded: (format: string) =>
    trackEvent("cv_downloaded", { format }),
};

/** Konvertering-hendelser */
export const conversionEvents = {
  pricingSeen: () => trackEvent("pricing_page_viewed"),
  checkoutStarted: (plan: string) =>
    trackEvent("stripe_checkout_started", { plan }),
};

/** Gamification-hendelser */
export const gamificationEvents = {
  badgeEarned: (badgeId: string) =>
    trackEvent("badge_earned", { badge_id: badgeId }),
  levelUp: (newLevel: number) =>
    trackEvent("level_up", { new_level: newLevel }),
};
