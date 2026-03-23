import type { PricingPlan } from "@/types";

/**
 * Suksess prisplaner (Issue #32).
 * Oppdater stripePriceId med faktiske Stripe Price IDs fra Stripe Dashboard.
 * Disse brukes på /pricing-siden og i checkout-flyten.
 *
 * B2B skoleplaner faktureres via send_invoice + netto 30 dager.
 * MVA: 25 % (SaaS-verktøy er ikke fritatt selv om kjøper er skole).
 */

// B2B skole-tiers (flat-rate etter skolestørrelse, Issue #32)
export type SchoolTier = "liten" | "medium" | "stor" | "kommune";

export const SCHOOL_TIERS: Record<SchoolTier, {
  name: string;
  elever: string;
  prisPerAar: number;
  stripePriceId: string;
}> = {
  liten: {
    name: "Liten skole",
    elever: "1–200 elever",
    prisPerAar: 12_500,
    stripePriceId: "price_REPLACE_SCHOOL_LITEN",
  },
  medium: {
    name: "Mellomstor skole",
    elever: "201–500 elever",
    prisPerAar: 37_500,
    stripePriceId: "price_REPLACE_SCHOOL_MEDIUM",
  },
  stor: {
    name: "Stor skole",
    elever: "500+ elever",
    stripePriceId: "price_REPLACE_SCHOOL_STOR",
    prisPerAar: 75_000,
  },
  kommune: {
    name: "Kommune-avtale",
    elever: "10–30 skoler",
    stripePriceId: "price_REPLACE_SCHOOL_KOMMUNE",
    prisPerAar: 250_000,
  },
};

export const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Utforsker",
    description: "Kom i gang med karriereutforsking",
    price: 0,
    currency: "NOK",
    interval: "month",
    features: [
      "Personlighetsprofil (Big Five + RIASEC)",
      "Karriereutforsker med 50+ yrker",
      "Karakterkalkulator og SO-poeng",
      "Grunnleggende AI-veileder (10 spørsmål/dag)",
      "CV-builder",
    ],
    stripePriceId: "",
  },
  {
    id: "pro",
    name: "Pro Student",
    description: "Full karriere- og studieveiledning",
    price: 99,
    currency: "NOK",
    interval: "month",
    features: [
      "Alt i Utforsker",
      "Ubegrenset AI-veileder med personalisering",
      "Søknads-coach med historiske trender",
      "Jobbmatch og AI-generert søknadsbrev",
      "Studiemestring og eksamensplan",
      "Karrieregraf (visuell sti-utforsker)",
      "XP-system og alle achievements",
      "Prioritert støtte",
    ],
    stripePriceId: "price_REPLACE_WITH_STRIPE_PRICE_ID",
    highlighted: true,
  },
  {
    id: "skole",
    name: "Skole",
    description: "For videregående skoler og rådgivere",
    price: 4990,
    currency: "NOK",
    interval: "month",
    features: [
      "Alt i Pro Student",
      "Inntil 500 elever",
      "Rådgiver-dashboard med aggregert statistikk",
      "Frafallsrisiko-varsler",
      "Eksport av elevdata (GDPR-compliant)",
      "Tilpasset branding",
      "SLA-garanti og dedikert support",
      "Onboarding og opplæring",
    ],
    stripePriceId: "price_REPLACE_WITH_STRIPE_SCHOOL_PRICE_ID",
  },
];
