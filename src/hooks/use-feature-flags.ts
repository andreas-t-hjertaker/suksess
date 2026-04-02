"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { FeatureFlagSchema } from "@/types/schemas";

type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  plans: string[];
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "featureFlags"), (snap) => {
      const validated = snap.docs.reduce<FeatureFlag[]>((acc, d) => {
        const result = FeatureFlagSchema.safeParse(d.data());
        if (result.success) {
          acc.push({ id: d.id, ...result.data });
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

  function isEnabled(key: string, userPlan?: string): boolean {
    const flag = flags.find((f) => f.key === key);
    if (!flag || !flag.enabled) return false;
    if (flag.plans.length === 0) return true;
    return userPlan ? flag.plans.includes(userPlan) : false;
  }

  return { flags, loading, isEnabled };
}
