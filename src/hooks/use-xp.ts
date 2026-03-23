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
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type XpDoc = {
  totalXp: number;
  earnedAchievements: AchievementId[];
  streak: number;
  streakShieldUsedAt: string | null;  // ISO-uke (yyyy-Www) når skjold sist ble brukt
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
          setXpDoc(snap.data() as XpDoc);
        } else {
          setXpDoc({ totalXp: 0, earnedAchievements: [], streak: 0, streakShieldUsedAt: null, lastLoginDate: null, updatedAt: null });
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
      await setDoc(ref, { totalXp: increment(amount), updatedAt: serverTimestamp() }, { merge: true });
    },
    [firebaseUser]
  );

  /** Lås opp en achievement — viser badge-toast */
  const unlockAchievement = useCallback(
    async (id: AchievementId) => {
      if (!firebaseUser) return;
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement) return;

      const ref = doc(db, "users", firebaseUser.uid, "gamification", "xp");
      const current = (await getDoc(ref)).data() as XpDoc | undefined;
      const already = current?.earnedAchievements ?? [];
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

      // Badge-toast (Issue #68)
      toast.success(`${achievement.icon} ${achievement.title}`, {
        description: achievement.description + (achievement.xpReward > 0 ? ` +${achievement.xpReward} XP` : ""),
        duration: 4000,
      });
    },
    [firebaseUser]
  );

  /** Registrer daglig innlogging og streak */
  const recordDailyLogin = useCallback(async () => {
    if (!firebaseUser) return;
    const today = new Date().toISOString().split("T")[0];
    const ref = doc(db, "users", firebaseUser.uid, "gamification", "xp");
    const snap = await getDoc(ref);
    const data = snap.data() as XpDoc | undefined;

    if (data?.lastLoginDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let newStreak: number;

    if (data?.lastLoginDate === yesterday) {
      newStreak = (data.streak ?? 0) + 1;
    } else if (data?.lastLoginDate) {
      // Sjekk om streak-skjold kan redde (brukt én gang per uke)
      const currentWeek = getIsoWeek(new Date());
      const shieldUsed = data.streakShieldUsedAt;
      if (!shieldUsed || shieldUsed !== currentWeek) {
        // Frys én gang — behold streak
        newStreak = data.streak ?? 1;
        await setDoc(ref, { streakShieldUsedAt: currentWeek }, { merge: true });
        toast.info("🛡️ Streak-skjold aktivert!", {
          description: "Du mistet én dag, men skjoldet ditt reddet streaken din for denne uken.",
          duration: 5000,
        });
      } else {
        newStreak = 1; // Streak brutt
      }
    } else {
      newStreak = 1;
    }

    await setDoc(
      ref,
      { totalXp: increment(XP_VALUES.daily_login), lastLoginDate: today, streak: newStreak, updatedAt: serverTimestamp() },
      { merge: true }
    );

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
    streakShieldUsedAt: xpDoc?.streakShieldUsedAt ?? null,
    earnedAchievements: xpDoc?.earnedAchievements ?? [],
    isUnlocked: (feature: string) => isFeatureUnlocked(feature, totalXp),
    earnXp,
    unlockAchievement,
    recordDailyLogin,
  };
}

// ---------------------------------------------------------------------------
// Hjelper: ISO-uke-streng (yyyy-Www) for streak-skjold
// ---------------------------------------------------------------------------

function getIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
