"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { FeatureFlagSchema } from "@/types/schemas";

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

type FeatureFlagContext = {
  flags: FeatureFlag[];
  loading: boolean;
  /** Sjekk om et flagg er aktivt for gitt bruker/tenant/plan */
  isEnabled: (key: string, opts?: {
    userPlan?: string;
    tenantId?: string | null;
    userId?: string;
  }) => boolean;
  /** Hent alle aktive flagg for en tenant */
  getEnabledFlags: (tenantId?: string | null, userPlan?: string) => FeatureFlag[];
};

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

export function useFeatureFlags(): FeatureFlagContext {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "featureFlags"), (snap) => {
      const validated = snap.docs.reduce<FeatureFlag[]>((acc, d) => {
        const result = FeatureFlagSchema.safeParse(d.data());
        if (result.success) {
          acc.push({
            id: d.id,
            key: result.data.key,
            label: result.data.label,
            description: result.data.description ?? null,
            enabled: result.data.enabled,
            plans: result.data.plans,
            tenantIds: result.data.tenantIds,
            excludedTenantIds: result.data.excludedTenantIds,
            rolloutPercentage: result.data.rolloutPercentage,
          });
        } else {
          console.warn(`[useFeatureFlags] Valideringsfeil for ${d.ref.path}:`, result.error);
        }
        return acc;
      }, []);
      setFlags(validated);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isEnabled = useCallback(
    (key: string, opts?: {
      userPlan?: string;
      tenantId?: string | null;
      userId?: string;
    }): boolean => {
      const flag = flags.find((f) => f.key === key);
      if (!flag || !flag.enabled) return false;

      // Plan-sjekk: hvis flagget er begrenset til spesifikke planer
      if (flag.plans.length > 0) {
        if (!opts?.userPlan || !flag.plans.includes(opts.userPlan)) return false;
      }

      // Tenant-ekskludering: sjekk først om tenanten er eksplisitt ekskludert
      if (opts?.tenantId && flag.excludedTenantIds.length > 0) {
        if (flag.excludedTenantIds.includes(opts.tenantId)) return false;
      }

      // Tenant-inkludering: hvis flagget er begrenset til spesifikke tenanter
      if (flag.tenantIds.length > 0) {
        if (!opts?.tenantId || !flag.tenantIds.includes(opts.tenantId)) return false;
      }

      // Gradvis utrulling: prosentandel-sjekk
      if (flag.rolloutPercentage < 100 && opts?.userId) {
        const hash = rolloutHash(opts.userId, key);
        if (hash >= flag.rolloutPercentage) return false;
      }

      return true;
    },
    [flags]
  );

  const getEnabledFlags = useCallback(
    (tenantId?: string | null, userPlan?: string): FeatureFlag[] => {
      return flags.filter((flag) => {
        if (!flag.enabled) return false;
        if (flag.plans.length > 0 && (!userPlan || !flag.plans.includes(userPlan))) return false;
        if (tenantId && flag.excludedTenantIds.length > 0 && flag.excludedTenantIds.includes(tenantId)) return false;
        if (flag.tenantIds.length > 0 && (!tenantId || !flag.tenantIds.includes(tenantId))) return false;
        return true;
      });
    },
    [flags]
  );

  return { flags, loading, isEnabled, getEnabledFlags };
}
