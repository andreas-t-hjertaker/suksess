/**
 * Firestore datamodell — Multi-tenant arkitektur (Issue #37)
 *
 * Samlingsstruktur:
 *   users/{userId}
 *     /personalityProfile/{docId}
 *     /testResults/{resultId}
 *     /grades/{gradeId}
 *     /conversations/{convId}
 *     /notifications/{notifId}
 *     /consent/{consentId}
 *     /gamification/{docId}
 *     /achievements/{achievId}
 *     /cv/{docId}
 *     /jobbmatch/{docId}
 *
 *   profiles/{userId}
 *
 *   tenants/{tenantId}
 *     /counselors/{counselorId}
 *     /config/{configId}
 *     /stats/{period}
 *     /counselorNotes/{noteId}
 *
 *   schoolStats/{tenantId}
 *   careerPaths/{pathId}
 *   studyPrograms/{programId}
 *   programfag/{fagId}
 *   navJobs/{jobId}
 *   semanticCache/{cacheId}
 *   apiResponseCache/{cacheId}
 *   llmLogs/{logId}
 *   generatedContent/{contentId}
 *   subscriptions/{userId}
 *   featureFlags/{flagId}
 *   consentAudit/{auditId}
 */

import { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Felles
// ---------------------------------------------------------------------------

export type UserRole = "student" | "counselor" | "admin" | "superadmin";

// ---------------------------------------------------------------------------
// users/{userId}
// ---------------------------------------------------------------------------

export type UserDocument = {
  uid: string;
  tenantId: string | null;          // Feide-skole-ID (satt av Cloud Function ved onboarding)
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  feideId: string | null;           // Feide eduPersonPrincipalName
  birthYear: number | null;         // For aldersverifisering (GDPR art. 8)
  bigFiveCompleted: boolean;
  riasecCompleted: boolean;
  programfagSelected: boolean;
  clusterId: string | null;         // K-means klynge-ID
  riskLevel: "high" | "medium" | "low" | null;
  riskScore: number | null;         // 0–100
  lastLoginAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Satt av Cloud Function etter Feide OIDC — ikke klient-skrivbar */
  onboardingCompleted: boolean;
};

export type PersonalityProfileDocument = {
  userId: string;
  /** Big Five råskårer (1–5 per faktor) */
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  /** RIASEC primær- og sekundærkode */
  riasecPrimary: string;
  riasecSecondary: string;
  completedAt: Timestamp;
};

export type ConversationDocument = {
  userId: string;
  title: string | null;
  messages: ConversationMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
};

export type ConsentDocument = {
  userId: string;
  tenantId: string | null;
  requiresParentalConsent: boolean;   // true for elever under 16
  parentalConsentGiven: boolean | null;
  parentalConsentAt: Timestamp | null;
  consentCategories: {
    personality_profiling: boolean;
    ai_conversation: boolean;
    behavioral_tracking: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  consentVersion: string;             // Versjon av samtykkeskjema
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ---------------------------------------------------------------------------
// tenants/{tenantId}
// ---------------------------------------------------------------------------

export type TenantDocument = {
  tenantId: string;                   // Feide-basert org-ID, f.eks. "akershus.no"
  name: string;                       // Fullt skolenavn
  shortName: string;                  // Visningsnavn
  orgNumber: string | null;           // Organisasjonsnummer
  county: string | null;              // Fylke
  subscriptionStatus: "active" | "trial" | "suspended" | "cancelled";
  subscriptionPlan: "starter" | "school" | "county";
  maxStudents: number;
  stripeCustomerId: string | null;
  dpaSignedAt: Timestamp | null;      // Dato DBA ble signert
  dpaSignedBy: string | null;         // E-post til den som signerte
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TenantConfigDocument = {
  /** Tilpasset velkomstmelding for AI-veileder */
  chatbotWelcomeMessage: string | null;
  /** Logo-URL (Firebase Storage) */
  logoUrl: string | null;
  /** Primærfarge (hex) */
  brandColor: string | null;
  /** Aktiverte funksjoner for denne tenanten */
  features: {
    dropoutRisk: boolean;
    jobMatching: boolean;
    gamification: boolean;
    parentalPortal: boolean;
  };
  updatedAt: Timestamp;
};

export type CounselorNoteDocument = {
  noteId: string;
  tenantId: string;
  studentId: string;
  authorId: string;                   // Rådgiverens UID
  authorName: string;
  content: string;
  isPrivate: boolean;                 // true = kun rådgiver, false = kan deles m/elev
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ---------------------------------------------------------------------------
// schoolStats/{tenantId}
// ---------------------------------------------------------------------------

export type SchoolStatsDocument = {
  tenantId: string;
  period: string;                     // "2026-03" (YYYY-MM)
  totalStudents: number;
  activeStudents7d: number;
  personalityTestCompletionRate: number; // 0–1
  riasecDistribution: Record<string, number>;
  clusterDistribution: Record<string, number>;
  dropoutRiskOverview: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  llmCostNok: number;
  updatedAt: Timestamp;
};

// ---------------------------------------------------------------------------
// navJobs/{jobId}
// ---------------------------------------------------------------------------

export type NavJobDocument = {
  jobId: string;                      // NAV stilling-ID
  title: string;
  employer: string;
  location: string | null;
  description: string;
  riasecCode: string;                 // Mappet RIASEC-kode
  occupationCode: string;             // STYRK-08 kode
  applicationDeadline: string | null; // ISO 8601 date
  applicationUrl: string | null;
  publishedAt: Timestamp;
  ingestedAt: Timestamp;
};

// ---------------------------------------------------------------------------
// llmLogs/{logId}
// ---------------------------------------------------------------------------

export type LlmLogDocument = {
  logId: string;
  userId: string | null;
  tenantId: string | null;
  feature: string;                    // "chat" | "recommendations" | "generate"
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostNok: number;
  durationMs: number;
  cacheHit: boolean;
  createdAt: Timestamp;
};

// ---------------------------------------------------------------------------
// consentAudit/{auditId} — immutable revisjonsspor
// ---------------------------------------------------------------------------

export type ConsentAuditDocument = {
  userId: string;
  tenantId: string | null;
  action: "consent_given" | "consent_withdrawn" | "parental_consent_given" | "data_deleted";
  category: string | null;
  previousValue: boolean | null;
  newValue: boolean | null;
  ipAddress: string | null;           // Anonymisert (siste oktet fjernet)
  userAgent: string | null;
  consentVersion: string;
  createdAt: Timestamp;               // Immutable — aldri oppdatert
};
