"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { parseDocsWithId } from "@/lib/firebase/parse-doc";
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
      setFlags(parseDocsWithId(snap.docs, FeatureFlagSchema) as FeatureFlag[]);
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
