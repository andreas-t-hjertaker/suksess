/**
 * Metadata for avansert analyse-side — Big Five og RIASEC detaljerte beskrivelser.
 * Ekstrahert fra analyse-side (#169).
 */

import type { BigFiveScores, RiasecScores } from "@/types/domain";

export const BIG_FIVE_ANALYSE_META: Record<
  keyof BigFiveScores,
  {
    label: string;
    highTitle: string;
    lowTitle: string;
    highDesc: string;
    lowDesc: string;
    midDesc: string;
    color: string;
    implications: string[];
  }
> = {
  openness: {
    label: "Åpenhet for erfaring",
    highTitle: "Kreativ og nysgjerrig",
    lowTitle: "Praktisk og jordnær",
    midDesc: "Balansert mellom kreativitet og praktisk tilnærming",
    highDesc: "Du er nysgjerrig, kreativ og åpen for nye ideer. Du trives med abstrakt tenkning og utforsker gjerne nye konsepter.",
    lowDesc: "Du foretrekker struktur og kjente løsninger. Du er praktisk og foretrekker konkrete resultater fremfor abstrakte teorier.",
    color: "bg-violet-500",
    implications: ["Kunstneriske fag", "Forskning", "Innovasjon", "Filosofi"],
  },
  conscientiousness: {
    label: "Planmessighet",
    highTitle: "Organisert og målrettet",
    lowTitle: "Fleksibel og spontan",
    midDesc: "Moderat strukturert — tilpasser deg situasjonen",
    highDesc: "Du er disiplinert, organisert og pålitelig. Du setter mål og holder deg til planer.",
    lowDesc: "Du er fleksibel og spontan. Du trives bedre med frihet enn strenge rutiner.",
    color: "bg-blue-500",
    implications: ["Medisin", "Juss", "Økonomi", "Prosjektledelse"],
  },
  extraversion: {
    label: "Utadvendthet",
    highTitle: "Utadvendt og energisk",
    lowTitle: "Introvert og refleksiv",
    midDesc: "Ambivert — komfortabel i begge sosiale settinger",
    highDesc: "Du er sosial, pratsam og trives blant folk. Du henter energi fra samvær med andre.",
    lowDesc: "Du er refleksiv og trives godt alene. Du foretrekker dype samtaler fremfor store grupper.",
    color: "bg-amber-500",
    implications: ["Salg", "Undervisning", "Ledelse", "Kommunikasjon"],
  },
  agreeableness: {
    label: "Medmenneskelighet",
    highTitle: "Empatisk og samarbeidsvillig",
    lowTitle: "Direkte og uavhengig",
    midDesc: "Balansert mellom samarbeid og selvhevdelse",
    highDesc: "Du er vennlig, empatisk og samarbeidsvillig. Du verdsetter harmoni og andres velferd.",
    lowDesc: "Du er direkte og uavhengig. Du holder deg til fakta og er ikke redd for å utfordre andres synspunkter.",
    color: "bg-green-500",
    implications: ["Helsefag", "Sosialt arbeid", "HR", "Rådgivning"],
  },
  neuroticism: {
    label: "Emosjonell stabilitet",
    highTitle: "Følsom og reaktiv",
    lowTitle: "Rolig og stabil",
    midDesc: "Moderat emosjonell sensitivitet",
    highDesc: "Du er emosjonelt sensitiv og opplever sterke følelser. Dette kan gi kreativ energi og empati.",
    lowDesc: "Du er rolig, stabil og håndterer stress godt. Du bevarer roen i krevende situasjoner.",
    color: "bg-rose-500",
    implications: ["Kunst", "Psykologi", "Skriving", "Musikk"],
  },
};

export const RIASEC_ANALYSE_META: Record<
  keyof RiasecScores,
  {
    label: string;
    letter: string;
    color: string;
    desc: string;
    strengths: string[];
    careers: string[];
  }
> = {
  realistic: {
    label: "Realistisk",
    letter: "R",
    color: "bg-slate-500",
    desc: "Liker praktisk arbeid, maskiner og konkrete problemer.",
    strengths: ["Teknisk", "Håndverk", "Natur", "Mekanikk"],
    careers: ["Ingeniør", "Håndverker", "Pilot", "Jordbruker"],
  },
  investigative: {
    label: "Undersøkende",
    letter: "I",
    color: "bg-blue-500",
    desc: "Liker å analysere, forske og løse komplekse problemer.",
    strengths: ["Analytisk", "Vitenskapelig", "Logisk", "Kritisk"],
    careers: ["Forsker", "Lege", "Dataanalytiker", "Økonom"],
  },
  artistic: {
    label: "Artistisk",
    letter: "A",
    color: "bg-violet-500",
    desc: "Liker kreativt arbeid, selvuttrykk og estetikk.",
    strengths: ["Kreativ", "Intuitiv", "Ekspressiv", "Sensitiv"],
    careers: ["Designer", "Forfatter", "Arkitekt", "Skuespiller"],
  },
  social: {
    label: "Sosial",
    letter: "S",
    color: "bg-green-500",
    desc: "Liker å hjelpe, undervise og arbeide med mennesker.",
    strengths: ["Empatisk", "Kommunikativ", "Tålmodig", "Støttende"],
    careers: ["Lærer", "Sykepleier", "Rådgiver", "Sosionom"],
  },
  enterprising: {
    label: "Entreprenant",
    letter: "E",
    color: "bg-amber-500",
    desc: "Liker å lede, overtale og ta risiko for å nå mål.",
    strengths: ["Lederskap", "Overbevisende", "Ambisiøs", "Selvsikker"],
    careers: ["Leder", "Gründer", "Politiker", "Selger"],
  },
  conventional: {
    label: "Konvensjonell",
    letter: "C",
    color: "bg-orange-500",
    desc: "Liker struktur, systemer og veldefinerte oppgaver.",
    strengths: ["Organisert", "Nøyaktig", "Pålitelig", "Detaljorientert"],
    careers: ["Revisor", "Sekretær", "Databankfunksjonær", "Bibliotekar"],
  },
};
