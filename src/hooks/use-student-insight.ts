import { useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { StudentInsight } from "@/lib/foresatt/insight";
import {
  getTopRiasecCategories,
  calculateOnboardingProgress,
  filterRecentCareers,
  filterRecentAchievements,
} from "@/lib/foresatt/insight";
import { logGuardianAction, buildAuditAction } from "@/lib/foresatt/audit";

export function useStudentInsight(parentUid: string | undefined) {
  const [insight, setInsight] = useState<StudentInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsight = useCallback(
    async (studentUid: string) => {
      setLoading(true);
      setError(null);
      try {
        // Hent XP
        const xpDoc = await getDoc(doc(db, `users/${studentUid}/gamification/xp`));
        const xpData = xpDoc.data();

        // Hent personlighetsprofil (inkl. RIASEC)
        const profileDoc = await getDoc(doc(db, `profiles/${studentUid}`));
        const profileData = profileDoc.data();

        // Hent karriereutforsking (siste 10 for filtrering)
        const activitySnap = await getDocs(
          query(
            collection(db, `users/${studentUid}/activity`),
            where("type", "==", "career_explored"),
            orderBy("timestamp", "desc"),
            limit(10)
          )
        );

        // Hent achievements
        const achievementSnap = await getDocs(
          query(
            collection(db, `users/${studentUid}/gamification/xp/achievements`),
            orderBy("earnedAt", "desc"),
            limit(5)
          )
        );

        // Beregn onboarding-fremdrift
        const hasAiChat = (xpData?.aiChatsCount || 0) > 0;
        const progress = calculateOnboardingProgress({
          hasProfile: profileDoc.exists(),
          hasGrades: !!profileData?.gradesAdded,
          hasCareerExplored: activitySnap.size > 0,
          hasAiChat,
          onboardingComplete: profileData?.onboardingComplete || false,
        });

        // RIASEC — kun kategorinavn, aldri tallverdier (GDPR)
        const topRiasec = getTopRiasecCategories(profileData?.riasec || null);

        // Karrierer utforsket — kun titler, maks 5
        const careerTitles = activitySnap.docs.map((d) => d.data().careerTitle || "Ukjent");
        const recentCareers = filterRecentCareers(careerTitles);

        // Achievements — kun titler, maks 3, nyeste først
        const achievements = achievementSnap.docs.map((d) => ({
          title: d.data().title || "Ukjent",
          earnedAt: d.data().earnedAt?.toDate(),
        }));
        const recentAchievements = filterRecentAchievements(achievements);

        // Ukentlig XP-endring
        const weeklyXpChange = xpData?.weeklyXp || 0;

        setInsight({
          xpTotal: xpData?.totalXp || 0,
          achievementCount: xpData?.earnedAchievements?.length || 0,
          streak: xpData?.streak || 0,
          personalityTestComplete: profileDoc.exists(),
          careersExplored: activitySnap.size,
          onboardingStepsCompleted: progress.completed,
          totalOnboardingSteps: progress.total,
          topRiasecCategories: topRiasec,
          recentCareers,
          lastActiveAt: xpData?.lastActiveAt?.toDate() || null,
          weeklyXpChange,
          recentAchievements,
        });

        // Logg innsyn i audit
        if (parentUid) {
          try {
            await logGuardianAction(
              buildAuditAction("insight_viewed", parentUid, studentUid)
            );
          } catch {
            // Audit-logging feiler ikke brukeropplevelsen
          }
        }
      } catch (err) {
        console.error("[ParentPortal] Insight feil:", err);
        setInsight(null);
        setError("Kunne ikke laste innsiktsdata for eleven. Prøv igjen.");
      } finally {
        setLoading(false);
      }
    },
    [parentUid]
  );

  const reset = useCallback(() => {
    setInsight(null);
    setError(null);
  }, []);

  return { insight, loading, error, loadInsight, reset };
}
