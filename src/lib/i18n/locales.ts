/**
 * i18n-støtte for Suksess — norsk bokmål og nynorsk (issue #29)
 *
 * Brukes via useLocale()-hook.
 * Fremtidig utvidelse: samisk, engelsk.
 */

export type Locale = "nb" | "nn";

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeName: string }[] = [
  { code: "nb", label: "Norsk bokmål", nativeName: "Norsk bokmål" },
  { code: "nn", label: "Norsk nynorsk", nativeName: "Norsk nynorsk" },
];

// ---------------------------------------------------------------------------
// UI-strenger
// ---------------------------------------------------------------------------

export type Messages = typeof NB_MESSAGES;

const NB_MESSAGES = {
  nav: {
    dashboard: "Dashboard",
    profile: "Min profil",
    advisor: "AI-veileder",
    career: "Karriere",
    cv: "CV-builder",
    analyse: "Analyse",
    applicationCoach: "Søknads-coach",
    grades: "Karakterer",
    documents: "Dokumenter",
    progress: "Fremgang & XP",
    subscription: "Abonnement",
    developer: "Utvikler",
    settings: "Innstillinger",
    myData: "Mine data",
    jobMatch: "Jobbmatch",
    studies: "Studiemestring",
    careerGraph: "Karrieregraf",
  },
  dashboard: {
    welcome: "Hei",
    gradeAverage: "Karaktersnitt",
    riasecCode: "RIASEC-kode",
    level: "Nivå",
    continueOnboarding: "Fullfør oppsett",
    quickLinks: "Snarveier",
  },
  profile: {
    title: "Min profil",
    bigFive: "Big Five (OCEAN)",
    riasec: "RIASEC-interesser",
    strengths: "Styrker",
    learningStyle: "Læringsstil",
  },
  common: {
    save: "Lagre",
    cancel: "Avbryt",
    delete: "Slett",
    edit: "Rediger",
    search: "Søk",
    loading: "Laster…",
    error: "En feil oppstod",
    back: "Tilbake",
    next: "Neste",
    finish: "Fullfør",
    yes: "Ja",
    no: "Nei",
    or: "eller",
    and: "og",
    of: "av",
  },
  auth: {
    login: "Logg inn",
    logout: "Logg ut",
    register: "Registrer deg",
    email: "E-post",
    password: "Passord",
    forgotPassword: "Glemt passord?",
    loginWithGoogle: "Logg inn med Google",
  },
  gamification: {
    xp: "XP",
    level: "Nivå",
    streak: "dagers streak",
    achievements: "Achievements",
    unlocked: "Låst opp",
    locked: "Låst",
  },
  grades: {
    title: "Karakterer",
    subject: "Fag",
    grade: "Karakter",
    term: "Termin",
    year: "År",
    add: "Legg til karakter",
    average: "Snitt",
    soPoints: "SO-poeng",
    sciencePoints: "Realfagspoeng",
  },
};

const NN_MESSAGES: Messages = {
  nav: {
    dashboard: "Dashboard",
    profile: "Min profil",
    advisor: "AI-rettleiar",
    career: "Karriere",
    cv: "CV-byggjar",
    analyse: "Analyse",
    applicationCoach: "Søknadstrenar",
    grades: "Karakterar",
    documents: "Dokument",
    progress: "Framgang & XP",
    subscription: "Abonnement",
    developer: "Utviklarar",
    settings: "Innstillingar",
    myData: "Mine data",
    jobMatch: "Jobbtreff",
    studies: "Studiemeistring",
    careerGraph: "Karrierekart",
  },
  dashboard: {
    welcome: "Hei",
    gradeAverage: "Karaktersnitt",
    riasecCode: "RIASEC-kode",
    level: "Nivå",
    continueOnboarding: "Fullfør oppsettet",
    quickLinks: "Snarveier",
  },
  profile: {
    title: "Min profil",
    bigFive: "Big Five (OCEAN)",
    riasec: "RIASEC-interesser",
    strengths: "Styrkar",
    learningStyle: "Læringsstil",
  },
  common: {
    save: "Lagre",
    cancel: "Avbryt",
    delete: "Slett",
    edit: "Rediger",
    search: "Søk",
    loading: "Lastar…",
    error: "Ein feil oppstod",
    back: "Tilbake",
    next: "Neste",
    finish: "Fullfør",
    yes: "Ja",
    no: "Nei",
    or: "eller",
    and: "og",
    of: "av",
  },
  auth: {
    login: "Logg inn",
    logout: "Logg ut",
    register: "Registrer deg",
    email: "E-post",
    password: "Passord",
    forgotPassword: "Gløymt passord?",
    loginWithGoogle: "Logg inn med Google",
  },
  gamification: {
    xp: "XP",
    level: "Nivå",
    streak: "dagars streak",
    achievements: "Prestasjonar",
    unlocked: "Låst opp",
    locked: "Låst",
  },
  grades: {
    title: "Karakterar",
    subject: "Fag",
    grade: "Karakter",
    term: "Termin",
    year: "År",
    add: "Legg til karakter",
    average: "Snitt",
    soPoints: "SO-poeng",
    sciencePoints: "Realfagspoeng",
  },
};

export const MESSAGES: Record<Locale, Messages> = {
  nb: NB_MESSAGES,
  nn: NN_MESSAGES,
};
