/**
 * GDPR samtykke for mindreårige (Issue #38)
 *
 * Norsk personopplysningslov: samtykke fra foresatte kreves for
 * behandling av persondata for barn UNDER 16 år.
 *
 * VGS-elever er typisk 16–19 år, men noen starter som 15-åringer.
 * Løsning: Sjekk alder ved onboarding — krev foresatt-samtykke for <16.
 */

export type AgeCategory = "under16" | "16plus" | "unknown";
export type ConsentStatus = "pending" | "parent_required" | "granted" | "denied";

export type ConsentRecord = {
  userId: string;
  ageCategory: AgeCategory;
  status: ConsentStatus;
  /** ISO-dato for samtykke */
  grantedAt: string | null;
  /** E-post til foresatt (kun for under 16) */
  parentEmail: string | null;
  /** Versjon av personvernerklæringen som ble akseptert */
  policyVersion: string;
  /** GDPR-kategorier eleven har samtykket til */
  categories: ConsentCategory[];
};

export type ConsentCategory =
  | "personality_profiling"   // Big Five + RIASEC
  | "ai_conversation"         // AI-chatmleldinger lagret i Firestore
  | "behavioral_tracking"     // Implisitt profilering (klikk, scroll)
  | "analytics"               // Anonymisert brukerstatistikk
  | "marketing";              // E-post og push-varsler (valgfritt)

export const CONSENT_CATEGORIES: Record<ConsentCategory, { label: string; required: boolean; description: string }> = {
  personality_profiling: {
    label: "Personlighetsprofil",
    required: true,
    description: "Lagre resultatene fra Big Five og RIASEC-tester for å gi personlige anbefalinger.",
  },
  ai_conversation: {
    label: "AI-samtaler",
    required: true,
    description: "Lagre samtaler med AI-veilederen for å gi bedre, kontekstuell veiledning.",
  },
  behavioral_tracking: {
    label: "Atferdsdata",
    required: false,
    description: "Registrere hvilke karriereveier og sider du besøker for å forbedre anbefalingene.",
  },
  analytics: {
    label: "Anonym statistikk",
    required: false,
    description: "Bidra til anonymisert statistikk som hjelper oss å forbedre plattformen.",
  },
  marketing: {
    label: "Varsler og nyheter",
    required: false,
    description: "Motta tips, oppdateringer og relevante varsler via e-post.",
  },
};

export const CURRENT_POLICY_VERSION = "2026-03-01";
export const MIN_AGE_WITHOUT_PARENT_CONSENT = 16;

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/** Beregn alderskategori basert på fødselsår */
export function getAgeCategory(birthYear: number): AgeCategory {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age < MIN_AGE_WITHOUT_PARENT_CONSENT) return "under16";
  if (age >= MIN_AGE_WITHOUT_PARENT_CONSENT && age <= 25) return "16plus";
  return "unknown";
}

/** Bygg initial ConsentRecord for ny bruker */
export function buildInitialConsent(
  userId: string,
  birthYear: number | null
): ConsentRecord {
  const ageCategory = birthYear !== null ? getAgeCategory(birthYear) : "unknown";
  const status: ConsentStatus =
    ageCategory === "under16" ? "parent_required" : "pending";

  return {
    userId,
    ageCategory,
    status,
    grantedAt: null,
    parentEmail: null,
    policyVersion: CURRENT_POLICY_VERSION,
    categories: [],
  };
}

/** Beregn hvilke kategorier som er påkrevd vs. valgfrie */
export function getRequiredCategories(): ConsentCategory[] {
  return (Object.keys(CONSENT_CATEGORIES) as ConsentCategory[])
    .filter((k) => CONSENT_CATEGORIES[k].required);
}

/** Valider at alle påkrevde kategorier er samtykket til */
export function isConsentComplete(record: ConsentRecord): boolean {
  if (record.status !== "granted") return false;
  return getRequiredCategories().every((cat) => record.categories.includes(cat));
}

/** Sjekk om en bestemt kategori er samtykket til */
export function hasConsent(record: ConsentRecord | null, category: ConsentCategory): boolean {
  if (!record) return false;
  if (record.status !== "granted") return false;
  return record.categories.includes(category);
}
