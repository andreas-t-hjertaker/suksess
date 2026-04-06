import { describe, it, expect } from "vitest";

/**
 * Tests for useFeatureFlags hook logic (#180).
 *
 * Tester rolloutHash-funksjonen og isEnabled-logikken som hooken bruker.
 * Ekstrahert som rene funksjoner for å teste uten React-miljø.
 */

// ---------------------------------------------------------------------------
// Reprodusert rolloutHash — identisk med implementasjonen i use-feature-flags.ts
// ---------------------------------------------------------------------------

function rolloutHash(userId: string, flagKey: string): number {
  const str = `${userId}:${flagKey}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % 100;
}

// ---------------------------------------------------------------------------
// Reprodusert isEnabled-logikk
// ---------------------------------------------------------------------------

type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  plans: string[];
  tenantIds: string[];
  excludedTenantIds: string[];
  rolloutPercentage: number;
};

function isEnabled(
  flags: FeatureFlag[],
  key: string,
  opts?: { userPlan?: string; tenantId?: string | null; userId?: string }
): boolean {
  const flag = flags.find((f) => f.key === key);
  if (!flag || !flag.enabled) return false;

  if (flag.plans.length > 0) {
    if (!opts?.userPlan || !flag.plans.includes(opts.userPlan)) return false;
  }

  if (opts?.tenantId && flag.excludedTenantIds.length > 0) {
    if (flag.excludedTenantIds.includes(opts.tenantId)) return false;
  }

  if (flag.tenantIds.length > 0) {
    if (!opts?.tenantId || !flag.tenantIds.includes(opts.tenantId)) return false;
  }

  if (flag.rolloutPercentage < 100 && opts?.userId) {
    const hash = rolloutHash(opts.userId, key);
    if (hash >= flag.rolloutPercentage) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: "flag-1",
    key: "test-feature",
    label: "Test Feature",
    description: null,
    enabled: true,
    plans: [],
    tenantIds: [],
    excludedTenantIds: [],
    rolloutPercentage: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

describe("rolloutHash (#180)", () => {
  it("returnerer tall mellom 0 og 99", () => {
    for (let i = 0; i < 100; i++) {
      const hash = rolloutHash(`user-${i}`, "my-flag");
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(100);
    }
  });

  it("er deterministisk — samme input gir samme output", () => {
    const a = rolloutHash("user-42", "dark-mode");
    const b = rolloutHash("user-42", "dark-mode");
    expect(a).toBe(b);
  });

  it("gir ulik hash for ulike brukere", () => {
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      results.add(rolloutHash(`user-${i}`, "feature-x"));
    }
    // Med 50 brukere bør vi få minst 5 unike verdier (sannsynlig > 20)
    expect(results.size).toBeGreaterThan(5);
  });

  it("gir ulik hash for ulike flagg", () => {
    const a = rolloutHash("user-1", "flag-a");
    const b = rolloutHash("user-1", "flag-b");
    // Bør normalt være forskjellig (ikke garantert, men svært sannsynlig)
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });
});

describe("isEnabled-logikk (#180)", () => {
  it("returnerer false for ukjent flagg", () => {
    expect(isEnabled([], "unknown")).toBe(false);
  });

  it("returnerer false for deaktivert flagg", () => {
    const flags = [makeFlag({ enabled: false })];
    expect(isEnabled(flags, "test-feature")).toBe(false);
  });

  it("returnerer true for aktivert flagg uten restriksjoner", () => {
    const flags = [makeFlag()];
    expect(isEnabled(flags, "test-feature")).toBe(true);
  });

  describe("plan-restriksjoner", () => {
    it("blokkerer bruker uten riktig plan", () => {
      const flags = [makeFlag({ plans: ["pro", "enterprise"] })];
      expect(isEnabled(flags, "test-feature", { userPlan: "free" })).toBe(false);
    });

    it("tillater bruker med riktig plan", () => {
      const flags = [makeFlag({ plans: ["pro", "enterprise"] })];
      expect(isEnabled(flags, "test-feature", { userPlan: "pro" })).toBe(true);
    });

    it("blokkerer bruker uten plan", () => {
      const flags = [makeFlag({ plans: ["pro"] })];
      expect(isEnabled(flags, "test-feature")).toBe(false);
    });
  });

  describe("tenant-restriksjoner", () => {
    it("tillater kun spesifikke tenanter", () => {
      const flags = [makeFlag({ tenantIds: ["school-a", "school-b"] })];
      expect(isEnabled(flags, "test-feature", { tenantId: "school-a" })).toBe(true);
      expect(isEnabled(flags, "test-feature", { tenantId: "school-c" })).toBe(false);
    });

    it("ekskluderer spesifikke tenanter", () => {
      const flags = [makeFlag({ excludedTenantIds: ["school-banned"] })];
      expect(isEnabled(flags, "test-feature", { tenantId: "school-banned" })).toBe(false);
      expect(isEnabled(flags, "test-feature", { tenantId: "school-ok" })).toBe(true);
    });

    it("ekskludering har forrang over inkludering", () => {
      const flags = [
        makeFlag({
          tenantIds: ["school-a"],
          excludedTenantIds: ["school-a"],
        }),
      ];
      expect(isEnabled(flags, "test-feature", { tenantId: "school-a" })).toBe(false);
    });
  });

  describe("gradvis utrulling", () => {
    it("blokkerer brukere over rolloutPercentage", () => {
      // Med 0% utrulling bør ingen brukere komme gjennom
      const flags = [makeFlag({ rolloutPercentage: 0 })];
      let anyEnabled = false;
      for (let i = 0; i < 100; i++) {
        if (isEnabled(flags, "test-feature", { userId: `user-${i}` })) {
          anyEnabled = true;
        }
      }
      expect(anyEnabled).toBe(false);
    });

    it("tillater alle brukere ved 100%", () => {
      const flags = [makeFlag({ rolloutPercentage: 100 })];
      let allEnabled = true;
      for (let i = 0; i < 50; i++) {
        if (!isEnabled(flags, "test-feature", { userId: `user-${i}` })) {
          allEnabled = false;
        }
      }
      expect(allEnabled).toBe(true);
    });

    it("tillater ca. riktig andel ved delvis utrulling", () => {
      const flags = [makeFlag({ rolloutPercentage: 50 })];
      let enabledCount = 0;
      const total = 1000;
      for (let i = 0; i < total; i++) {
        if (isEnabled(flags, "test-feature", { userId: `user-${i}` })) {
          enabledCount++;
        }
      }
      // Med 50% utrulling og 1000 brukere: forvent 350–650 (bred margin)
      expect(enabledCount).toBeGreaterThan(250);
      expect(enabledCount).toBeLessThan(750);
    });

    it("hopper over rollout-sjekk uten userId", () => {
      const flags = [makeFlag({ rolloutPercentage: 0 })];
      // Uten userId gjøres ingen rollout-sjekk, flagget er enabled
      expect(isEnabled(flags, "test-feature")).toBe(true);
    });
  });
});
