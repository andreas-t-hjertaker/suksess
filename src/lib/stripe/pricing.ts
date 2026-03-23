import type { PricingPlan } from "@/types";

/**
 * Suksess prisplaner.
 *
 * Price IDs hentes fra miljøvariabler (settes i .env.local / Firebase config):
 *   NEXT_PUBLIC_STRIPE_PRICE_PRO    — Pro Student månedspris
 *   NEXT_PUBLIC_STRIPE_PRICE_SKOLE  — Skole månedspris
 *
 * Free-planen har ingen Stripe Price ID (gratis tier).
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
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
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SKOLE ?? "",
  },
];
