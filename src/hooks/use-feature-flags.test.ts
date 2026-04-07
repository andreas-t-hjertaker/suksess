import { describe, it, expect } from "vitest";

/**
 * Tests for useFeatureFlags hook logic (#180).
 *
 * Tester den rene evalueringslogikken for feature flags
 * (plan-sjekk, tenant inkludering/ekskludering, gradvis utrulling).
 */

// ---------------------------------------------------------------------------
// Gjenskapte rene funksjoner fra hooken for testing
// ---------------------------------------------------------------------------

/**
 * Deterministisk hash for gradvis utrulling.
 * Returnerer tall mellom 0–99 basert på bruker-ID + flagg-nøkkel.
 */
function rolloutHash(userId: string, flagKey: string): number {
  const str = `${userId}:${flagKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % 100;
}

type FeatureFlag = {
  key: string;
  enabled: boolean;
  plans: string[];
  tenantIds: string[];
  excludedTenantIds: string[];
  rolloutPercentage: number;
};

/** Evaluer om et flagg er aktivt for gitt kontekst */
function evaluateFlag(
  flag: FeatureFlag | undefined,
  opts?: {
    userPlan?: string;
    tenantId?: string | null;
    userId?: string;
  }
): boolean {
  if (!flag || !flag.enabled) return false;

  // Plan-sjekk
  if (flag.plans.length > 0) {
    if (!opts?.userPlan || !flag.plans.includes(opts.userPlan)) return false;
  }

  // Tenant-ekskludering
  if (opts?.tenantId && flag.excludedTenantIds.length > 0) {
    if (flag.excludedTenantIds.includes(opts.tenantId)) return false;
  }

  // Tenant-inkludering
  if (flag.tenantIds.length > 0) {
    if (!opts?.tenantId || !flag.tenantIds.includes(opts.tenantId)) return false;
  }

  // Gradvis utrulling
  if (flag.rolloutPercentage < 100 && opts?.userId) {
    const hash = rolloutHash(opts.userId, flag.key);
    if (hash >= flag.rolloutPercentage) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// rolloutHash
// ---------------------------------------------------------------------------

describe("rolloutHash", () => {
  it("returnerer tall mellom 0 og 99", () => {
    for (let i = 0; i < 100; i++) {
      const hash = rolloutHash(`user-${i}`, "test-flag");
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(100);
    }
  });

  it("er deterministisk — samme input gir alltid samme output", () => {
    const a = rolloutHash("user-123", "dark-mode");
    const b = rolloutHash("user-123", "dark-mode");
    expect(a).toBe(b);
  });

  it("gir forskjellig resultat for ulike brukere", () => {
    // Test at funksjonen produserer variert output over mange brukere
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      results.add(rolloutHash(`user-${i}`, "feature"));
    }
    expect(results.size).toBeGreaterThan(5); // Minst 5 unike verdier
  });

  it("gir forskjellig resultat for ulike flagg", () => {
    // Test at funksjonen produserer variert output over mange flagg
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      results.add(rolloutHash("user-1", `flag-${i}`));
    }
    expect(results.size).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// evaluateFlag — plan-sjekk
// ---------------------------------------------------------------------------

describe("evaluateFlag — plans", () => {
  const baseFlag: FeatureFlag = {
    key: "premium-feature",
    enabled: true,
    plans: ["premium", "enterprise"],
    tenantIds: [],
    excludedTenantIds: [],
    rolloutPercentage: 100,
  };

  it("returnerer false for ukjent flagg", () => {
    expect(evaluateFlag(undefined)).toBe(false);
  });

  it("returnerer false for deaktivert flagg", () => {
    expect(evaluateFlag({ ...baseFlag, enabled: false })).toBe(false);
  });

  it("returnerer true for flagg uten planbegrensning", () => {
    expect(evaluateFlag({ ...baseFlag, plans: [] })).toBe(true);
  });

  it("returnerer true når brukerplan er inkludert", () => {
    expect(evaluateFlag(baseFlag, { userPlan: "premium" })).toBe(true);
    expect(evaluateFlag(baseFlag, { userPlan: "enterprise" })).toBe(true);
  });

  it("returnerer false når brukerplan ikke er inkludert", () => {
    expect(evaluateFlag(baseFlag, { userPlan: "free" })).toBe(false);
  });

  it("returnerer false når ingen brukerplan er angitt", () => {
    expect(evaluateFlag(baseFlag)).toBe(false);
    expect(evaluateFlag(baseFlag, {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateFlag — tenant inkludering/ekskludering
// ---------------------------------------------------------------------------

describe("evaluateFlag — tenants", () => {
  const baseFlagAllPlans: FeatureFlag = {
    key: "school-feature",
    enabled: true,
    plans: [],
    tenantIds: ["tenant-a", "tenant-b"],
    excludedTenantIds: [],
    rolloutPercentage: 100,
  };

  it("returnerer true for inkludert tenant", () => {
    expect(evaluateFlag(baseFlagAllPlans, { tenantId: "tenant-a" })).toBe(true);
  });

  it("returnerer false for ikke-inkludert tenant", () => {
    expect(evaluateFlag(baseFlagAllPlans, { tenantId: "tenant-c" })).toBe(false);
  });

  it("returnerer false når tenant mangler men flagg krever det", () => {
    expect(evaluateFlag(baseFlagAllPlans, { tenantId: null })).toBe(false);
    expect(evaluateFlag(baseFlagAllPlans)).toBe(false);
  });

  it("returnerer true for alle tenanter når tenantIds er tom", () => {
    const openFlag = { ...baseFlagAllPlans, tenantIds: [] };
    expect(evaluateFlag(openFlag, { tenantId: "any-tenant" })).toBe(true);
    expect(evaluateFlag(openFlag)).toBe(true);
  });

  it("returnerer false for ekskludert tenant", () => {
    const excludeFlag: FeatureFlag = {
      ...baseFlagAllPlans,
      tenantIds: [],
      excludedTenantIds: ["banned-tenant"],
    };
    expect(evaluateFlag(excludeFlag, { tenantId: "banned-tenant" })).toBe(false);
  });

  it("returnerer true for ikke-ekskludert tenant", () => {
    const excludeFlag: FeatureFlag = {
      ...baseFlagAllPlans,
      tenantIds: [],
      excludedTenantIds: ["banned-tenant"],
    };
    expect(evaluateFlag(excludeFlag, { tenantId: "good-tenant" })).toBe(true);
  });

  it("ekskludering har prioritet over inkludering", () => {
    const conflictFlag: FeatureFlag = {
      ...baseFlagAllPlans,
      tenantIds: ["tenant-a"],
      excludedTenantIds: ["tenant-a"],
    };
    expect(evaluateFlag(conflictFlag, { tenantId: "tenant-a" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateFlag — gradvis utrulling
// ---------------------------------------------------------------------------

describe("evaluateFlag — rollout percentage", () => {
  const baseFlag: FeatureFlag = {
    key: "new-ui",
    enabled: true,
    plans: [],
    tenantIds: [],
    excludedTenantIds: [],
    rolloutPercentage: 50,
  };

  it("100% utrulling gir alltid true", () => {
    const fullRollout = { ...baseFlag, rolloutPercentage: 100 };
    for (let i = 0; i < 20; i++) {
      expect(evaluateFlag(fullRollout, { userId: `user-${i}` })).toBe(true);
    }
  });

  it("0% utrulling gir alltid false (med userId)", () => {
    const noRollout = { ...baseFlag, rolloutPercentage: 0 };
    for (let i = 0; i < 20; i++) {
      expect(evaluateFlag(noRollout, { userId: `user-${i}` })).toBe(false);
    }
  });

  it("50% utrulling gir omtrent halvparten", () => {
    let trueCount = 0;
    const total = 200;
    for (let i = 0; i < total; i++) {
      if (evaluateFlag(baseFlag, { userId: `user-${i}` })) trueCount++;
    }
    // Forvent mellom 20% og 80% — deterministisk hash, ikke tilfeldig
    expect(trueCount).toBeGreaterThan(total * 0.2);
    expect(trueCount).toBeLessThan(total * 0.8);
  });

  it("uten userId ignoreres rollout-sjekken", () => {
    expect(evaluateFlag(baseFlag)).toBe(true);
    expect(evaluateFlag(baseFlag, {})).toBe(true);
  });

  it("er deterministisk for samme bruker", () => {
    const a = evaluateFlag(baseFlag, { userId: "user-42" });
    const b = evaluateFlag(baseFlag, { userId: "user-42" });
    expect(a).toBe(b);
  });
});
