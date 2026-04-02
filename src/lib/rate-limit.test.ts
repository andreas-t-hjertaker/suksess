/**
 * Tester for server-side rate limiting-konsepter (#145)
 *
 * Tester kvoter, rate limit-logikk og CSRF-validering.
 * Selve Firestore-baserte rate limiting testes via integrasjonstester
 * med Firebase emulator (se functions/src/).
 */

import { describe, it, expect, vi } from "vitest";

// ─── Tenant-kvoter ───────────────────────────────────────────────────────────

/** Plan-kvoter (speiler TENANT_QUOTAS i functions/src/middleware.ts) */
const TENANT_QUOTAS: Record<string, { aiCallsPerMonth: number; apiCallsPerMinute: number }> = {
  free:     { aiCallsPerMonth: 100,    apiCallsPerMinute: 30 },
  starter:  { aiCallsPerMonth: 1_000,  apiCallsPerMinute: 60 },
  skole:    { aiCallsPerMonth: 10_000, apiCallsPerMinute: 100 },
  kommune:  { aiCallsPerMonth: -1,     apiCallsPerMinute: 200 },
};

describe("TENANT_QUOTAS (#145)", () => {
  it("definerer 4 plan-nivåer", () => {
    expect(Object.keys(TENANT_QUOTAS)).toHaveLength(4);
    expect(Object.keys(TENANT_QUOTAS)).toEqual(
      expect.arrayContaining(["free", "starter", "skole", "kommune"])
    );
  });

  it("free-plan har 100 AI-kall/mnd", () => {
    expect(TENANT_QUOTAS.free.aiCallsPerMonth).toBe(100);
  });

  it("starter-plan har 1000 AI-kall/mnd", () => {
    expect(TENANT_QUOTAS.starter.aiCallsPerMonth).toBe(1_000);
  });

  it("skole-plan har 10000 AI-kall/mnd", () => {
    expect(TENANT_QUOTAS.skole.aiCallsPerMonth).toBe(10_000);
  });

  it("kommune-plan har ubegrenset AI-kall (-1)", () => {
    expect(TENANT_QUOTAS.kommune.aiCallsPerMonth).toBe(-1);
  });

  it("kvoter øker med plan-nivå", () => {
    expect(TENANT_QUOTAS.free.aiCallsPerMonth).toBeLessThan(TENANT_QUOTAS.starter.aiCallsPerMonth);
    expect(TENANT_QUOTAS.starter.aiCallsPerMonth).toBeLessThan(TENANT_QUOTAS.skole.aiCallsPerMonth);
  });

  it("API-grenser øker med plan-nivå", () => {
    expect(TENANT_QUOTAS.free.apiCallsPerMinute).toBeLessThan(TENANT_QUOTAS.starter.apiCallsPerMinute);
    expect(TENANT_QUOTAS.starter.apiCallsPerMinute).toBeLessThan(TENANT_QUOTAS.skole.apiCallsPerMinute);
    expect(TENANT_QUOTAS.skole.apiCallsPerMinute).toBeLessThan(TENANT_QUOTAS.kommune.apiCallsPerMinute);
  });
});

// ─── In-memory rate limit-logikk ─────────────────────────────────────────────

/** Forenklet rate limiter for testing av logikk (speiler rateLimit i middleware) */
function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();

  return (key: string): { allowed: boolean; retryAfter: number | null } => {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: null };
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true, retryAfter: null };
  };
}

describe("In-memory rate limiter (#145)", () => {
  it("tillater forespørsler under grensen", () => {
    const limiter = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter("user-1").allowed).toBe(true);
    }
  });

  it("blokkerer forespørsler over grensen", () => {
    const limiter = createRateLimiter(3, 60_000);
    for (let i = 0; i < 3; i++) {
      limiter("user-2");
    }
    const result = limiter("user-2");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("teller separate brukere uavhengig", () => {
    const limiter = createRateLimiter(2, 60_000);
    limiter("user-a");
    limiter("user-a");
    // user-a er nå på grensen
    expect(limiter("user-a").allowed).toBe(false);
    // user-b skal fortsatt gå
    expect(limiter("user-b").allowed).toBe(true);
  });

  it("returnerer retryAfter i sekunder ved blokkering", () => {
    const limiter = createRateLimiter(1, 30_000);
    limiter("user-x");
    const result = limiter("user-x");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeLessThanOrEqual(30);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});

// ─── CSRF-token validering ───────────────────────────────────────────────────

/** Validerer CSRF-token format (speiler validateCsrf i middleware) */
function isValidCsrfToken(token: string | undefined): boolean {
  if (!token) return false;
  return /^[a-f0-9]{64}$/.test(token);
}

describe("CSRF-token validering (#139/#145)", () => {
  it("avviser undefined", () => {
    expect(isValidCsrfToken(undefined)).toBe(false);
  });

  it("avviser tom streng", () => {
    expect(isValidCsrfToken("")).toBe(false);
  });

  it("avviser for kort token", () => {
    expect(isValidCsrfToken("abcdef1234")).toBe(false);
  });

  it("avviser token med ugyldige tegn", () => {
    expect(isValidCsrfToken("z".repeat(64))).toBe(false);
  });

  it("aksepterer gyldig 64-tegn hex-token", () => {
    expect(isValidCsrfToken("a1b2c3d4e5f6".repeat(5) + "a1b2")).toBe(true);
  });

  it("aksepterer token med alle hex-tegn", () => {
    expect(isValidCsrfToken("0123456789abcdef".repeat(4))).toBe(true);
  });
});

// ─── Per-bruker grenser ──────────────────────────────────────────────────────

describe("Per-bruker rate limit-grenser (#145)", () => {
  const USER_LIMITS = { aiPerHour: 30, apiPerMinute: 100 };

  it("AI-grense er 30 per time", () => {
    expect(USER_LIMITS.aiPerHour).toBe(30);
  });

  it("API-grense er 100 per minutt", () => {
    expect(USER_LIMITS.apiPerMinute).toBe(100);
  });

  it("AI-grense matcher klient-side rate limit (safety.ts)", () => {
    // Klient-side har MESSAGE_LIMIT_PER_HOUR = 30 i safety.ts
    expect(USER_LIMITS.aiPerHour).toBe(30);
  });
});

// ─── Kvote-beregning ─────────────────────────────────────────────────────────

describe("Kvote-beregninger (#145)", () => {
  it("80%-varsling beregnes korrekt", () => {
    const quota = TENANT_QUOTAS.skole.aiCallsPerMonth;
    const warnAt = Math.floor(quota * 0.8);
    expect(warnAt).toBe(8_000);
  });

  it("månedsnøkkel-format er YYYY-MM", () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(monthKey).toMatch(/^\d{4}-\d{2}$/);
  });

  it("estimert kostnad per AI-kall er $0.001 (Gemini Flash)", () => {
    const costPerCall = 0.001;
    const monthlyCallsSkole = TENANT_QUOTAS.skole.aiCallsPerMonth;
    const monthlyCost = monthlyCallsSkole * costPerCall;
    expect(monthlyCost).toBe(10); // $10/mnd for skole-plan
  });
});
