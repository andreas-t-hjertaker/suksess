"use client";

/**
 * BadgeToast — viser toast-notifikasjon ved nye achievements.
 * Lytter på useXp og sammenligner med forrige state.
 * Issue #68
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useXp } from "@/hooks/use-xp";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/gamification/xp";

export function BadgeToastListener() {
  const { earnedAchievements } = useXp();
  const prevRef = useRef<AchievementId[]>([]);

  useEffect(() => {
    if (prevRef.current.length === 0 && earnedAchievements.length > 0) {
      // Første lasting — ikke vis toast for eksisterende achievements
      prevRef.current = [...earnedAchievements];
      return;
    }

    // Finn nye achievements
    const newBadges = earnedAchievements.filter(
      (id) => !prevRef.current.includes(id)
    );

    for (const id of newBadges) {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement) continue;

      toast(
        `${achievement.icon} ${achievement.title}`,
        {
          description: `${achievement.description}${achievement.xpReward > 0 ? ` (+${achievement.xpReward} XP)` : ""}`,
          duration: 5000,
        }
      );
    }

    prevRef.current = [...earnedAchievements];
  }, [earnedAchievements]);

  return null;
}
