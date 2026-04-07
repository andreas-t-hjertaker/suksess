"use client";

import { useState, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { parseDoc } from "@/lib/firebase/parse-doc";
import { XpDocSchema } from "@/types/schemas";
import { todayISO } from "@/lib/utils/time";
import { useAuth } from "@/hooks/use-auth";
import {
  getLevelForXp,
  getXpProgress,
  isFeatureUnlocked,
  ACHIEVEMENTS,
  type XpEvent,
  XP_VALUES,
  type AchievementId,
} from "@/lib/gamification/xp";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type XpDoc = {
  totalXp: number;
  earnedAchievements: AchievementId[];
  streak: number;
  lastLoginDate: string | null;
  updatedAt: unknown;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useXp() {
  const { firebaseUser } = useAuth();
  const [xpDoc, setXpDoc] = useState<XpDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setXpDoc(null);
      setLoading(false);
      return;
    }

    const unsub: Unsubscribe = onSnapshot(
      doc(db, "users", firebaseUser.uid, "gamification", "xp"),
      (snap) => {
        if (snap.exists()) {
          setXpDoc(parseDoc(snap, XpDocSchema) as XpDoc ?? { totalXp: 0, earnedAchievements: [], streak: 0, lastLoginDate: null, updatedAt: null });
        } else {
          setXpDoc({ totalXp: 0, earnedAchievements: [], streak: 0, lastLoginDate: null, updatedAt: null });
        }
        setLoading(false);
      }
    );

    return () => unsub?.();
  }, [firebaseUser]);

  /** Gi XP for en aktivitet */
  const earnXp = useCallback(
    async (event: XpEvent, multiplier = 1) => {
      if (!firebaseUser) return;
      const amount = XP_VALUES[event] * multiplier;
      const ref = doc(db, "users", firebaseUser.uid, "gamification", "xp");
      await setDoc(
        ref,
        {
          totalXp: increment(amount),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [firebaseUser]
  );

  /** Lås opp en achievement */
  const unlockAchievement = useCallback(
    async (id: AchievementId) => {
      if (!firebaseUser) return;
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement) return;

      const ref = doc(db, "users", firebaseUser.uid, "gamification", "xp");
      const current = parseDoc(await getDoc(ref), XpDocSchema) as XpDoc | undefined;
      const already = current?.earnedAchievements ?? [];

      // Sjekk mot fersk Firestore-data for å unngå duplikater
      if (already.includes(id)) return;

      await setDoc(
        ref,
        {
          earnedAchievements: [...already, id],
          totalXp: increment(achievement.xpReward),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [firebaseUser]
  );

  /** Registrer daglig innlogging og streak */
  const recordDailyLogin = useCallback(async () => {
    if (!firebaseUser) return;
    const today = todayISO();
    const ref = doc(db, "users", firebaseUser.uid, "gamification", "xp");
    const snap = await getDoc(ref);
    const data = parseDoc(snap, XpDocSchema) as XpDoc | undefined;

    if (data?.lastLoginDate === today) return; // Allerede sjekket inn i dag

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = data?.lastLoginDate === yesterday ? (data.streak ?? 0) + 1 : 1;

    await setDoc(
      ref,
      {
        totalXp: increment(XP_VALUES.daily_login),
        lastLoginDate: today,
        streak: newStreak,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Streak achievements
    if (newStreak >= 30) await unlockAchievement("month_streak");
    else if (newStreak >= 7) await unlockAchievement("week_streak");
    else if (newStreak >= 3) await unlockAchievement("streak_starter");
  }, [firebaseUser, unlockAchievement]);

  const totalXp = xpDoc?.totalXp ?? 0;
  const level = getLevelForXp(totalXp);
  const progress = getXpProgress(totalXp);

  return {
    loading,
    totalXp,
    level,
    progress,
    streak: xpDoc?.streak ?? 0,
    earnedAchievements: xpDoc?.earnedAchievements ?? [],
    isUnlocked: (feature: string) => isFeatureUnlocked(feature, totalXp),
    earnXp,
    unlockAchievement,
    recordDailyLogin,
  };
}
