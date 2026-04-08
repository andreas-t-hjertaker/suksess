/**
 * Type-sikker miljøvariabel-validering med Zod (#149)
 *
 * Validerer at alle nødvendige NEXT_PUBLIC_*-variabler er satt.
 * Gir tydelig feilmelding ved manglende verdier.
 *
 * Bruk:
 *   import { env } from "@/lib/env";
 *   env.NEXT_PUBLIC_FIREBASE_PROJECT_ID // type-sikker string
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Skjema — klient-side miljøvariabler (NEXT_PUBLIC_*)
// ---------------------------------------------------------------------------

const clientEnvSchema = z.object({
  // Firebase (påkrevd)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "Firebase API key mangler"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "Firebase auth domain mangler"),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "Firebase project ID mangler"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "Firebase app ID mangler"),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional().default(""),

  // App Check
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: z.string().optional().default(""),

  // Feide
  NEXT_PUBLIC_FEIDE_PROVIDER_ID: z.string().optional().default("oidc.feide"),

  // Weaviate
  NEXT_PUBLIC_WEAVIATE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_WEAVIATE_PROXY: z.string().optional().default("/api/search"),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PRICE_PRO: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PRICE_SKOLE: z.string().optional().default(""),

  // Cloud Functions
  NEXT_PUBLIC_CF_BASE_URL: z
    .string()
    .optional()
    .default("https://europe-west1-suksess-842ed.cloudfunctions.net"),

  // App metadata (satt i next.config.ts)
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("Suksess"),
  NEXT_PUBLIC_APP_VERSION: z.string().optional().default("0.1.0"),
  NEXT_PUBLIC_REGION: z.string().optional().default("europe-west1"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ---------------------------------------------------------------------------
// Inline env-verdier
// ---------------------------------------------------------------------------
// VIKTIG: Next.js (Turbopack) erstatter bare individuelle
// process.env.NEXT_PUBLIC_*-referanser med faktiske verdier under build.
// «process.env» som et objekt BLIR IKKE erstattet — det er et tomt objekt
// på klientsiden. Derfor må hver variabel hentes ut eksplisitt.
// ---------------------------------------------------------------------------

const inlinedEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ?? "",
  NEXT_PUBLIC_FEIDE_PROVIDER_ID: process.env.NEXT_PUBLIC_FEIDE_PROVIDER_ID ?? "",
  NEXT_PUBLIC_WEAVIATE_URL: process.env.NEXT_PUBLIC_WEAVIATE_URL ?? "",
  NEXT_PUBLIC_WEAVIATE_PROXY: process.env.NEXT_PUBLIC_WEAVIATE_PROXY ?? "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  NEXT_PUBLIC_STRIPE_PRICE_PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
  NEXT_PUBLIC_STRIPE_PRICE_SKOLE: process.env.NEXT_PUBLIC_STRIPE_PRICE_SKOLE ?? "",
  NEXT_PUBLIC_CF_BASE_URL: process.env.NEXT_PUBLIC_CF_BASE_URL ?? "",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "",
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
  NEXT_PUBLIC_REGION: process.env.NEXT_PUBLIC_REGION ?? "",
};

// ---------------------------------------------------------------------------
// Validering — kjøres ved import (lazy, én gang)
// ---------------------------------------------------------------------------

let _env: ClientEnv | null = null;

function validateEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse(inlinedEnv);

  if (!result.success) {
    const missing = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    console.error(
      `\n❌ Manglende miljøvariabler:\n${missing}\n\n` +
        `Kopier .env.local.example til .env.local og fyll inn verdier.\n`
    );

    // I produksjon: ikke kast feil — logg og bruk defaults slik at SSR fungerer
    // Klient-side Firebase-init feiler uansett uten gyldig apiKey
    if (typeof window !== "undefined") {
      console.warn(
        "[env] Kjører klient-side uten gyldige Firebase-variabler — appen vil ikke fungere korrekt."
      );
    }
  }

  // Alltid returner parsed (med defaults) — unngå at build/SSR krasjer
  return clientEnvSchema.parse({
    ...inlinedEnv,
    NEXT_PUBLIC_FIREBASE_API_KEY:
      inlinedEnv.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      inlinedEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      inlinedEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder",
    NEXT_PUBLIC_FIREBASE_APP_ID:
      inlinedEnv.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder",
  });
}

/** Type-sikre miljøvariabler — validert med Zod (v2) */
export const env: ClientEnv = (() => {
  if (!_env) _env = validateEnv();
  return _env;
})();
