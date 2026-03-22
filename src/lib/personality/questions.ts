/**
 * Spørsmålsbank for Big Five (OCEAN) og RIASEC-tester.
 *
 * Big Five: 40 spørsmål (8 per dimensjon) — IPIP-NEO kortversjon-inspirert
 * RIASEC:   30 spørsmål (5 per dimensjon) — Holland-koder
 *
 * Reversed-scored items er merket reversed: true (score = 6 - råverdi).
 */

import type { BigFiveScores, RiasecScores } from "@/types/domain";

export type BigFiveDimension = keyof BigFiveScores;
export type RiasecDimension = keyof RiasecScores;

export type PersonalityQuestion = {
  id: string;
  text: string;
  reversed: boolean;
};

export type BigFiveQuestion = PersonalityQuestion & {
  dimension: BigFiveDimension;
};

export type RiasecQuestion = PersonalityQuestion & {
  dimension: RiasecDimension;
};

// ---------------------------------------------------------------------------
// Big Five — 40 spørsmål (8 per dimensjon)
// ---------------------------------------------------------------------------

export const BIG_FIVE_QUESTIONS: BigFiveQuestion[] = [
  // Openness (åpenhet)
  { id: "o1", dimension: "openness", text: "Jeg har en rik fantasi.", reversed: false },
  { id: "o2", dimension: "openness", text: "Jeg er interessert i abstrakte ideer.", reversed: false },
  { id: "o3", dimension: "openness", text: "Jeg er nysgjerrig på mange forskjellige ting.", reversed: false },
  { id: "o4", dimension: "openness", text: "Jeg liker å reflektere over og leke med ideer.", reversed: false },
  { id: "o5", dimension: "openness", text: "Jeg setter pris på kunst, musikk og litteratur.", reversed: false },
  { id: "o6", dimension: "openness", text: "Jeg foretrekker rutine fremfor nye opplevelser.", reversed: true },
  { id: "o7", dimension: "openness", text: "Jeg liker å utforske nye steder og ideer.", reversed: false },
  { id: "o8", dimension: "openness", text: "Jeg har liten interesse for kreative aktiviteter.", reversed: true },

  // Conscientiousness (planmessighet)
  { id: "c1", dimension: "conscientiousness", text: "Jeg er alltid forberedt.", reversed: false },
  { id: "c2", dimension: "conscientiousness", text: "Jeg holder ting ryddige og ordentlige.", reversed: false },
  { id: "c3", dimension: "conscientiousness", text: "Jeg følger en plan og holder meg til den.", reversed: false },
  { id: "c4", dimension: "conscientiousness", text: "Jeg fullfører oppgaver grundig.", reversed: false },
  { id: "c5", dimension: "conscientiousness", text: "Jeg glemmer å sette tilbake ting på sin plass.", reversed: true },
  { id: "c6", dimension: "conscientiousness", text: "Jeg gjør rot med ting.", reversed: true },
  { id: "c7", dimension: "conscientiousness", text: "Jeg liker orden og struktur i hverdagen.", reversed: false },
  { id: "c8", dimension: "conscientiousness", text: "Jeg utsetter sjelden viktige oppgaver.", reversed: false },

  // Extraversion (utadvendthet)
  { id: "e1", dimension: "extraversion", text: "Jeg er livet i selskapet.", reversed: false },
  { id: "e2", dimension: "extraversion", text: "Jeg snakker gjerne med mange forskjellige.", reversed: false },
  { id: "e3", dimension: "extraversion", text: "Jeg liker å være i sentrum av oppmerksomheten.", reversed: false },
  { id: "e4", dimension: "extraversion", text: "Jeg er full av energi.", reversed: false },
  { id: "e5", dimension: "extraversion", text: "Jeg holder meg helst i bakgrunnen.", reversed: true },
  { id: "e6", dimension: "extraversion", text: "Jeg trenger mye tid alene for å lade opp.", reversed: true },
  { id: "e7", dimension: "extraversion", text: "Jeg tar initiativ i sosiale sammenhenger.", reversed: false },
  { id: "e8", dimension: "extraversion", text: "Jeg synes store fester er slitsomme.", reversed: true },

  // Agreeableness (medmenneskelighet)
  { id: "a1", dimension: "agreeableness", text: "Jeg er interessert i andre menneskers problemer.", reversed: false },
  { id: "a2", dimension: "agreeableness", text: "Jeg føler empati med andres følelser.", reversed: false },
  { id: "a3", dimension: "agreeableness", text: "Jeg er opptatt av at andre skal ha det bra.", reversed: false },
  { id: "a4", dimension: "agreeableness", text: "Jeg er vennlig mot folk jeg nettopp har møtt.", reversed: false },
  { id: "a5", dimension: "agreeableness", text: "Jeg kan være kald og distansert overfor andre.", reversed: true },
  { id: "a6", dimension: "agreeableness", text: "Jeg krangler gjerne for å vinne en diskusjon.", reversed: true },
  { id: "a7", dimension: "agreeableness", text: "Jeg prøver å se det gode i alle.", reversed: false },
  { id: "a8", dimension: "agreeableness", text: "Jeg samarbeider godt med andre.", reversed: false },

  // Neuroticism (nevrotisisme / emosjonell ustabilitet)
  { id: "n1", dimension: "neuroticism", text: "Jeg stresser lett.", reversed: false },
  { id: "n2", dimension: "neuroticism", text: "Jeg bekymrer meg for ting.", reversed: false },
  { id: "n3", dimension: "neuroticism", text: "Jeg blir fort irritert.", reversed: false },
  { id: "n4", dimension: "neuroticism", text: "Humøret mitt svinger mye.", reversed: false },
  { id: "n5", dimension: "neuroticism", text: "Jeg er sjelden stresset.", reversed: true },
  { id: "n6", dimension: "neuroticism", text: "Jeg er som regel avslappet og rolig.", reversed: true },
  { id: "n7", dimension: "neuroticism", text: "Jeg er lett sårbar for kritikk.", reversed: false },
  { id: "n8", dimension: "neuroticism", text: "Jeg holder meg rolig i vanskelige situasjoner.", reversed: true },
];

