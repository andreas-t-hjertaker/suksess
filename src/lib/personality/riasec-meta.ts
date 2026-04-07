/**
 * RIASEC metadata — delt mellom profil, karriere og delbare kort.
 * Ekstrahert fra profil-side (#169).
 */

export const RIASEC_META: Record<
  string,
  { label: string; description: string; careers: string[]; color: string }
> = {
  realistic: {
    label: "Realistisk",
    description: "Praktisk, teknisk og konkret",
    careers: ["Ingeniør", "Elektriker", "Pilot", "Idrettstrener"],
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  investigative: {
    label: "Undersøkende",
    description: "Analytisk, vitenskapelig og intellektuell",
    careers: ["Forsker", "Lege", "Analytiker", "Matematiker"],
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  artistic: {
    label: "Artistisk",
    description: "Kreativ, ekspressiv og intuitiv",
    careers: ["Designer", "Forfatter", "Musiker", "Arkitekt"],
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  social: {
    label: "Sosial",
    description: "Hjelpende, pedagogisk og empatisk",
    careers: ["Lærer", "Sykepleier", "Psykolog", "Sosialarbeider"],
    color: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  },
  enterprising: {
    label: "Entrepren\u00f8risk",
    description: "Ledende, ambisiøs og overbevisende",
    careers: ["Leder", "Advokat", "Selger", "Gründer"],
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  conventional: {
    label: "Konvensjonell",
    description: "Strukturert, detaljorientert og systematisk",
    careers: ["Regnskapsfører", "Bibliotekar", "IT-drifter", "Revisor"],
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
};

export const BIG_FIVE_META: Record<
  string,
  { label: string; high: string; low: string; color: string }
> = {
  openness: {
    label: "Åpenhet",
    high: "Kreativ, nysgjerrig og åpen for nye ideer",
    low: "Praktisk, jordnær og foretrekker rutine",
    color: "text-violet-500",
  },
  conscientiousness: {
    label: "Planmessighet",
    high: "Organisert, pålitelig og målrettet",
    low: "Fleksibel, spontan og impulsiv",
    color: "text-blue-500",
  },
  extraversion: {
    label: "Utadvendthet",
    high: "Sosial, energisk og snakkesalig",
    low: "Reservert, rolig og selvforsynt",
    color: "text-amber-500",
  },
  agreeableness: {
    label: "Medmenneskelighet",
    high: "Samarbeidsvillig, varm og tillitsfull",
    low: "Direkte, kritisk og konkurranseinnstilt",
    color: "text-green-500",
  },
  neuroticism: {
    label: "Emosjonell stabilitet",
    high: "Rolig og stressmotstandsdyktig",
    low: "Sensitiv og lett for å bekymre seg",
    color: "text-rose-500",
    // NB: neuroticism vises invertert (høy score = lav neurotisisme = god stabilitet)
  },
};

export const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  kreativitet: "Du tenker utenfor boksen og finner kreative løsninger.",
  nysgjerrighet: "Du elsker å lære og utforske nye emner i dybden.",
  lederskap: "Du inspirerer og motiverer andre til å nå sitt beste.",
  empati: "Du forstår og føler med andre på en dyp måte.",
  utholdenhet: "Du gir ikke opp og fullfører det du starter.",
  humor: "Du bringer glede og letter stemningen i enhver situasjon.",
  rettferdighet: "Du kjemper for det som er rett og rettferdig.",
};
