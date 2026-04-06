"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { UserSubscriptionSchema } from "@/types/schemas";
import type { UserSubscription } from "@/types";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setError(null);

    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snap) => {
        if (snap.exists()) {
          const result = UserSubscriptionSchema.safeParse(snap.data());
          if (result.success) {
            const data = snap.data();
            setSubscription({
              ...result.data,
              currentPeriodEnd: data.currentPeriodEnd?.toDate() ?? null,
            } as UserSubscription);
          } else {
            console.warn(`[useSubscription] Valideringsfeil:`, result.error);
            setSubscription(null);
          }
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useSubscription] Feil:", err);
        setError("Kunne ikke laste abonnement.");
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid, retryCount]);

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";

  function retry() {
    setLoading(true);
    setRetryCount((c) => c + 1);
  }

  return { subscription, loading, error, isActive, isPastDue, retry };
}