// ---------------------------------------------------------------------------
// RIASEC — 30 spørsmål (5 per type)
// ---------------------------------------------------------------------------

export const RIASEC_QUESTIONS: RiasecQuestion[] = [
  // Realistic — praktisk, konkret, teknisk
  { id: "r1", dimension: "realistic", text: "Jeg liker å jobbe med verktøy og maskiner.", reversed: false },
  { id: "r2", dimension: "realistic", text: "Jeg er god med hendene og praktisk arbeid.", reversed: false },
  { id: "r3", dimension: "realistic", text: "Jeg liker å bygge eller reparere ting.", reversed: false },
  { id: "r4", dimension: "realistic", text: "Friluftsliv og fysiske aktiviteter tiltrekker meg.", reversed: false },
  { id: "r5", dimension: "realistic", text: "Jeg foretrekker konkrete oppgaver fremfor abstrakte.", reversed: false },

  // Investigative — analytisk, nysgjerrig, vitenskapelig
  { id: "i1", dimension: "investigative", text: "Jeg liker å løse komplekse problemer.", reversed: false },
  { id: "i2", dimension: "investigative", text: "Jeg er fascinert av vitenskap og forskning.", reversed: false },
  { id: "i3", dimension: "investigative", text: "Jeg liker å analysere data og finne mønstre.", reversed: false },
  { id: "i4", dimension: "investigative", text: "Jeg stiller mange spørsmål om hvordan verden fungerer.", reversed: false },
  { id: "i5", dimension: "investigative", text: "Jeg liker å lese om vitenskapelige oppdagelser.", reversed: false },

  // Artistic — kreativ, ekspressiv, intuitiv
  { id: "ar1", dimension: "artistic", text: "Jeg uttrykker meg gjerne gjennom kunst, musikk eller skriving.", reversed: false },
  { id: "ar2", dimension: "artistic", text: "Jeg verdsetter kreativ frihet og selvuttrykk.", reversed: false },
  { id: "ar3", dimension: "artistic", text: "Jeg liker å designe eller skape noe estetisk.", reversed: false },
  { id: "ar4", dimension: "artistic", text: "Jeg tenker mye i bilder, symboler og metaforer.", reversed: false },
  { id: "ar5", dimension: "artistic", text: "Jeg foretrekker ustrukturerte fremfor strukturerte oppgaver.", reversed: false },

  // Social — hjelpende, omgjengelig, pedagogisk
  { id: "s1", dimension: "social", text: "Jeg liker å hjelpe og støtte andre.", reversed: false },
  { id: "s2", dimension: "social", text: "Jeg trives med å undervise eller veilede.", reversed: false },
  { id: "s3", dimension: "social", text: "Jeg er god på å kommunisere og lytte.", reversed: false },
  { id: "s4", dimension: "social", text: "Jeg er opptatt av sosiale spørsmål og fellesskap.", reversed: false },
  { id: "s5", dimension: "social", text: "Jeg liker teamarbeid og samarbeid.", reversed: false },

  // Enterprising — ledende, selgende, ambisiøs
  { id: "en1", dimension: "enterprising", text: "Jeg liker å lede og motivere andre.", reversed: false },
  { id: "en2", dimension: "enterprising", text: "Jeg er ambisiøs og liker å nå mål.", reversed: false },
  { id: "en3", dimension: "enterprising", text: "Jeg er god på å overbevise og selge ideer.", reversed: false },
  { id: "en4", dimension: "enterprising", text: "Jeg liker å ta risiko og starte nye ting.", reversed: false },
  { id: "en5", dimension: "enterprising", text: "Jeg er komfortabel med å ta beslutninger.", reversed: false },

  // Conventional — strukturert, detaljorientert, systematisk
  { id: "co1", dimension: "conventional", text: "Jeg liker klare retningslinjer og prosedyrer.", reversed: false },
  { id: "co2", dimension: "conventional", text: "Jeg er nøyaktig og detaljorientert.", reversed: false },
  { id: "co3", dimension: "conventional", text: "Jeg liker å jobbe med tall, data og arkiver.", reversed: false },
  { id: "co4", dimension: "conventional", text: "Jeg trives med rutineoppgaver og forutsigbarhet.", reversed: false },
  { id: "co5", dimension: "conventional", text: "Jeg er god på å organisere og planlegge systematisk.", reversed: false },
];

