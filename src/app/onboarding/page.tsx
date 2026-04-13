"use client";

/**
 * /onboarding — Redirigerer innloggede brukere til /dashboard
 * (der OnboardingStepper-modal vises hvis onboarding ikke er fullført).
 * Uinnloggede brukere sendes til /login. (#213)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PageSkeleton } from "@/components/page-skeleton";

export default function OnboardingPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (firebaseUser) {
      router.replace("/dashboard");
    } else {
      router.replace("/login?callbackUrl=%2Fdashboard");
    }
  }, [firebaseUser, loading, router]);

  return <PageSkeleton />;
}
