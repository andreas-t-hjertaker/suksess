/**
 * Karrierekompetanse-rammeverk (HK-dir) — Issue #133
 *
 * Basert på Direktoratet for høyere utdanning og kompetanse (HK-dir) sitt
 * nasjonale rammeverk for karrierekompetanse (2021).
 *
 * Rammeverket har 4 kompetanseområder:
 * 1. Meg selv — selvinnsikt, verdier, interesser
 * 2. Muligheter — kjennskap til utdanning og arbeid
 * 3. Valg og overganger — beslutningskompetanse
 * 4. Meg selv i kontekst — forstå samfunn og arbeidsmarked
 *
 * Referanse: karrierekompetanse.no / HK-dir (tidligere Kompetanse Norge)
 */

// ---------------------------------------------------------------------------
// Kompetanseområder
// ---------------------------------------------------------------------------

export type CompetenceAreaId = "meg-selv" | "muligheter" | "valg" | "kontekst";

export type CompetenceLevel = "begynner" | "underveis" | "kompetent";

export type CompetenceArea = {
  id: CompetenceAreaId;
  title: string;
  description: string;
  /** Konkrete ferdigheter i området */
  skills: CompetenceSkill[];
  /** RIASEC-dimensjoner dette henger sammen med */
  relatedRiasec: string[];
};

export type CompetenceSkill = {
  id: string;
  title: string;
  description: string;
  /** Eksempler på hvordan eleven kan utvikle denne ferdigheten */
  examples: string[];
  /** Suksess-funksjoner som bidrar til utvikling */
  relatedFeatures: string[];
};

export type UserCompetenceAssessment = {
  areaId: CompetenceAreaId;
  level: CompetenceLevel;
  selfAssessment: number; // 1-5
  completedActivities: string[];
  notes: string;
};

// ---------------------------------------------------------------------------
// Rammeverk-data
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<CompetenceLevel, string> = {
  begynner: "Begynner",
  underveis: "Underveis",
  kompetent: "Kompetent",
};

export { LEVEL_LABELS };

