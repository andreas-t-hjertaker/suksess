"use client";

/**
 * FeatureFlag — deklarativ wrapper for tenant-basert feature flagging (#136)
 *
 * Bruk:
 *   <FeatureFlag flag="new_dashboard">
 *     <NyttDashboard />
 *   </FeatureFlag>
 *
 *   <FeatureFlag flag="premium_analytics" fallback={<UpgradePrompt />}>
 *     <AdvancedAnalytics />
 *   </FeatureFlag>
 */

import { type ReactNode } from "react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAuth } from "@/hooks/use-auth";

interface FeatureFlagProps {
  /** Feature flag-nøkkel (må matche key i Firestore featureFlags-samling) */
  flag: string;
  /** Innhold som vises når flagget er aktivt */
  children: ReactNode;
  /** Innhold som vises når flagget er inaktivt (valgfritt) */
  fallback?: ReactNode;
}

export function FeatureFlag({ flag, children, fallback = null }: FeatureFlagProps) {
  const { isEnabled, loading } = useFeatureFlags();
  const { user } = useAuth();

  // Ikke vis noe mens flagg lastes
  if (loading) return null;

  const enabled = isEnabled(flag, {
    userId: user?.uid,
    tenantId: (user as Record<string, unknown>)?.tenantId as string | undefined,
  });

  return <>{enabled ? children : fallback}</>;
}
