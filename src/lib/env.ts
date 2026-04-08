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
// Validering — kjøres ved import (lazy, én gang)
// ---------------------------------------------------------------------------

let _env: ClientEnv | null = null;

function validateEnv(): ClientEnv {
  // Under bygging (SSG) er env vars kanskje ikke tilgjengelig
  const isBuildTime =
    typeof window === "undefined" &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (isBuildTime) {
    // Returner placeholder-verdier for build-time
    return clientEnvSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: "build-placeholder",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "build-placeholder",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "build-placeholder",
      NEXT_PUBLIC_FIREBASE_APP_ID: "build-placeholder",
    });
  }

  const result = clientEnvSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    console.error(
      `\n❌ Manglende miljøvariabler:\n${missing}\n\n` +
        `Kopier .env.local.example til .env.local og fyll inn verdier.\n`
    );

    // I produksjon: kast feil
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Manglende miljøvariabler:\n${missing}`);
    }

    // I utvikling: returner delvis validert med defaults
    return clientEnvSchema.parse({
      ...process.env,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "missing",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "missing",
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "missing",
    });
  }

  return result.data;
}

/** Type-sikre miljøvariabler — validert med Zod (v2) */
export const env: ClientEnv = (() => {
  if (!_env) _env = validateEnv();
  return _env;
})();
