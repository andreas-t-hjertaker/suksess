import type { PricingPlan } from "@/types";

/**
 * Definer prisplaner her. Oppdater stripePriceId med faktiske Stripe Price IDs.
 * Disse brukes både på /pricing-siden og i checkout-flyten.
 */
export const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Gratis",
    description: "For å komme i gang",
    price: 0,
    currency: "NOK",
    interval: "month",
    features: [
      "1 prosjekt",
      "100 API-kall per dag",
      "Fellesskapsstøtte",
    ],
    stripePriceId: "",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For profesjonelle",
    price: 299,
    currency: "NOK",
    interval: "month",
    features: [
      "Ubegrenset prosjekter",
      "10 000 API-kall per dag",
      "Prioritert støtte",
      "API-tilgang",
    ],
    stripePriceId: "price_REPLACE_ME",
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    description: "For team og bedrifter",
    price: 999,
    currency: "NOK",
    interval: "month",
    features: [
      "Alt i Pro",
      "Ubegrenset API-kall",
      "Teammedlemmer",
      "SLA-garanti",
      "Dedikert støtte",
    ],
    stripePriceId: "price_REPLACE_ME",
  },
];
