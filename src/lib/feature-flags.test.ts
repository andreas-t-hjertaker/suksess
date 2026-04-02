import { describe, it, expect } from "vitest";

/**
 * Deterministisk hash for gradvis utrulling (speilet fra use-feature-flags.ts).
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

type Flag = {
  key: string;
  enabled: boolean;
  plans: string[];
  tenantIds: string[];
  excludedTenantIds: string[];
  rolloutPercentage: number;
};

type Opts = {
  userPlan?: string;
  tenantId?: string | null;
  userId?: string;
};

/**
 * Pure-function versjon av isEnabled-logikken (speilet fra use-feature-flags.ts).
 */
function isEnabled(flag: Flag, opts?: Opts): boolean {
  if (!flag.enabled) return false;
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
    const hash = rolloutHash(opts.userId, flag.key);
    if (hash >= flag.rolloutPercentage) return false;
  }
  return true;
}

describe("Tenant-basert feature flags", () => {
  const baseFlag: Flag = {
    key: "new_dashboard",
    enabled: true,
    plans: [],
    tenantIds: [],
    excludedTenantIds: [],
    rolloutPercentage: 100,
  };

  it("returnerer true for et aktivert globalt flagg uten begrensninger", () => {
    expect(isEnabled(baseFlag)).toBe(true);
  });

  it("returnerer false for et deaktivert flagg", () => {
    expect(isEnabled({ ...baseFlag, enabled: false })).toBe(false);
  });

  describe("plan-targeting", () => {
    const planFlag: Flag = { ...baseFlag, plans: ["pro", "school"] };

    it("returnerer true når brukerplan matcher", () => {
      expect(isEnabled(planFlag, { userPlan: "pro" })).toBe(true);
    });

    it("returnerer false når brukerplan ikke matcher", () => {
      expect(isEnabled(planFlag, { userPlan: "free" })).toBe(false);
    });

    it("returnerer false uten brukerplan", () => {
      expect(isEnabled(planFlag)).toBe(false);
    });
  });

  describe("tenant-targeting", () => {
    const tenantFlag: Flag = { ...baseFlag, tenantIds: ["nydalen-vgs", "frogner-vgs"] };

    it("returnerer true for inkludert tenant", () => {
      expect(isEnabled(tenantFlag, { tenantId: "nydalen-vgs" })).toBe(true);
    });

    it("returnerer false for ikke-inkludert tenant", () => {
      expect(isEnabled(tenantFlag, { tenantId: "oslo-kommune" })).toBe(false);
    });

    it("returnerer false uten tenantId", () => {
      expect(isEnabled(tenantFlag)).toBe(false);
    });

    it("returnerer true for alle tenanter når tenantIds er tom", () => {
      expect(isEnabled(baseFlag, { tenantId: "any-tenant" })).toBe(true);
    });
  });

  describe("tenant-ekskludering", () => {
    const excludedFlag: Flag = { ...baseFlag, excludedTenantIds: ["test-skole"] };

    it("returnerer false for ekskludert tenant", () => {
      expect(isEnabled(excludedFlag, { tenantId: "test-skole" })).toBe(false);
    });

    it("returnerer true for ikke-ekskludert tenant", () => {
      expect(isEnabled(excludedFlag, { tenantId: "annen-skole" })).toBe(true);
    });

    it("returnerer true uten tenantId (globalt)", () => {
      expect(isEnabled(excludedFlag)).toBe(true);
    });
  });

  describe("gradvis utrulling", () => {
    const rolloutFlag: Flag = { ...baseFlag, rolloutPercentage: 50 };

    it("hash er deterministisk for samme bruker+flagg", () => {
      const h1 = rolloutHash("user-1", "test_flag");
      const h2 = rolloutHash("user-1", "test_flag");
      expect(h1).toBe(h2);
    });

    it("hash er forskjellig for ulike brukere", () => {
      const h1 = rolloutHash("user-1", "test_flag");
      const h2 = rolloutHash("user-2", "test_flag");
      expect(h1).not.toBe(h2);
    });

    it("hash er mellom 0 og 99", () => {
      for (let i = 0; i < 100; i++) {
        const h = rolloutHash(`user-${i}`, "test_flag");
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(100);
      }
    });

    it("0% utrulling blokkerer alle brukere med userId", () => {
      const zeroFlag: Flag = { ...baseFlag, rolloutPercentage: 0 };
      for (let i = 0; i < 20; i++) {
        expect(isEnabled(zeroFlag, { userId: `user-${i}` })).toBe(false);
      }
    });

    it("100% utrulling tillater alle", () => {
      for (let i = 0; i < 20; i++) {
        expect(isEnabled(baseFlag, { userId: `user-${i}` })).toBe(true);
      }
    });

    it("50% utrulling gir blanding av true/false", () => {
      const results = Array.from({ length: 100 }, (_, i) =>
        isEnabled(rolloutFlag, { userId: `user-${i}` })
      );
      const enabled = results.filter(Boolean).length;
      // Med 100 brukere bør vi ha en rimelig fordeling (20-80)
      expect(enabled).toBeGreaterThan(20);
      expect(enabled).toBeLessThan(80);
    });
  });

  describe("kombinert targeting", () => {
    const comboFlag: Flag = {
      key: "premium_feature",
      enabled: true,
      plans: ["pro"],
      tenantIds: ["nydalen-vgs"],
      excludedTenantIds: [],
      rolloutPercentage: 100,
    };

    it("returnerer true når alle kriterier matcher", () => {
      expect(
        isEnabled(comboFlag, { userPlan: "pro", tenantId: "nydalen-vgs" })
      ).toBe(true);
    });

    it("returnerer false når plan ikke matcher", () => {
      expect(
        isEnabled(comboFlag, { userPlan: "free", tenantId: "nydalen-vgs" })
      ).toBe(false);
    });

    it("returnerer false når tenant ikke matcher", () => {
      expect(
        isEnabled(comboFlag, { userPlan: "pro", tenantId: "frogner-vgs" })
      ).toBe(false);
    });
  });
});
