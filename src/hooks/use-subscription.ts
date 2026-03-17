"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { UserSubscription } from "@/types";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSubscription({
            ...data,
            currentPeriodEnd: data.currentPeriodEnd?.toDate() ?? null,
          } as UserSubscription);
        } else {
          setSubscription(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [user?.uid]);

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";

  return { subscription, loading, isActive, isPastDue };
}