// ---------------------------------------------------------------------------
// Styrker (VIA-inspirert, forenklet — 7 kategorier × 2 = 14 utsagn)
// ---------------------------------------------------------------------------

export type StrengthCategory =
  | "kreativitet"
  | "nysgjerrighet"
  | "lederskap"
  | "empati"
  | "utholdenhet"
  | "humor"
  | "rettferdighet";

export type StrengthQuestion = PersonalityQuestion & {
  category: StrengthCategory;
};

export const STRENGTH_QUESTIONS: StrengthQuestion[] = [
  { id: "st1", category: "kreativitet", text: "Jeg finner kreative løsninger på problemer.", reversed: false },
  { id: "st2", category: "kreativitet", text: "Jeg liker å skape noe nytt.", reversed: false },
  { id: "st3", category: "nysgjerrighet", text: "Jeg er alltid interessert i å lære noe nytt.", reversed: false },
  { id: "st4", category: "nysgjerrighet", text: "Jeg dykker gjerne dypt ned i temaer som interesserer meg.", reversed: false },
  { id: "st5", category: "lederskap", text: "Andre ser opp til meg og ber meg om råd.", reversed: false },
  { id: "st6", category: "lederskap", text: "Jeg motiverer andre til å gjøre sitt beste.", reversed: false },
  { id: "st7", category: "empati", text: "Jeg forstår godt hva andre føler.", reversed: false },
  { id: "st8", category: "empati", text: "Jeg er en god lytter.", reversed: false },
  { id: "st9", category: "utholdenhet", text: "Jeg gir ikke opp selv når det er vanskelig.", reversed: false },
  { id: "st10", category: "utholdenhet", text: "Jeg fullfører det jeg starter.", reversed: false },
  { id: "st11", category: "humor", text: "Jeg bruker humor for å gjøre hverdagen lettere.", reversed: false },
  { id: "st12", category: "humor", text: "Jeg liker å le og få andre til å le.", reversed: false },
  { id: "st13", category: "rettferdighet", text: "Det er viktig for meg at alle behandles rettferdig.", reversed: false },
  { id: "st14", category: "rettferdighet", text: "Jeg tar gjerne et standpunkt for det som er riktig.", reversed: false },
];
