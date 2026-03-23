/**
 * Karrierevei-datasett med match-kriterier mot RIASEC-profil.
 *
 * fitScore beregnes fra RIASEC-overlap (0–100).
 * Bransje, utdanningsnivå og NAV-data (lønn, etterspørsel) er inkludert.
 */

import type { RiasecScores } from "@/types/domain";

export type EducationLevel =
  | "vgs"
  | "fagbrev"
  | "bachelor"
  | "master"
  | "phd";

export type Demand = "high" | "medium" | "low";

export type CareerNode = {
  id: string;
  title: string;
  sector: string;
  educationLevel: EducationLevel;
  /** Primære RIASEC-koder som passer */
  riasecCodes: (keyof RiasecScores)[];
  /** Årslonn NOK (median) */
  medianSalary: number;
  demand: Demand;
  description: string;
  /** Typiske utdanningsveier */
  educationPaths: string[];
  /** Videreutvikling fra denne karrieren */
  advancesTo?: string[];
};

export const CAREER_NODES: CareerNode[] = [
  // ─── Teknologi & Data ─────────────────────────────────────────────────────
  {
    id: "software-engineer",
    title: "Programvareutvikler",
    sector: "Teknologi",
    educationLevel: "bachelor",
    riasecCodes: ["investigative", "realistic", "conventional"],
    medianSalary: 720000,
    demand: "high",
    description: "Utvikler programvare, applikasjoner og systemer. Høy etterspørsel i alle bransjer.",
    educationPaths: ["Informatikk (bachelor/master)", "Datateknikk (sivilingeniør)"],
    advancesTo: ["tech-lead", "cto", "data-scientist"],
  },
  {
    id: "data-scientist",
    title: "Datavitenskap / ML-ingeniør",
    sector: "Teknologi",
    educationLevel: "master",
    riasecCodes: ["investigative", "conventional", "realistic"],
    medianSalary: 780000,
    demand: "high",
    description: "Analyserer store datamengder og bygger maskinlæringsmodeller.",
    educationPaths: ["Datavitenskap (master)", "Matematikk + informatikk", "Statistikk"],
    advancesTo: ["ai-researcher", "tech-lead"],
  },
  {
    id: "ux-designer",
    title: "UX/UI-designer",
    sector: "Teknologi",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "investigative", "social"],
    medianSalary: 650000,
    demand: "high",
    description: "Designer brukeropplevelser og grensesnitt for digitale produkter.",
    educationPaths: ["Interaksjonsdesign", "Grafisk design + UX", "Industridesign"],
    advancesTo: ["product-manager", "creative-director"],
  },
  {
    id: "cybersecurity",
    title: "Informasjonssikkerhet",
    sector: "Teknologi",
    educationLevel: "bachelor",
    riasecCodes: ["investigative", "realistic", "conventional"],
    medianSalary: 730000,
    demand: "high",
    description: "Sikrer organisasjoner mot digitale trusler og angrep.",
    educationPaths: ["Informasjonssikkerhet (bachelor/master)", "Datateknikk"],
    advancesTo: ["ciso", "tech-lead"],
  },
  {
    id: "tech-lead",
    title: "Tech Lead / Arkitekt",
    sector: "Teknologi",
    educationLevel: "master",
    riasecCodes: ["investigative", "enterprising", "realistic"],
    medianSalary: 900000,
    demand: "high",
    description: "Leder tekniske team og tar arkitekturbeslutninger.",
    educationPaths: ["Erfaring + master i informatikk"],
    advancesTo: ["cto"],
  },
  {
    id: "cto",
    title: "CTO / Teknologidirektør",
    sector: "Ledelse",
    educationLevel: "master",
    riasecCodes: ["enterprising", "investigative", "conventional"],
    medianSalary: 1200000,
    demand: "medium",
    description: "Ansvarlig for teknologistrategi i en organisasjon.",
    educationPaths: ["Master + ledererfaring"],
  },
  // ─── Helse ────────────────────────────────────────────────────────────────
  {
    id: "lege",
    title: "Lege",
    sector: "Helse",
    educationLevel: "phd",
    riasecCodes: ["investigative", "social", "realistic"],
    medianSalary: 950000,
    demand: "high",
    description: "Diagnostiserer og behandler sykdommer. Lang og krevende utdanning.",
    educationPaths: ["Medisin (6 år)", "Turnustjeneste", "Spesialisering"],
    advancesTo: ["overlege", "forsker"],
  },
  {
    id: "sykepleier",
    title: "Sykepleier",
    sector: "Helse",
    educationLevel: "bachelor",
    riasecCodes: ["social", "realistic", "investigative"],
    medianSalary: 580000,
    demand: "high",
    description: "Yter sykepleie og omsorg for pasienter i ulike settinger.",
    educationPaths: ["Sykepleie (bachelor, 3 år)"],
    advancesTo: ["spesialsykepleier", "avdelingsleder"],
  },
  {
    id: "psykolog",
    title: "Psykolog",
    sector: "Helse",
    educationLevel: "master",
    riasecCodes: ["social", "investigative", "artistic"],
    medianSalary: 750000,
    demand: "high",
    description: "Utforsker og behandler psykiske lidelser og utfordringer.",
    educationPaths: ["Profesjonsstudium i psykologi (6 år)"],
    advancesTo: ["spesialistpsykolog", "forsker"],
  },
  {
    id: "fysioterapeut",
    title: "Fysioterapeut",
    sector: "Helse",
    educationLevel: "bachelor",
    riasecCodes: ["social", "realistic", "investigative"],
    medianSalary: 560000,
    demand: "high",
    description: "Behandler bevegelsesrelaterte lidelser og rehabiliterer pasienter.",
    educationPaths: ["Fysioterapi (bachelor, 3 år)"],
    advancesTo: ["spesialistfysioterapeut"],
  },
  // ─── Utdanning ────────────────────────────────────────────────────────────
  {
    id: "laerer",
    title: "Lærer (grunnskole/VGS)",
    sector: "Utdanning",
    educationLevel: "master",
    riasecCodes: ["social", "artistic", "conventional"],
    medianSalary: 580000,
    demand: "high",
    description: "Underviser og veileder elever i grunn- og videregående skole.",
    educationPaths: ["Grunnskolelærer (5 år)", "Lektor (5 år)"],
    advancesTo: ["rektor", "spesialpedagog"],
  },
  {
    id: "barnehage-laerer",
    title: "Barnehagelærer",
    sector: "Utdanning",
    educationLevel: "bachelor",
    riasecCodes: ["social", "artistic", "realistic"],
    medianSalary: 510000,
    demand: "high",
    description: "Planlegger og leder pedagogisk arbeid med barn under skolealder.",
    educationPaths: ["Barnehagelærer (bachelor, 3 år)"],
    advancesTo: ["styrer", "pedagogisk-leder"],
  },
  {
    id: "universitetslektor",
    title: "Universitetslektor / Forsker",
    sector: "Utdanning",
    educationLevel: "phd",
    riasecCodes: ["investigative", "social", "artistic"],
    medianSalary: 680000,
    demand: "medium",
    description: "Underviser og forsker ved høyere utdanningsinstitusjoner.",
    educationPaths: ["Master + PhD"],
    advancesTo: ["professor"],
  },
  // ─── Økonomi & Forretning ─────────────────────────────────────────────────
  {
    id: "revisor",
    title: "Revisor",
    sector: "Økonomi",
    educationLevel: "master",
    riasecCodes: ["conventional", "investigative", "enterprising"],
    medianSalary: 680000,
    demand: "medium",
    description: "Kontrollerer regnskap og gir råd om finansiell risiko.",
    educationPaths: ["Revisjon/regnskap (master)", "Autorisert revisor"],
    advancesTo: ["partner-revisjonsselskap"],
  },
  {
    id: "oekonom",
    title: "Økonom / Finansanalytiker",
    sector: "Økonomi",
    educationLevel: "master",
    riasecCodes: ["conventional", "investigative", "enterprising"],
    medianSalary: 720000,
    demand: "medium",
    description: "Analyserer finansielle data og gir investeringsråd.",
    educationPaths: ["Siviløkonom (NHH/BI)", "Økonomi og administrasjon"],
    advancesTo: ["cfo", "investeringssjef"],
  },
  {
    id: "entrepreneur",
    title: "Gründer / Entrepenør",
    sector: "Forretning",
    educationLevel: "bachelor",
    riasecCodes: ["enterprising", "artistic", "investigative"],
    medianSalary: 600000,
    demand: "medium",
    description: "Bygger og leder egne virksomheter fra idé til marked.",
    educationPaths: ["Varierende — bachelor i økonomi, teknologi eller relevant felt"],
    advancesTo: ["ceo"],
  },
  {
    id: "marknadsforer",
    title: "Markedsfører / Kommunikasjonsrådgiver",
    sector: "Forretning",
    educationLevel: "bachelor",
    riasecCodes: ["enterprising", "artistic", "social"],
    medianSalary: 590000,
    demand: "medium",
    description: "Utformer kommunikasjonsstrategier og markedskampanjer.",
    educationPaths: ["Markedsføring/kommunikasjon (bachelor)"],
    advancesTo: ["marketing-director", "cmo"],
  },
  // ─── Kreative fag ─────────────────────────────────────────────────────────
  {
    id: "arkitekt",
    title: "Arkitekt",
    sector: "Kreativ",
    educationLevel: "master",
    riasecCodes: ["artistic", "realistic", "investigative"],
    medianSalary: 680000,
    demand: "medium",
    description: "Designer bygninger og byrom med fokus på estetikk og funksjon.",
    educationPaths: ["Arkitektur (master, 5 år) — NTNU, AHO"],
    advancesTo: ["sivilarkitekt", "byplanlegger"],
  },
  {
    id: "grafisk-designer",
    title: "Grafisk designer",
    sector: "Kreativ",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "realistic", "conventional"],
    medianSalary: 530000,
    demand: "medium",
    description: "Skaper visuell kommunikasjon for trykk og digitale flater.",
    educationPaths: ["Grafisk design (bachelor)", "Visuell kommunikasjon"],
    advancesTo: ["art-director", "ux-designer"],
  },
  {
    id: "journalist",
    title: "Journalist",
    sector: "Kreativ",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "social", "enterprising"],
    medianSalary: 560000,
    demand: "low",
    description: "Undersøker og formidler nyheter og reportasjer.",
    educationPaths: ["Journalistikk (bachelor)"],
    advancesTo: ["redaktoer", "dokumentarfilmskaper"],
  },
  // ─── Ingeniør & Naturvitenskap ─────────────────────────────────────────────
  {
    id: "sivilingenioer",
    title: "Sivilingeniør",
    sector: "Ingeniør",
    educationLevel: "master",
    riasecCodes: ["realistic", "investigative", "conventional"],
    medianSalary: 780000,
    demand: "high",
    description: "Løser tekniske problemer innen bygg, maskin, elektro eller kjemi.",
    educationPaths: ["Sivilingeniør (5 år) — NTNU, UiB, UiO"],
    advancesTo: ["prosjektleder", "tech-lead", "forsker"],
  },
  {
    id: "biolog",
    title: "Biolog / Bioteknolog",
    sector: "Naturvitenskap",
    educationLevel: "master",
    riasecCodes: ["investigative", "realistic", "social"],
    medianSalary: 620000,
    demand: "medium",
    description: "Forsker på levende organismer og biologiske prosesser.",
    educationPaths: ["Biologi (master)", "Bioteknologi (master)"],
    advancesTo: ["forsker", "pharma-scientist"],
  },
  // ─── Sosial & Offentlig sektor ─────────────────────────────────────────────
  {
    id: "jurist",
    title: "Advokat / Jurist",
    sector: "Juss",
    educationLevel: "master",
    riasecCodes: ["enterprising", "investigative", "conventional"],
    medianSalary: 830000,
    demand: "medium",
    description: "Rådgir klienter og representerer dem i rettslige saker.",
    educationPaths: ["Rettsvitenskap (master, 5 år)"],
    advancesTo: ["partner-advokatfirma", "dommer"],
  },
  {
    id: "sosialarbeider",
    title: "Sosionom / Sosialt arbeid",
    sector: "Sosial",
    educationLevel: "bachelor",
    riasecCodes: ["social", "conventional", "artistic"],
    medianSalary: 520000,
    demand: "high",
    description: "Hjelper individer og familier med sosiale og psykiske utfordringer.",
    educationPaths: ["Sosialt arbeid (bachelor, 3 år)"],
    advancesTo: ["leder-sosialtjeneste"],
  },
  {
    id: "politi",
    title: "Politibetjent",
    sector: "Offentlig",
    educationLevel: "bachelor",
    riasecCodes: ["realistic", "social", "enterprising"],
    medianSalary: 560000,
    demand: "medium",
    description: "Opretholder lov og orden, forebygger kriminalitet.",
    educationPaths: ["Politihøgskolen (bachelor, 3 år)"],
    advancesTo: ["etterforsker", "lensmann"],
  },
  {
    id: "forsker",
    title: "Forsker / Akademiker",
    sector: "Akademia",
    educationLevel: "phd",
    riasecCodes: ["investigative", "artistic", "conventional"],
    medianSalary: 680000,
    demand: "medium",
    description: "Driver grunnforskning og publiserer vitenskapelige arbeider.",
    educationPaths: ["Master + PhD (3–4 år)"],
    advancesTo: ["professor", "instituttleder"],
  },
  // ─── Handel & Service ─────────────────────────────────────────────────────
  {
    id: "laege-spesialist",
    title: "Spesiallege",
    sector: "Helse",
    educationLevel: "phd",
    riasecCodes: ["investigative", "realistic", "social"],
    medianSalary: 1150000,
    demand: "high",
    description: "Spesialist innen f.eks. kirurgi, onkologi eller indremedisin.",
    educationPaths: ["Medisin + spesialiseringsutdanning (5–7 år)"],
  },
  {
    id: "produkt-manager",
    title: "Produktleder (Product Manager)",
    sector: "Teknologi",
    educationLevel: "bachelor",
    riasecCodes: ["enterprising", "investigative", "social"],
    medianSalary: 780000,
    demand: "high",
    description: "Leder utviklingen av digitale produkter fra strategi til lansering.",
    educationPaths: ["Variert bakgrunn — teknologi, økonomi, design"],
    advancesTo: ["cpo", "ceo"],
  },
  {
    id: "laerer-spesialpedagog",
    title: "Spesialpedagog",
    sector: "Utdanning",
    educationLevel: "master",
    riasecCodes: ["social", "investigative", "artistic"],
    medianSalary: 610000,
    demand: "high",
    description: "Tilpasser opplæring for elever med spesielle behov.",
    educationPaths: ["Spesialpedagogikk (master)"],
  },

  // ─── Avanserte noder (branching-mål) ──────────────────────────────────────
  {
    id: "ai-researcher",
    title: "AI-forsker",
    sector: "Teknologi",
    educationLevel: "phd",
    riasecCodes: ["investigative", "conventional", "realistic"],
    medianSalary: 950000,
    demand: "high",
    description: "Forsker på kunstig intelligens, maskinlæring og nevrale nettverk.",
    educationPaths: ["Master + PhD i informatikk/maskinlæring"],
    advancesTo: ["forsker"],
  },
  {
    id: "creative-director",
    title: "Kreativ leder",
    sector: "Kreativ",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "enterprising", "social"],
    medianSalary: 780000,
    demand: "medium",
    description: "Leder kreative team og setter visuell og konseptuell retning.",
    educationPaths: ["Design (bachelor) + erfaring"],
    advancesTo: ["cmo"],
  },
  {
    id: "ciso",
    title: "CISO / IT-sikkerhetssjef",
    sector: "Teknologi",
    educationLevel: "master",
    riasecCodes: ["investigative", "enterprising", "conventional"],
    medianSalary: 1050000,
    demand: "high",
    description: "Overordnet ansvar for informasjonssikkerhet i organisasjonen.",
    educationPaths: ["Informasjonssikkerhet (master) + erfaring"],
  },
  {
    id: "overlege",
    title: "Overlege / Avdelingssjef",
    sector: "Helse",
    educationLevel: "phd",
    riasecCodes: ["investigative", "social", "enterprising"],
    medianSalary: 1200000,
    demand: "high",
    description: "Leder medisinsk avdeling og har overordnet faglig ansvar.",
    educationPaths: ["Medisin + spesialisering + ledererfaring"],
  },
  {
    id: "spesialsykepleier",
    title: "Spesialsykepleier",
    sector: "Helse",
    educationLevel: "master",
    riasecCodes: ["social", "realistic", "investigative"],
    medianSalary: 680000,
    demand: "high",
    description: "Spesialisert sykepleier innen f.eks. intensiv, anestesi eller kreft.",
    educationPaths: ["Sykepleie + videreutdanning (master)"],
  },
  {
    id: "avdelingsleder",
    title: "Avdelingsleder (helse)",
    sector: "Helse",
    educationLevel: "master",
    riasecCodes: ["enterprising", "social", "conventional"],
    medianSalary: 720000,
    demand: "medium",
    description: "Leder en helsefaglig avdeling med personal- og budsjettansvar.",
    educationPaths: ["Helsefag + ledelse (master)"],
  },
  {
    id: "spesialistpsykolog",
    title: "Spesialistpsykolog",
    sector: "Helse",
    educationLevel: "phd",
    riasecCodes: ["social", "investigative", "artistic"],
    medianSalary: 900000,
    demand: "high",
    description: "Godkjent spesialist i klinisk psykologi, nevropsykologi eller andre retninger.",
    educationPaths: ["Psykologi (profesjon) + spesialistutdanning (5 år)"],
  },
  {
    id: "spesialistfysioterapeut",
    title: "Spesialistfysioterapeut",
    sector: "Helse",
    educationLevel: "master",
    riasecCodes: ["realistic", "social", "investigative"],
    medianSalary: 680000,
    demand: "medium",
    description: "Spesialist innen f.eks. idrettsfysioterapi, manuell terapi eller nevrologi.",
    educationPaths: ["Fysioterapi (bachelor) + spesialisering (master)"],
  },
  {
    id: "rektor",
    title: "Rektor",
    sector: "Utdanning",
    educationLevel: "master",
    riasecCodes: ["enterprising", "social", "conventional"],
    medianSalary: 780000,
    demand: "medium",
    description: "Leder en skole med pedagogisk, administrativt og personalansvar.",
    educationPaths: ["Lærer + pedagogisk ledelse (master)"],
  },
  {
    id: "professor",
    title: "Professor",
    sector: "Akademia",
    educationLevel: "phd",
    riasecCodes: ["investigative", "social", "artistic"],
    medianSalary: 820000,
    demand: "low",
    description: "Høyeste vitenskapelige stilling ved universiteter og høgskoler.",
    educationPaths: ["PhD + postdok + forskererfaring"],
  },
  {
    id: "styrer",
    title: "Styrer (barnehage)",
    sector: "Utdanning",
    educationLevel: "bachelor",
    riasecCodes: ["enterprising", "social", "conventional"],
    medianSalary: 600000,
    demand: "high",
    description: "Leder en barnehage med personal- og driftsansvar.",
    educationPaths: ["Barnehagelærer + ledererfaring"],
  },
  {
    id: "cfo",
    title: "CFO / Finansdirektør",
    sector: "Ledelse",
    educationLevel: "master",
    riasecCodes: ["conventional", "enterprising", "investigative"],
    medianSalary: 1150000,
    demand: "medium",
    description: "Overordnet ansvar for organisasjonens økonomi og finansiell strategi.",
    educationPaths: ["Siviløkonom + erfaring som finansanalytiker"],
  },
  {
    id: "ceo",
    title: "Administrerende direktør (CEO)",
    sector: "Ledelse",
    educationLevel: "master",
    riasecCodes: ["enterprising", "conventional", "social"],
    medianSalary: 1500000,
    demand: "low",
    description: "Øverste leder i en organisasjon med ansvar for strategi og drift.",
    educationPaths: ["Variert — økonomi, juss, teknologi + ledererfaring"],
  },
  {
    id: "cmo",
    title: "CMO / Markedssjef",
    sector: "Forretning",
    educationLevel: "master",
    riasecCodes: ["enterprising", "artistic", "social"],
    medianSalary: 980000,
    demand: "medium",
    description: "Ansvarlig for markedsstrategi, merkevare og kommunikasjon.",
    educationPaths: ["Markedsføring/kommunikasjon (master) + erfaring"],
  },
  {
    id: "art-director",
    title: "Art Director",
    sector: "Kreativ",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "enterprising", "realistic"],
    medianSalary: 670000,
    demand: "medium",
    description: "Ansvarlig for visuell stil og estetisk retning i reklamebyrå eller mediehus.",
    educationPaths: ["Grafisk design (bachelor) + erfaring"],
    advancesTo: ["creative-director"],
  },
  {
    id: "redaktoer",
    title: "Redaktør",
    sector: "Kreativ",
    educationLevel: "bachelor",
    riasecCodes: ["artistic", "enterprising", "social"],
    medianSalary: 700000,
    demand: "low",
    description: "Har det journalistiske og etiske ansvaret for et medium.",
    educationPaths: ["Journalistikk + erfaring som journalist"],
  },
  {
    id: "byplanlegger",
    title: "Byplanlegger / Arealplanlegger",
    sector: "Offentlig",
    educationLevel: "master",
    riasecCodes: ["artistic", "investigative", "realistic"],
    medianSalary: 680000,
    demand: "medium",
    description: "Planlegger arealutnyttelse, infrastruktur og byutvikling.",
    educationPaths: ["Byplanlegging (master) — NTNU, UiB"],
  },
  {
    id: "prosjektleder",
    title: "Prosjektleder",
    sector: "Teknologi",
    educationLevel: "bachelor",
    riasecCodes: ["enterprising", "conventional", "realistic"],
    medianSalary: 780000,
    demand: "high",
    description: "Planlegger og leder prosjekter innen bygg, IT eller industri.",
    educationPaths: ["Ingeniør + PMP/Prince2-sertifisering"],
    advancesTo: ["cto", "ceo"],
  },
  {
    id: "partner-advokatfirma",
    title: "Partner i advokatfirma",
    sector: "Juss",
    educationLevel: "master",
    riasecCodes: ["enterprising", "investigative", "conventional"],
    medianSalary: 1400000,
    demand: "low",
    description: "Medeier og senior rådgiver i advokatfirma med spesialkompetanse.",
    educationPaths: ["Rettsvitenskap + 10+ år erfaring"],
  },
  {
    id: "etterforsker",
    title: "Etterforsker",
    sector: "Offentlig",
    educationLevel: "bachelor",
    riasecCodes: ["investigative", "realistic", "conventional"],
    medianSalary: 620000,
    demand: "medium",
    description: "Etterforsker straffbare handlinger på vegne av politiet.",
    educationPaths: ["Politihøgskolen + etterforskningseraring"],
  },
  {
    id: "cpo",
    title: "CPO / Produktdirektør",
    sector: "Teknologi",
    educationLevel: "master",
    riasecCodes: ["enterprising", "investigative", "social"],
    medianSalary: 1100000,
    demand: "medium",
    description: "Overordnet ansvar for produktstrategi og produktportefølje.",
    educationPaths: ["Teknologi/økonomi + erfaring som produktleder"],
  },
];

