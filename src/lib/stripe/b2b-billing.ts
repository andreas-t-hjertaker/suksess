/**
 * B2B fakturering for skolelisenser (#110).
 *
 * Håndterer:
 * - Stripe-basert B2B-fakturering med norsk MVA (25%)
 * - EHF/Peppol-kompatibel fakturaoppsett (organisasjonsnr, GLN, referanse)
 * - Skolelisens-planer med elevantall-basert prising
 * - Faktura-metadata for regnskapssystem
 */

import { apiPost } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type B2BCustomer = {
  organizationName: string;
  /** Norsk organisasjonsnummer (9 siffer) */
  organizationNumber: string;
  /** GLN (Global Location Number) for EHF/Peppol-ruting */
  glnNumber?: string;
  /** Fakturareferanse / bestillingsnummer */
  invoiceReference?: string;
  contactEmail: string;
  contactName: string;
  address: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: "NO";
  };
  /** Tenant-ID i Suksess */
  tenantId: string;
};

export type SchoolLicensePlan = {
  id: string;
  name: string;
  description: string;
  pricePerStudentPerMonth: number;
  minStudents: number;
  maxStudents: number;
  features: string[];
  currency: "NOK";
};

export type B2BInvoice = {
  id: string;
  stripeInvoiceId: string;
  tenantId: string;
  organizationNumber: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  amountDue: number;
  amountPaid: number;
  tax: number;
  currency: "NOK";
  dueDate: string;
  invoiceNumber: string;
  pdfUrl: string | null;
  ehfStatus: "pending" | "sent" | "delivered" | "failed" | "not_applicable";
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Skolelisens-planer
// ---------------------------------------------------------------------------

export const schoolLicensePlans: SchoolLicensePlan[] = [
  {
    id: "pilot",
    name: "Pilot",
    description: "Gratisplan for pilotskoler — perfekt for å teste plattformen",
    pricePerStudentPerMonth: 0,
    minStudents: 1,
    maxStudents: 50,
    features: [
      "Inntil 50 elever",
      "Grunnleggende rådgiver-dashboard",
      "Personlighetstest og karriereutforsker",
      "E-poststøtte",
      "3 måneders pilot-periode",
    ],
    currency: "NOK",
  },
  {
    id: "school",
    name: "Skole",
    description: "For enkeltskoler med full tilgang",
    pricePerStudentPerMonth: 29,
    minStudents: 50,
    maxStudents: 1000,
    features: [
      "Inntil 1 000 elever",
      "Full rådgiver-dashboard med analyse",
      "AI-veileder med ubegrenset bruk",
      "Frafallsrisiko-varsler",
      "GDPR-compliant dataeksport",
      "Tilpasset branding",
      "EHF/Peppol-fakturering",
      "Dedikert kontaktperson",
      "Onboarding og opplæring",
    ],
    currency: "NOK",
  },
  {
    id: "municipality",
    name: "Kommune",
    description: "For kommuner med flere skoler",
    pricePerStudentPerMonth: 22,
    minStudents: 200,
    maxStudents: 10000,
    features: [
      "Alle skoler i kommunen",
      "Alt i Skole-planen",
      "Aggregert kommunestatistikk",
      "Sentral brukeradministrasjon",
      "Feide-integrasjon med gruppesynkronisering",
      "Volumrabatt",
      "SLA-garanti (99,9% oppetid)",
      "Kvartalsvis gjennomgang",
    ],
    currency: "NOK",
  },
];

// ---------------------------------------------------------------------------
// Beregninger
// ---------------------------------------------------------------------------

const MVA_RATE = 0.25; // 25% norsk MVA

export function calculateLicenseCost(plan: SchoolLicensePlan, studentCount: number) {
  const effectiveStudents = Math.max(plan.minStudents, Math.min(plan.maxStudents, studentCount));
  const monthlyExVat = plan.pricePerStudentPerMonth * effectiveStudents;
  const monthlyVat = Math.round(monthlyExVat * MVA_RATE);
  const monthlyTotal = monthlyExVat + monthlyVat;
  const yearlyExVat = monthlyExVat * 12;
  const yearlyVat = monthlyVat * 12;
  const yearlyTotal = yearlyExVat + yearlyVat;

  return {
    studentCount: effectiveStudents,
    pricePerStudent: plan.pricePerStudentPerMonth,
    monthlyExVat,
    monthlyVat,
    monthlyTotal,
    yearlyExVat,
    yearlyVat,
    yearlyTotal,
    currency: "NOK" as const,
    vatRate: MVA_RATE,
  };
}

/**
 * Valider norsk organisasjonsnummer (MOD11-kontrollsiffer).
 */
export function validateOrganizationNumber(orgNr: string): boolean {
  const digits = orgNr.replace(/\s/g, "");
  if (!/^\d{9}$/.test(digits)) return false;

  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;

  // Kontrollsiffer 10 er ugyldig
  if (checkDigit === 10) return false;
  return checkDigit === parseInt(digits[8]);
}

/**
 * Formater norsk organisasjonsnummer: 123 456 789
 */
export function formatOrganizationNumber(orgNr: string): string {
  const digits = orgNr.replace(/\s/g, "");
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

// ---------------------------------------------------------------------------
// API-integrasjon
// ---------------------------------------------------------------------------

/**
 * Opprett B2B-kunde i Stripe med EHF/Peppol-metadata.
 */
export async function createB2BCustomer(customer: B2BCustomer) {
  return apiPost("/stripe/b2b/customer", customer);
}

/**
 * Opprett B2B-abonnement med skolelisens.
 */
export async function createB2BSubscription(params: {
  tenantId: string;
  planId: string;
  studentCount: number;
  invoiceReference?: string;
}) {
  return apiPost("/stripe/b2b/subscription", params);
}

/**
 * Hent fakturaoversikt for en tenant.
 */
export async function getB2BInvoices(tenantId: string) {
  const { fetchApi } = await import("@/lib/api-client");
  return fetchApi<B2BInvoice[]>(`/stripe/b2b/invoices?tenantId=${tenantId}`);
}
