/**
 * Konstantdata for studiemestringsmodulen (#169)
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type Course = {
  id: string;
  name: string;
  credits: number; // ECTS
  grade?: number;  // A=5, B=4, C=3, D=2, E=1, F=0
  passed: boolean;
  semester: string; // "H24", "V25" etc.
};

export type GradeLetter = "A" | "B" | "C" | "D" | "E" | "F" | "–";

export const GRADE_MAP: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
export const GRADE_LABELS: Record<number, GradeLetter> = { 5: "A", 4: "B", 3: "C", 2: "D", 1: "E", 0: "F" };

// ---------------------------------------------------------------------------
// AI-studietips basert på RIASEC-profil
// ---------------------------------------------------------------------------

const TIPS_BY_RIASEC: Record<string, string[]> = {
  I: [
    "Bruk Feynman-teknikken: Forklar konsepter med egne ord som om du lærer dem bort.",
    "Les primærkilder og originale forskningsartikler i stedet for sammendrag.",
    "Lag egne notater med spørsmål du vil utforske videre.",
  ],
  R: [
    "Knytt teori til praktiske eksempler og hands-on øvelser.",
    "Bruk laboratoriearbeid og prosjekter aktivt for å forankre kunnskap.",
    "Lag fysiske modeller eller skjematiske tegninger av vanskelig stoff.",
  ],
  A: [
    "Bruk mindmaps og visuelle strukturer for å organisere læremateriell.",
    "Skriv refleksjonsnotat etter forelesninger — kreativ gjenfortelling styrker hukommelsen.",
    "Søk etter multimediale læringsressurser (videoer, podcaster, illustrasjoner).",
  ],
  S: [
    "Delta i kollokviegrupper og diskusjonsgrupper — du lærer best i samarbeid.",
    "Lær bort stoff til medstudenter — undervisning er den beste læringsmetoden.",
    "Bruk studiestøttestjenester og veiledertimer aktivt.",
  ],
  E: [
    "Sett deg tydelige delmål og tidsfrister — du fungerer best med klare mål.",
    "Bruk pomodoro-teknikken (25 min arbeid / 5 min pause) for å opprettholde fokus.",
    "Delta i case-konkurranser og prosjektgrupper for å anvende kunnskap.",
  ],
  C: [
    "Lag detaljerte leseplanleggere og følg dem systematisk.",
    "Bruk flash cards og repetisjon med jevne mellomrom (spaced repetition).",
    "Organiser notater i klare mappestrukturer og bruk konsistente farger/koder.",
  ],
};

export function getTipsForProfile(riasecCode: string): string[] {
  const letters = riasecCode.slice(0, 2).split("");
  const tips: string[] = [];
  for (const letter of letters) {
    const t = TIPS_BY_RIASEC[letter];
    if (t) tips.push(...t.slice(0, 2));
  }
  return tips.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Eksamensforberedelse-sjekkliste
// ---------------------------------------------------------------------------

export const EXAM_CHECKLIST = [
  { id: "plan", label: "Lag en detaljert leseplan (fordel stoff over uker)" },
  { id: "pensum", label: "Les gjennom og marker alt pensum" },
  { id: "notat", label: "Lag sammendragsnotater for hvert tema" },
  { id: "oppgaver", label: "Løs gamle eksamensoppgaver" },
  { id: "kollokvie", label: "Gjennomgå stoff med kollokviegruppe" },
  { id: "sovn", label: "Prioriter søvn — 7-8t natten før eksamen" },
  { id: "mat", label: "Spis godt og ta pauser regelmessig" },
  { id: "lokale", label: "Sjekk eksamenslokale og tidspunkt dagen før" },
];