// ---------------------------------------------------------------------------
// Sektorer og farger
// ---------------------------------------------------------------------------

export const SECTOR_COLORS: Record<string, string> = {
  Teknologi:    "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300",
  Helse:        "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300",
  Utdanning:    "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
  Økonomi:      "bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300",
  Forretning:   "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300",
  Kreativ:      "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300",
  Ingeniør:     "bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300",
  Naturvitenskap: "bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300",
  Juss:         "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
  Sosial:       "bg-pink-500/15 border-pink-500/30 text-pink-700 dark:text-pink-300",
  Offentlig:    "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300",
  Akademia:     "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300",
  Ledelse:      "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
};

// ---------------------------------------------------------------------------
// Fit-score beregning (0–100)
// ---------------------------------------------------------------------------

export function calcFitScore(
  career: CareerNode,
  riasec: RiasecScores
): number {
  if (!riasec) return 50;
  const topCodes = career.riasecCodes;
  const total = topCodes.reduce((sum, code) => sum + (riasec[code] ?? 50), 0);
  return Math.round(total / topCodes.length);
}

export function fitScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function fitScoreBg(score: number): string {
  if (score >= 70) return "border-green-500/40 bg-green-500/5";
  if (score >= 45) return "border-amber-500/30 bg-amber-500/5";
  return "border-border bg-muted/20 opacity-60";
}

export type EducationLevelLabel = Record<EducationLevel, string>;

export const EDU_LABELS: EducationLevelLabel = {
  vgs: "VGS",
  fagbrev: "Fagbrev",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD / Doktorgrad",
};

export const DEMAND_LABELS: Record<Demand, string> = {
  high: "Høy etterspørsel",
  medium: "Moderat etterspørsel",
  low: "Lavere etterspørsel",
};
