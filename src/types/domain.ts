/**
 * Domenetyper for Suksess-plattformen.
 * Speiler Firestore-collections og er felles for frontend og functions.
 */

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

/** Felt som Firestore serverTimestamp() setter automatisk */
export type WithFirestoreTimestamps = {
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

// ---------------------------------------------------------------------------
// Big Five (OCEAN) personlighetsprofil
// ---------------------------------------------------------------------------

/** Normaliserte scorer 0–100 for hvert trekk */
export type BigFiveScores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

// ---------------------------------------------------------------------------
// RIASEC / Holland-koder (interesseprofil)
// ---------------------------------------------------------------------------

export type RiasecScores = {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
};

// ---------------------------------------------------------------------------
// Bruker (users/{userId})
// ---------------------------------------------------------------------------

export type UserRole = "student" | "counselor" | "admin" | "superadmin";
export type TenantType = "vgs" | "uh" | "independent";

export type UserDoc = WithFirestoreTimestamps & {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  tenantId: string | null;
  onboardingComplete: boolean;
};

// ---------------------------------------------------------------------------
// Personlighetsprofil (profiles/{userId})
// ---------------------------------------------------------------------------

export type LearningStyle = "visual" | "auditory" | "kinesthetic" | "reading";

export type UserProfile = WithFirestoreTimestamps & {
  userId: string;
  bigFive: BigFiveScores;
  riasec: RiasecScores;
  /** VIA-inspirerte styrker, maks 5 */
  strengths: string[];
  /** Brede interesseområder valgt av bruker */
  interests: string[];
  learningStyle: LearningStyle | null;
  /** Klynge-ID etter k-means clustering */
  clusterId: string | null;
  lastUpdated: Timestamp | null;
};

// ---------------------------------------------------------------------------
// Testresultat (users/{userId}/testResults/{resultId})
// ---------------------------------------------------------------------------

export type TestType = "big_five" | "riasec" | "strengths" | "learning_style";

export type TestResult = WithFirestoreTimestamps & {
  userId: string;
  testType: TestType;
  /** Rå-svar: spørsmålsId → verdi (1–5) */
  rawAnswers: Record<string, number>;
  /** Beregnede scorer */
  scores: BigFiveScores | RiasecScores | Record<string, number>;
  completedAt: Timestamp | null;
};

// ---------------------------------------------------------------------------
// Tenant / skole (tenants/{tenantId})
// ---------------------------------------------------------------------------

export type Tenant = WithFirestoreTimestamps & {
  name: string;
  type: TenantType;
  feideOrgId: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  adminUids: string[];
  active: boolean;
};

// ---------------------------------------------------------------------------
// Karrierevei (careerPaths/{pathId})
// ---------------------------------------------------------------------------

export type SalaryRange = {
  min: number;
  max: number;
  currency: "NOK";
};

export type CareerPath = WithFirestoreTimestamps & {
  title: string;
  description: string;
  requiredEducation: string[];
  /** Minimums Big Five / RIASEC scorer for god match */
  matchCriteria: Partial<BigFiveScores & RiasecScores>;
  salaryRange: SalaryRange | null;
  /** Arbeidsmarkedsetterspørsel: high / medium / low */
  demand: "high" | "medium" | "low";
  nusCode: string | null;
};

// ---------------------------------------------------------------------------
// Studieprogram (studyPrograms/{programId})
// ---------------------------------------------------------------------------

export type StudyProgram = WithFirestoreTimestamps & {
  name: string;
  institution: string;
  nusCode: string;
  level: "vgs" | "bachelor" | "master" | "phd" | "vocational";
  description: string;
  /** Normalt opptakskrav (karaktergjennomsnitt) */
  requiredGpa: number | null;
  /** RIASEC-koder som passer */
  riasecCodes: (keyof RiasecScores)[];
  careerPathIds: string[];
  url: string | null;
  source: "utdanning.no" | "dbh" | "samordna_opptak" | "manual";
};

// ---------------------------------------------------------------------------
// Programfag VGS (programfag/{fagId})
// ---------------------------------------------------------------------------

export type ProgramSubject = WithFirestoreTimestamps & {
  name: string;
  /** Programområde, f.eks. "Realfag" */
  programomraade: string;
  /** Poeng dette faget gir (tilleggs/realfagspoeng) */
  extraPoints: number;
  prerequisites: string[];
  /** Offisiell fagkode fra UDIR */
  fagkode: string | null;
};

// ---------------------------------------------------------------------------
// Generert AI-innhold (generatedContent/{contentId})
// ---------------------------------------------------------------------------

export type GeneratedContentType =
  | "study_tip"
  | "career_suggestion"
  | "strength_insight"
  | "weekly_challenge"
  | "study_plan";

export type GeneratedContent = WithFirestoreTimestamps & {
  /** null = klynge-delt innhold */
  userId: string | null;
  type: GeneratedContentType;
  content: string;
  generatedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  /** Klynge-ID hvis delt på tvers av brukere */
  clusterId: string | null;
  /** Modell som genererte innholdet */
  model: string;
};

// ---------------------------------------------------------------------------
// Karakterer VGS (users/{userId}/grades/{gradeId})
// ---------------------------------------------------------------------------

export type TermType = "vt" | "ht"; // vår / høst

export type Grade = WithFirestoreTimestamps & {
  userId: string;
  subject: string;
  fagkode: string | null;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  term: TermType;
  year: number;
  programSubjectId: string | null;
};

// ---------------------------------------------------------------------------
// Samtalehistorikk AI (users/{userId}/conversations/{convId})
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: MessageRole;
  content: string;
  timestamp: Timestamp | null;
  sources?: string[];
};

export type Conversation = WithFirestoreTimestamps & {
  userId: string;
  title: string | null;
  messages: ChatMessage[];
  lastMessageAt: Timestamp | null;
};

// ---------------------------------------------------------------------------
// Karrierementor (mentors/{mentorId})
// ---------------------------------------------------------------------------

export type Mentor = WithFirestoreTimestamps & {
  id: string;
  displayName: string;
  photoURL: string | null;
  yrke: string;
  bransje: string;
  bio: string;
  riasec: RiasecScores;
  tilgjengelighet: string[];
  linkedinUrl: string | null;
  godkjent: boolean;
};

export type MentoringMilestoneId = "intro" | "karrierekartlegging" | "oppfolging";

export type MentoringMilestone = {
  id: MentoringMilestoneId;
  label: string;
  completed: boolean;
  completedAt: Timestamp | null;
};

export type MentoringRequest = WithFirestoreTimestamps & {
  id: string;
  elevId: string;
  mentorId: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  melding: string;
  milestones: MentoringMilestone[];
};

// ---------------------------------------------------------------------------
// Arbeidsgiverportal (employers/{employerId}, jobListings/{listingId})
// ---------------------------------------------------------------------------

export type Employer = WithFirestoreTimestamps & {
  id: string;
  navn: string;
  bransje: string;
  fylke: string;
  logoUrl: string | null;
  beskrivelse: string;
  nettside: string | null;
  kontaktEpost: string | null;
  godkjent: boolean;
};

export type JobListingType = "lærling" | "sommerjobb" | "deltid" | "fast";

export type JobListing = WithFirestoreTimestamps & {
  id: string;
  employerId: string;
  tittel: string;
  type: JobListingType;
  beskrivelse: string;
  krav: string[];
  frist: Timestamp | null;
  aktiv: boolean;
  riasecCodes: (keyof RiasecScores)[];
};