export const COMPETENCE_AREAS: CompetenceArea[] = [
  {
    id: "meg-selv",
    title: "Meg selv",
    description:
      "Selvinnsikt om egne interesser, verdier, styrker og personlighetstrekk. " +
      "Å kjenne seg selv er grunnlaget for gode karrierevalg.",
    skills: [
      {
        id: "ms-1",
        title: "Kjenne mine interesser",
        description: "Kan beskrive hva jeg liker å gjøre og hva som motiverer meg.",
        examples: [
          "Fullføre RIASEC-interessetesten",
          "Reflektere over aktiviteter som gir energi",
          "Sammenligne egne interesser med ulike yrker",
        ],
        relatedFeatures: ["personality-analysis", "career-advisor"],
      },
      {
        id: "ms-2",
        title: "Kjenne mine styrker",
        description: "Kan identifisere og beskrive mine sterke sider og talenter.",
        examples: [
          "Gjennomgå Big Five-resultatene mine",
          "Be venner og familie om tilbakemeldinger",
          "Reflektere over prestasjoner og mestringserfaringer",
        ],
        relatedFeatures: ["personality-analysis"],
      },
      {
        id: "ms-3",
        title: "Forstå mine verdier",
        description: "Kan reflektere over hva som er viktig for meg i utdanning og arbeid.",
        examples: [
          "Rangere verdier som kreativitet, trygghet, frihet, samarbeid",
          "Diskutere verdier med AI-veileder",
          "Koble verdier til konkrete yrkesvalg",
        ],
        relatedFeatures: ["career-advisor"],
      },
    ],
    relatedRiasec: ["artistic", "social", "investigative"],
  },
  {
    id: "muligheter",
    title: "Muligheter",
    description:
      "Kunnskap om utdanningsmuligheter, yrker og arbeidsmarked. " +
      "Å vite hva som finnes er nødvendig for å gjøre informerte valg.",
    skills: [
      {
        id: "mu-1",
        title: "Kjenne utdanningsmuligheter",
        description: "Kan beskrive relevante studieprogram og opptakskrav.",
        examples: [
          "Bruke Suksess karrierestiutforsker",
          "Undersøke studieprogram på utdanning.no",
          "Delta på åpen dag ved universitet/høgskole",
        ],
        relatedFeatures: ["career-path-explorer", "grade-calculator"],
      },
      {
        id: "mu-2",
        title: "Kjenne arbeidsmarkedet",
        description: "Kan beskrive trender, etterspørsel og muligheter i arbeidslivet.",
        examples: [
          "Bruke jobbmatch for å se hvilke stillinger som finnes",
          "Lese om fremtidens arbeidsliv",
          "Snakke med folk i ulike yrker",
        ],
        relatedFeatures: ["jobbmatch"],
      },
      {
        id: "mu-3",
        title: "Kjenne alternative veier",
        description: "Kan vurdere flere veier til målet — fagskole, folkehøgskole, lærlingordning.",
        examples: [
          "Utforske fagskole og lærlingplasser",
          "Vurdere utenlandsstudier",
          "Undersøke friår-muligheter",
        ],
        relatedFeatures: ["career-advisor"],
      },
    ],
    relatedRiasec: ["investigative", "enterprising", "conventional"],
  },
  {
    id: "valg",
    title: "Valg og overganger",
    description:
      "Evne til å ta gode beslutninger, håndtere overganger og takle usikkerhet. " +
      "Karrierevalg er prosesser, ikke enkeltbeslutninger.",
    skills: [
      {
        id: "vo-1",
        title: "Ta informerte valg",
        description: "Kan veie alternativer opp mot hverandre og begrunne valgene mine.",
        examples: [
          "Bruke handlingsplanen til å strukturere valgprosessen",
          "Diskutere fordeler og ulemper med AI-veileder",
          "Sammenligne karrierestier i karrieregraf-verktøyet",
        ],
        relatedFeatures: ["career-advisor", "career-path-explorer"],
      },
      {
        id: "vo-2",
        title: "Håndtere overganger",
        description: "Kan forberede meg på overgangen fra VGS til videre utdanning eller arbeid.",
        examples: [
          "Fullføre søknadsprosessen med søknads-coach",
          "Lage en CV og motivasjonsbrev",
          "Øve på jobbintervju",
        ],
        relatedFeatures: ["cv-builder"],
      },
      {
        id: "vo-3",
        title: "Takle usikkerhet",
        description: "Kan håndtere at fremtiden er usikker og at planer kan endre seg.",
        examples: [
          "Lage en plan B i handlingsplanen",
          "Reflektere over at endring er normalt",
          "Snakke med rådgiver eller AI-veileder om usikkerhet",
        ],
        relatedFeatures: ["career-advisor"],
      },
    ],
    relatedRiasec: ["enterprising", "social"],
  },
  {
    id: "kontekst",
    title: "Meg selv i kontekst",
    description:
      "Forståelse av hvordan samfunnsforhold, arbeidsmarked og personlig bakgrunn " +
      "påvirker karrieremuligheter og valg.",
    skills: [
      {
        id: "mk-1",
        title: "Forstå arbeidslivets spilleregler",
        description: "Kan beskrive rettigheter, plikter og normer i arbeidslivet.",
        examples: [
          "Lese om arbeidsmiljøloven",
          "Forstå forskjellen på fast og midlertidig ansettelse",
          "Kjenne til fagforeninger og tariffavtaler",
        ],
        relatedFeatures: ["career-advisor"],
      },
      {
        id: "mk-2",
        title: "Se sammenhengen mellom utdanning og arbeid",
        description: "Kan forklare hvordan utdanningsvalg påvirker karrieremuligheter.",
        examples: [
          "Se på karrieregraf-verktøyet for å forstå sammenhenger",
          "Undersøke lønnsstatistikk og arbeidsmarkedsdata",
          "Koble fagvalg på VGS til opptakskrav",
        ],
        relatedFeatures: ["career-path-explorer", "grade-calculator"],
      },
      {
        id: "mk-3",
        title: "Reflektere over likestilling og mangfold",
        description: "Kan reflektere over hvordan kjønn, bakgrunn og samfunn påvirker karrierevalg.",
        examples: [
          "Utforske yrker på tvers av tradisjonelle kjønnsroller",
          "Lese om mangfold i arbeidslivet",
          "Diskutere med AI-veileder om ubevisste antakelser",
        ],
        relatedFeatures: ["career-advisor"],
      },
    ],
    relatedRiasec: ["social", "conventional", "investigative"],
  },
];

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/**
 * Beregn kompetansenivå basert på antall fullførte aktiviteter.
 */
export function calculateCompetenceLevel(completedCount: number, totalCount: number): CompetenceLevel {
  const ratio = totalCount > 0 ? completedCount / totalCount : 0;
  if (ratio >= 0.7) return "kompetent";
  if (ratio >= 0.3) return "underveis";
  return "begynner";
}

/**
 * Hent alle ferdigheter som er relatert til en gitt Suksess-funksjon.
 */
export function getSkillsByFeature(featureId: string): CompetenceSkill[] {
  return COMPETENCE_AREAS.flatMap((area) =>
    area.skills.filter((s) => s.relatedFeatures.includes(featureId))
  );
}

/**
 * Hent kompetanseområde etter ID.
 */
export function getCompetenceArea(id: CompetenceAreaId): CompetenceArea | null {
  return COMPETENCE_AREAS.find((a) => a.id === id) ?? null;
}

/**
 * Beregn total fremgang på tvers av alle kompetanseområder.
 */
export function calculateOverallProgress(
  assessments: UserCompetenceAssessment[]
): { completed: number; total: number; percent: number } {
  const total = COMPETENCE_AREAS.reduce((sum, a) => sum + a.skills.length, 0);
  const completed = assessments.reduce((sum, a) => sum + a.completedActivities.length, 0);
  return {
    completed: Math.min(completed, total),
    total,
    percent: total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0,
  };
}
