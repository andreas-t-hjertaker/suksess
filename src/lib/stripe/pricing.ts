import type { PricingPlan } from "@/types";

/**
 * Suksess prisplaner.
 * Oppdater stripePriceId med faktiske Stripe Price IDs fra Stripe Dashboard.
 * Disse brukes på /pricing-siden og i checkout-flyten.
 */
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
