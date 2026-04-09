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
  /** Organisasjonsnummer for FINT-integrasjon (#142) */
  orgNumber: string | null;
  /** Om FINT-synkronisering er aktivert (#142) */
  fintEnabled: boolean;
};

// ---------------------------------------------------------------------------
// FINT-data (fintGroups/, fintSubjects/, fintSchools/) — Issue #142
// ---------------------------------------------------------------------------

/** FINT elevgruppe (basisgruppe / undervisningsgruppe) */
export type FintGroup = {
  fintSystemId: string;
  name: string;
  description: string | null;
  tenantId: string;
  memberCount: number;
  members: FintGroupMember[];
  subjects: string[];
  schoolYear: string;
  lastSyncedAt: Timestamp | null;
};

export type FintGroupMember = {
  fintElevId: string;
  name: string;
  email: string | null;
  firebaseUid: string | null;
};

/** FINT undervisningsfag */
export type FintSubject = {
  fintSystemId: string;
  name: string;
  description: string | null;
  /** Grep/UDIR fagkode for kobling til karakterer */
  grepFagkode: string | null;
  tenantId: string;
  lastSyncedAt: Timestamp | null;
};

/** FINT skole */
export type FintSchool = {
  fintSystemId: string;
  name: string;
  orgNumber: string | null;
  email: string | null;
  tenantId: string;
  lastSyncedAt: Timestamp | null;
};

// ---------------------------------------------------------------------------
// Feature Flag (featureFlags/{flagId})
// ---------------------------------------------------------------------------

export type FeatureFlag = WithFirestoreTimestamps & {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  /** Planer dette flagget er aktivt for (tom = alle) */
  plans: string[];
  /** Tenant-IDer dette flagget er aktivt for (tom = alle tenanter) */
  tenantIds: string[];
  /** Tenant-IDer som eksplisitt er ekskludert */
  excludedTenantIds: string[];
  /** Prosentandel av brukere som får flagget (0–100, 100 = alle) */
  rolloutPercentage: number;
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

export type GradeSource = "manual" | "nvb";

export type Grade = WithFirestoreTimestamps & {
  userId: string;
  subject: string;
  fagkode: string | null;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  term: TermType;
  year: number;
  programSubjectId: string | null;
  /** Kilde for karakteren: manuelt registrert eller importert fra NVB (#147) */
  source: GradeSource;
  /** Tidspunkt for NVB-import (kun for source="nvb") */
  nvbImportedAt: Timestamp | null;
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
// Tilbakemelding — feedback/{feedbackId}
// ---------------------------------------------------------------------------

/** Feedbacktype: feilrapport, forslag eller ros */
export type TilbakemeldingType = "feil" | "forslag" | "ros";

/** Kilde som utløste feedback-dialogen */
export type TilbakemeldingKilde = "fab" | "sidebar" | "error-boundary" | "toast";

/** Prioritet for feilrapporter */
export type TilbakemeldingPrioritet = "lav" | "middels" | "hoy" | "kritisk";

/** Status for oppfølging */
export type TilbakemeldingStatus = "ny" | "under_behandling" | "lost" | "avvist";

/** Brødsmule — sporer brukerhandlinger for feilrapport-kontekst */
export type Brodsmuler = {
  handling: string;
  tidspunkt: number;
  data?: Record<string, unknown>;
};

/** Fullstendig tilbakemelding lagret i Firestore */
export type Tilbakemelding = {
  id: string;
  type: TilbakemeldingType;
  tittel: string;
  beskrivelse: string;
  prioritet?: TilbakemeldingPrioritet;
  kilde: TilbakemeldingKilde;

  // Automatisk kontekst
  side: string;
  tidspunkt: Date;
  nettleser: string;
  skjermstorrelse: string;

  // Brukerinfo
  uid: string;
  epost?: string;

  // Feil-spesifikk kontekst
  feilmelding?: string;
  stackTrace?: string;
  komponentStack?: string;
  brodsmler?: Brodsmuler[];

  // Oppfølging
  status: TilbakemeldingStatus;
  notionSideId?: string;
};
