/**
 * Zod-skjemaer for alle Firestore-dokumenttyper.
 *
 * Brukes av parseDoc() for runtime-validering istedenfor usikre `as`-casts.
 * Speiler typene i domain.ts — hold synkronisert.
 *
 * Zod v4 (^4.3.6)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

/** Firestore Timestamp — aksepterer ethvert objekt med toDate() eller null. */
const firestoreTimestamp = z
  .object({ toDate: z.function() })
  .nullable()
  .optional();

const withFirestoreTimestamps = {
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
};

// ---------------------------------------------------------------------------
// Big Five (OCEAN)
// ---------------------------------------------------------------------------

export const BigFiveScoresSchema = z.object({
  openness: z.number(),
  conscientiousness: z.number(),
  extraversion: z.number(),
  agreeableness: z.number(),
  neuroticism: z.number(),
});

// ---------------------------------------------------------------------------
// RIASEC
// ---------------------------------------------------------------------------

export const RiasecScoresSchema = z.object({
  realistic: z.number(),
  investigative: z.number(),
  artistic: z.number(),
  social: z.number(),
  enterprising: z.number(),
  conventional: z.number(),
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum([
  "student",
  "counselor",
  "admin",
  "superadmin",
]);

export const TenantTypeSchema = z.enum(["vgs", "uh", "independent"]);

export const LearningStyleSchema = z.enum([
  "visual",
  "auditory",
  "kinesthetic",
  "reading",
]);

export const TestTypeSchema = z.enum([
  "big_five",
  "riasec",
  "strengths",
  "learning_style",
]);

export const TermTypeSchema = z.enum(["vt", "ht"]);

export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);

export const GeneratedContentTypeSchema = z.enum([
  "study_tip",
  "career_suggestion",
  "strength_insight",
  "weekly_challenge",
  "study_plan",
]);

// ---------------------------------------------------------------------------
// UserDoc — users/{userId}
// ---------------------------------------------------------------------------

export const UserDocSchema = z.object({
  ...withFirestoreTimestamps,
  uid: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  photoURL: z.string().nullable(),
  role: UserRoleSchema,
  tenantId: z.string().nullable(),
  onboardingComplete: z.boolean(),
});

// ---------------------------------------------------------------------------
// UserProfile — profiles/{userId}
// ---------------------------------------------------------------------------

export const UserProfileSchema = z.object({
  ...withFirestoreTimestamps,
  userId: z.string(),
  bigFive: BigFiveScoresSchema,
  riasec: RiasecScoresSchema,
  strengths: z.array(z.string()),
  interests: z.array(z.string()),
  learningStyle: LearningStyleSchema.nullable(),
  clusterId: z.string().nullable(),
  lastUpdated: firestoreTimestamp,
});

// ---------------------------------------------------------------------------
// Grade — users/{userId}/grades/{gradeId}
// ---------------------------------------------------------------------------

export const GradeSchema = z.object({
  ...withFirestoreTimestamps,
  userId: z.string(),
  subject: z.string(),
  fagkode: z.string().nullable(),
  grade: z.number().int().min(1).max(6),
  term: TermTypeSchema,
  year: z.number().int(),
  programSubjectId: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// XpDoc — users/{userId}/gamification/xp
// ---------------------------------------------------------------------------

export const XpDocSchema = z.object({
  totalXp: z.number(),
  earnedAchievements: z.array(z.string()),
  streak: z.number(),
  lastLoginDate: z.string().nullable(),
  updatedAt: z.unknown(),
});

// ---------------------------------------------------------------------------
// CacheEntry — aiCache
// ---------------------------------------------------------------------------

export const CacheEntrySchema = z.object({
  content: z.string(),
  cacheKey: z.string(),
  level: z.number(),
  ttlHours: z.number(),
  createdAt: firestoreTimestamp,
});

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const FirestoreNotifSchema = z.object({
  type: z.enum(["achievement", "xp", "tip", "deadline", "system"]),
  title: z.string(),
  body: z.string(),
  read: z.boolean().optional(),
  createdAt: firestoreTimestamp,
  link: z.string().optional(),
});

// ---------------------------------------------------------------------------
// StudieprogramSO — utdanning.no
// ---------------------------------------------------------------------------

export const StudieprogramSOSchema = z.object({
  kode: z.string(),
  navn: z.string(),
  institusjon: z.string(),
  studiested: z.string(),
  studieprogramId: z.string(),
  niva: z.enum(["bachelor", "master", "arsstudium", "fagskole"]),
  antallStudieplasser: z.number().nullable(),
  poenggrenser: z.object({
    ordinaer: z.number().nullable(),
    forstegangsvitnemaal: z.number().nullable(),
    aar: z.number(),
  }).nullable(),
  url: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// TestResult — users/{userId}/testResults/{resultId}
// ---------------------------------------------------------------------------

export const TestResultSchema = z.object({
  ...withFirestoreTimestamps,
  userId: z.string(),
  testType: TestTypeSchema,
  rawAnswers: z.record(z.string(), z.number()),
  scores: z.record(z.string(), z.number()),
  completedAt: firestoreTimestamp,
});

// ---------------------------------------------------------------------------
// Tenant — tenants/{tenantId}
// ---------------------------------------------------------------------------

export const TenantSchema = z.object({
  ...withFirestoreTimestamps,
  name: z.string(),
  type: TenantTypeSchema,
  feideOrgId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  primaryColor: z.string().nullable(),
  adminUids: z.array(z.string()),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// GeneratedContent — generatedContent/{contentId}
// ---------------------------------------------------------------------------

export const GeneratedContentSchema = z.object({
  ...withFirestoreTimestamps,
  userId: z.string().nullable(),
  type: GeneratedContentTypeSchema,
  content: z.string(),
  generatedAt: firestoreTimestamp,
  expiresAt: firestoreTimestamp,
  clusterId: z.string().nullable(),
  model: z.string(),
});

// ---------------------------------------------------------------------------
// Conversation — users/{userId}/conversations/{convId}
// ---------------------------------------------------------------------------

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.unknown().optional(),
  sources: z.array(z.string()).optional(),
  id: z.string().optional(),
});

export const ConversationSchema = z.object({
  title: z.string().nullable().optional(),
  messages: z.array(ChatMessageSchema).optional(),
  messageCount: z.number().optional(),
  createdAt: firestoreTimestamp,
  lastMessageAt: firestoreTimestamp,
});

// ---------------------------------------------------------------------------
// FeatureFlag — featureFlags/{flagId}
// ---------------------------------------------------------------------------

export const FeatureFlagSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  enabled: z.boolean(),
  plans: z.array(z.string()),
  /** Tenant-IDer dette flagget er aktivt for (tom = alle tenanter) */
  tenantIds: z.array(z.string()).optional().default([]),
  /** Tenant-IDer som eksplisitt er ekskludert */
  excludedTenantIds: z.array(z.string()).optional().default([]),
  /** Prosentandel av brukere som får flagget (0–100) */
  rolloutPercentage: z.number().min(0).max(100).optional().default(100),
});

// ---------------------------------------------------------------------------
// UserSubscription — subscriptions/{userId}
// ---------------------------------------------------------------------------

export const UserSubscriptionSchema = z.object({
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  status: z.enum([
    "active", "trialing", "past_due", "canceled",
    "incomplete", "incomplete_expired", "unpaid", "paused", "none",
  ]),
  currentPeriodEnd: firestoreTimestamp,
  cancelAtPeriodEnd: z.boolean(),
});

// ---------------------------------------------------------------------------
// SchoolStats — schoolStats/{tenantId}
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ChatFeedback — chatFeedback/{feedbackId}
// ---------------------------------------------------------------------------

export const ChatFeedbackSchema = z.object({
  userId: z.string(),
  conversationId: z.string().nullable(),
  messageId: z.string(),
  rating: z.enum(["thumbs_up", "thumbs_down"]),
  reason: z.enum(["wrong_info", "not_relevant", "unclear", "other"]).nullable(),
  messageContent: z.string(),
  createdAt: firestoreTimestamp,
});

// ---------------------------------------------------------------------------
// SchoolStats — schoolStats/{tenantId}
// ---------------------------------------------------------------------------

export const SchoolStatsSchema = z.object({
  tenantId: z.string(),
  period: z.string(),
  totalStudents: z.number(),
  activeStudents7d: z.number(),
  personalityTestCompletionRate: z.number(),
  riasecDistribution: z.record(z.string(), z.number()),
  clusterDistribution: z.record(z.string(), z.number()),
  dropoutRiskOverview: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    unknown: z.number(),
  }),
  llmCostNok: z.number(),
  updatedAt: firestoreTimestamp,
});
