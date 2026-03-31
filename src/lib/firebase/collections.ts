/**
 * Firestore collection-stier og datamodell-verktøy for Suksess-plattformen.
 *
 * Definerer alle collections med typede stier, hjelper for tenants,
 * og seed-funksjon for å initialisere nødvendig grunndata.
 */

import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firestore";
import { parseDoc } from "./parse-doc";
import { UserProfileSchema } from "@/types/schemas";
import type {
  UserDoc,
  UserProfile,
  Tenant,
  CareerPath,
  StudyProgram,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Collection-stier (konstanter)
// ---------------------------------------------------------------------------

export const COLLECTIONS = {
  // Primære collections
  USERS: "users",
  PROFILES: "profiles",
  TENANTS: "tenants",
  CAREER_PATHS: "careerPaths",
  STUDY_PROGRAMS: "studyPrograms",
  PROGRAMFAG: "programfag",
  GENERATED_CONTENT: "generatedContent",
  SUBSCRIPTIONS: "subscriptions",
  FEATURE_FLAGS: "featureFlags",
  API_KEYS: "apiKeys",
  NOTES: "notes",

  // Subcollections (bruk sub(userId, ...) nedenfor)
  SUB: {
    PERSONALITY_PROFILE: "personalityProfile",
    TEST_RESULTS: "testResults",
    GRADES: "grades",
    CONVERSATIONS: "conversations",
    NOTIFICATIONS: "notifications",
    GAMIFICATION: "gamification",
    ACHIEVEMENTS: "achievements",
    AI_CACHE: "aiCache",
    DOCUMENTS: "documents",
    SOKNADER: "soknader",
    STUDIER: "studier",
    CV: "cv",
    JOBBMATCH: "jobbmatch",
    SOKNADSCOACH: "soknadscoach",
  },
} as const;

// ---------------------------------------------------------------------------
// Hjelper: subcollection-referanse
// ---------------------------------------------------------------------------

export function userSubcollection(userId: string, sub: string) {
  return collection(db, COLLECTIONS.USERS, userId, sub);
}

export function userSubdoc(userId: string, sub: string, docId: string) {
  return doc(db, COLLECTIONS.USERS, userId, sub, docId);
}

// ---------------------------------------------------------------------------
// Bruker: initialisering ved registrering
// ---------------------------------------------------------------------------

/**
 * Opprett eller oppdater brukerdokument ved første innlogging.
 * Bruker merge for å ikke overskrive eksisterende data.
 */
export async function initializeUserDoc(
  userId: string,
  data: Partial<UserDoc>
) {
  const ref = doc(db, COLLECTIONS.USERS, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: userId,
      displayName: data.displayName ?? null,
      email: data.email ?? null,
      photoURL: data.photoURL ?? null,
      role: data.role ?? "student",
      tenantId: data.tenantId ?? null,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ---------------------------------------------------------------------------
// Tenant: provisjonering
// ---------------------------------------------------------------------------

/**
 * Opprett en ny tenant (skole) med grunnleggende oppsett.
 * Kalles av admin ved registrering av ny skole.
 */
export async function provisionTenant(
  tenantId: string,
  data: Partial<Tenant>
) {
  const batch = writeBatch(db);

  // Hoveddokument
  batch.set(doc(db, COLLECTIONS.TENANTS, tenantId), {
    name: data.name ?? "Ukjent skole",
    type: data.type ?? "vgs",
    feideOrgId: data.feideOrgId ?? null,
    logoUrl: data.logoUrl ?? null,
    primaryColor: data.primaryColor ?? null,
    adminUids: data.adminUids ?? [],
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Standard feature flags for tenant
  batch.set(doc(db, COLLECTIONS.FEATURE_FLAGS, `tenant_${tenantId}_ai_chat`), {
    tenantId,
    feature: "ai_chat",
    enabled: true,
    rolloutPercentage: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return batch.commit();
}

// ---------------------------------------------------------------------------
// Profil: henteoperasjon
// ---------------------------------------------------------------------------

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.PROFILES, userId));
  return parseDoc(snap, UserProfileSchema) as UserProfile | null;
}

// ---------------------------------------------------------------------------
// Seed: standarddata for feature flags
// ---------------------------------------------------------------------------

const DEFAULT_FEATURE_FLAGS = [
  { id: "ai_chat", feature: "ai_chat", enabled: true, rolloutPercentage: 100 },
  { id: "career_graph", feature: "career_graph", enabled: true, rolloutPercentage: 100 },
  { id: "adaptive_ui", feature: "adaptive_ui", enabled: true, rolloutPercentage: 100 },
  { id: "gamification", feature: "gamification", enabled: true, rolloutPercentage: 100 },
  { id: "stripe_billing", feature: "stripe_billing", enabled: false, rolloutPercentage: 0 },
  { id: "weaviate_search", feature: "weaviate_search", enabled: false, rolloutPercentage: 0 },
  { id: "dropout_risk", feature: "dropout_risk", enabled: false, rolloutPercentage: 0 },
  { id: "i18n_nynorsk", feature: "i18n_nynorsk", enabled: false, rolloutPercentage: 0 },
];

/**
 * Seed grunnleggende feature flags.
 * Kjøres én gang av en admin/superadmin via utviklerverktøy.
 */
export async function seedFeatureFlags() {
  const batch = writeBatch(db);
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    batch.set(doc(db, COLLECTIONS.FEATURE_FLAGS, flag.id), {
      ...flag,
      updatedAt: serverTimestamp(),
    });
  }
  return batch.commit();
}

// ---------------------------------------------------------------------------
// Seed: eksempel-karriereveier (statiske data)
// ---------------------------------------------------------------------------

export const SEED_CAREER_PATHS: Partial<CareerPath>[] = [
  {
    title: "Programvareutvikler",
    description: "Utvikler programvare og applikasjoner for bedrifter og forbrukere.",
    requiredEducation: ["bachelor_informatikk", "bachelor_data"],
    matchCriteria: { openness: 60, conscientiousness: 65 },
    demand: "high",
    salaryRange: { min: 650000, max: 1100000, currency: "NOK" },
    nusCode: "654110",
  },
  {
    title: "Sykepleier",
    description: "Gir pleie og omsorg til pasienter i helsevesenet.",
    requiredEducation: ["bachelor_sykepleie"],
    matchCriteria: { agreeableness: 70, social: 75 },
    demand: "high",
    salaryRange: { min: 490000, max: 720000, currency: "NOK" },
    nusCode: "661121",
  },
  {
    title: "Sivilingeniør",
    description: "Designer og utvikler tekniske løsninger innen bygg, maskin eller elektronikk.",
    requiredEducation: ["master_ingeniorfag"],
    matchCriteria: { openness: 55, conscientiousness: 70, investigative: 65 },
    demand: "high",
    salaryRange: { min: 700000, max: 1200000, currency: "NOK" },
    nusCode: "652110",
  },
];

export const SEED_STUDY_PROGRAMS: Partial<StudyProgram>[] = [
  {
    name: "Informatikk",
    institution: "Universitetet i Oslo",
    nusCode: "754110",
    level: "bachelor",
    description: "Studiet gir bred kompetanse i datavitenskap, programmering og systemutvikling.",
    requiredGpa: 4.5,
    riasecCodes: ["investigative", "realistic"],
    url: "https://www.uio.no/studier/program/informatikk-bachelor/",
    source: "utdanning.no",
  },
  {
    name: "Medisinstudiet",
    institution: "Universitetet i Bergen",
    nusCode: "761110",
    level: "master",
    description: "6-årig profesjonsstudium som utdanner leger.",
    requiredGpa: 5.8,
    riasecCodes: ["investigative", "social"],
    url: "https://www.uib.no/studier/MEDPROP",
    source: "utdanning.no",
  },
];
