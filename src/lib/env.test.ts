import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-define the schema for testing (avoiding side effects from the module)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "Firebase API key mangler"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "Firebase auth domain mangler"),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "Firebase project ID mangler"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "Firebase app ID mangler"),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_FEIDE_PROVIDER_ID: z.string().optional().default("oidc.feide"),
  NEXT_PUBLIC_WEAVIATE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_WEAVIATE_PROXY: z.string().optional().default("/api/search"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PRICE_PRO: z.string().optional().default(""),
  NEXT_PUBLIC_STRIPE_PRICE_SKOLE: z.string().optional().default(""),
  NEXT_PUBLIC_CF_BASE_URL: z.string().optional().default("https://europe-west1-suksess-842ed.cloudfunctions.net"),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("Suksess"),
  NEXT_PUBLIC_APP_VERSION: z.string().optional().default("0.1.0"),
  NEXT_PUBLIC_REGION: z.string().optional().default("europe-west1"),
});

describe("env-validering (#149)", () => {
  it("validerer komplett sett med miljøvariabler", () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyTestKey",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe("test-project");
      expect(result.data.NEXT_PUBLIC_FEIDE_PROVIDER_ID).toBe("oidc.feide");
      expect(result.data.NEXT_PUBLIC_REGION).toBe("europe-west1");
    }
  });

  it("avviser manglende påkrevde variabler", () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_FIREBASE_API_KEY: undefined,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined,
      NEXT_PUBLIC_FIREBASE_APP_ID: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorStr = JSON.stringify(result.error);
      expect(errorStr).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
      expect(errorStr).toContain("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    }
  });

  it("avviser tom streng for påkrevde variabler", () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_FIREBASE_API_KEY: "",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
    });
    expect(result.success).toBe(false);
  });

  it("setter default-verdier for valgfrie variabler", () => {
    const result = clientEnvSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: "key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "domain",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "proj",
      NEXT_PUBLIC_FIREBASE_APP_ID: "app",
    });
    expect(result.NEXT_PUBLIC_WEAVIATE_PROXY).toBe("/api/search");
    expect(result.NEXT_PUBLIC_APP_NAME).toBe("Suksess");
    expect(result.NEXT_PUBLIC_CF_BASE_URL).toBe(
      "https://europe-west1-suksess-842ed.cloudfunctions.net"
    );
  });

  it("aksepterer alle valgfrie variabler satt", () => {
    const result = clientEnvSchema.safeParse({
      NEXT_PUBLIC_FIREBASE_API_KEY: "key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "domain",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "proj",
      NEXT_PUBLIC_FIREBASE_APP_ID: "app",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      NEXT_PUBLIC_WEAVIATE_URL: "https://my-cluster.weaviate.network",
      NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: "6LeSiteKey",
    });
    expect(result.success).toBe(true);
  });

  it("har 4 påkrevde string-variabler uten default", () => {
    // Påkrevde = z.string().min(1) — de som feiler med tom/manglende verdi
    const requiredKeys = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ];
    for (const key of requiredKeys) {
      const partial = clientEnvSchema.safeParse({
        NEXT_PUBLIC_FIREBASE_API_KEY: "k",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "d",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "p",
        NEXT_PUBLIC_FIREBASE_APP_ID: "a",
        [key]: "", // tom streng — skal feile
      });
      expect(partial.success, `${key} bør avvise tom streng`).toBe(false);
    }
  });
});
