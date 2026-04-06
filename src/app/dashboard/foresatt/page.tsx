"use client";

/**
 * Foresatt-portal — innsyn for foreldre/foresatte (#106).
 *
 * Gir foresatte begrenset innsyn i elevens fremdrift:
 * - Onboarding-status og personlighetstest-fullføring
 * - Karriereutforsking-aktivitet
 * - XP og achievements (gamification)
 * - Topp RIASEC-kategorier (kun navn, aldri tallverdier)
 * - Siste karrierer utforsket og achievements
 * - GDPR: foresatte ser kun aggregerte/anonymiserte data, aldri AI-samtaler
 *
 * Tilgang via invitasjonslenke fra eleven.
 * For elever under 15 år: foresatte har utvidet innsyn (GDPR mindreårige).
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import {
  Users,
  Shield,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  Target,
  Loader2,
  UserPlus,
  Eye,
  Lock,
  Briefcase,
  Trophy,
  Compass,
  AlertTriangle,
} from "lucide-react";
import type { StudentInsight } from "@/lib/foresatt/insight";
import {
  getTopRiasecCategories,
  calculateOnboardingProgress,
  filterRecentCareers,
  filterRecentAchievements,
} from "@/lib/foresatt/insight";
import { logGuardianAction, buildAuditAction } from "@/lib/foresatt/audit";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type LinkedStudent = {
  uid: string;
  displayName: string;
  email: string | null;
  onboardingComplete: boolean;
  lastLogin: Date | null;
};

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function ParentPortalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [insight, setInsight] = useState<StudentInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Koble elev
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);

  // Samtykketrekking
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    loadLinkedStudents();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLinkedStudents() {
    setLoading(true);
    setLoadError(null);
    try {
      const linksSnap = await getDocs(
        query(
          collection(db, "parentLinks"),
          where("parentUid", "==", user!.uid),
          where("status", "==", "active")
        )
      );

      const students: LinkedStudent[] = [];
      for (const linkDoc of linksSnap.docs) {
        const studentUid = linkDoc.data().studentUid;
        const studentDoc = await getDoc(doc(db, "users", studentUid));
        if (studentDoc.exists()) {
          const data = studentDoc.data();
          students.push({
            uid: studentUid,
            displayName: data.displayName || "Elev",
            email: data.email || null,
            onboardingComplete: data.onboardingComplete || false,
            lastLogin: data.updatedAt?.toDate() || null,
          });
        }
      }

      setLinkedStudents(students);
      if (students.length > 0 && !selectedStudent) {
        setSelectedStudent(students[0].uid);
        await loadStudentInsight(students[0].uid);
      }
    } catch (err) {
      console.error("[ParentPortal]", err);
      setLoadError("Kunne ikke laste koblede elever.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentInsight(studentUid: string) {
    setInsightLoading(true);
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
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
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
      try {
        await logGuardianAction(
          buildAuditAction("insight_viewed", user!.uid, studentUid)
        );
      } catch {
        // Audit-logging feiler ikke brukeropplevelsen
      }
    } catch (err) {
      console.error("[ParentPortal] Insight feil:", err);
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  }

  async function handleLinkStudent() {
    if (!linkCode.trim()) {
      showToast.error("Skriv inn koblingskoden fra eleven");
      return;
    }

    setLinking(true);
    try {
      // Finn invitasjonen
      const inviteSnap = await getDocs(
        query(
          collection(db, "parentInvites"),
          where("code", "==", linkCode.trim().toUpperCase()),
          where("status", "==", "pending")
        )
      );

      if (inviteSnap.empty) {
        showToast.error("Ugyldig eller utløpt koblingskode");
        setLinking(false);
        return;
      }

      const invite = inviteSnap.docs[0];
      const studentUid = invite.data().studentUid;

      // Opprett kobling
      await setDoc(doc(db, "parentLinks", `${user!.uid}_${studentUid}`), {
        parentUid: user!.uid,
        studentUid,
        status: "active",
        linkedAt: serverTimestamp(),
        consentGiven: true,
      });

      // Oppdater invitasjonsstatus
      await updateDoc(invite.ref, { status: "accepted", acceptedAt: serverTimestamp() });

      // Logg i audit
      try {
        await logGuardianAction(
          buildAuditAction("link_created", user!.uid, studentUid)
        );
      } catch {
        // Audit feiler ikke brukeropplevelsen
      }

      showToast.success("Eleven er nå koblet til kontoen din");
      setLinkCode("");
      setShowLinkForm(false);
      await loadLinkedStudents();
    } catch {
      showToast.error("Kobling feilet");
    } finally {
      setLinking(false);
    }
  }

  async function handleWithdrawConsent() {
    if (!selectedStudent || !user?.uid) return;
    setWithdrawing(true);
    try {
      // Oppdater status i parentLinks
      await updateDoc(doc(db, "parentLinks", `${user.uid}_${selectedStudent}`), {
        status: "revoked",
        revokedAt: serverTimestamp(),
      });

      // Logg i audit
      await logGuardianAction(
        buildAuditAction("consent_withdrawn", user.uid, selectedStudent)
      );

      showToast.success("Samtykke trukket tilbake. Koblingen er fjernet.");
      setShowWithdrawConfirm(false);
      setInsight(null);
      setSelectedStudent(null);
      await loadLinkedStudents();
    } catch {
      showToast.error("Kunne ikke trekke samtykke");
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleSelectStudent(uid: string) {
    setSelectedStudent(uid);
    await loadStudentInsight(uid);
  }

  if (loading) {
    return <PageSkeleton variant="grid" cards={3} />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadLinkedStudents} />;
  }

  const student = linkedStudents.find((s) => s.uid === selectedStudent);

  return (
    <main role="main" aria-label="Foresatt-portal" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Foresatt-portal</h1>
          <p className="text-muted-foreground text-sm">
            Følg med på elevens karriereutforsking og fremdrift.
          </p>
        </div>
        <Button
          onClick={() => setShowLinkForm(!showLinkForm)}
          variant="outline"
          className="gap-2"
          aria-label="Koble ny elev"
        >
          <UserPlus className="h-4 w-4" />
          Koble elev
        </Button>
      </div>

      {/* GDPR-info */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm">
            <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Personvern og innsyn</p>
              <p className="text-xs text-muted-foreground">
                Du ser kun overordnet fremdrift og aktivitet. AI-samtaler, detaljerte testresultater
                og personlige refleksjoner er ikke synlige for foresatte. For elever over 15 år
                kreves elevens samtykke for kobling.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Koble elev-skjema */}
      {showLinkForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Koble til elev</CardTitle>
            <CardDescription>
              Eleven genererer en koblingskode fra sine innstillinger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Skriv inn 6-sifret kode"
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-lg tracking-widest max-w-[200px]"
                aria-label="Koblingskode"
              />
              <Button onClick={handleLinkStudent} disabled={linking} aria-label="Koble elev med kode">
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Koble"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {linkedStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            Ingen elever koblet ennå. Be eleven om å generere en koblingskode fra innstillinger.
          </p>
        </div>
      ) : (
        <>
          {/* Elev-velger */}
          {linkedStudents.length > 1 && (
            <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Velg elev">
              {linkedStudents.map((s) => (
                <button
                  key={s.uid}
                  onClick={() => handleSelectStudent(s.uid)}
                  role="tab"
                  aria-selected={selectedStudent === s.uid}
                  aria-label={`Vis ${s.displayName}`}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedStudent === s.uid
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          )}

          {student && (
            <div className="space-y-4" aria-live="polite">
              {/* Elev-info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {student.displayName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{student.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          Sist aktiv: {insight?.lastActiveAt
                            ? insight.lastActiveAt.toLocaleDateString("nb-NO")
                            : student.lastLogin
                              ? student.lastLogin.toLocaleDateString("nb-NO")
                              : "Ukjent"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={student.onboardingComplete ? "default" : "outline"}>
                      {student.onboardingComplete ? "Onboarding fullført" : "I gang"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Innsikt */}
              {insightLoading ? (
                <div className="flex justify-center py-8" role="status" aria-label="Laster innsiktsdata">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : insight ? (
                <>
                  {/* Statistikk-kort */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-2xl font-bold">{insight.xpTotal}</p>
                        <p className="text-xs text-muted-foreground">XP opptjent</p>
                        {insight.weeklyXpChange > 0 && (
                          <p className="text-xs text-green-600 mt-1">+{insight.weeklyXpChange} denne uken</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-2xl font-bold">{insight.streak}</p>
                        <p className="text-xs text-muted-foreground">Dagers streak</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-2xl font-bold">{insight.careersExplored}</p>
                        <p className="text-xs text-muted-foreground">Karrierer utforsket</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-6 w-6 text-purple-500 mx-auto mb-2" aria-hidden="true" />
                        <p className="text-2xl font-bold">{insight.achievementCount}</p>
                        <p className="text-xs text-muted-foreground">Achievements</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* RIASEC-kategorier */}
                  {insight.topRiasecCategories.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Compass className="h-4 w-4" aria-hidden="true" />
                          Interesseprofil
                        </CardTitle>
                        <CardDescription>
                          Topp 3 interessekategorier basert på personlighetstest
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {insight.topRiasecCategories.map((category) => (
                            <Badge key={category} variant="secondary" className="text-sm px-3 py-1">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Siste karrierer utforsket */}
                  {insight.recentCareers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Briefcase className="h-4 w-4" aria-hidden="true" />
                          Siste karrierer utforsket
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {insight.recentCareers.map((career) => (
                            <Badge key={career} variant="outline" className="text-sm">
                              {career}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Siste achievements */}
                  {insight.recentAchievements.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Trophy className="h-4 w-4" aria-hidden="true" />
                          Siste achievements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {insight.recentAchievements.map((achievement) => (
                            <Badge key={achievement} variant="secondary" className="text-sm">
                              {achievement}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fremdrift */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Fremdrift
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Onboarding</span>
                          <span>{insight.onboardingStepsCompleted}/{insight.totalOnboardingSteps}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={insight.onboardingStepsCompleted} aria-valuemin={0} aria-valuemax={insight.totalOnboardingSteps} aria-label="Onboarding-fremdrift">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(insight.onboardingStepsCompleted / insight.totalOnboardingSteps) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm">
                          {insight.personalityTestComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span>Personlighetstest</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {insight.careersExplored > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span>Karriereutforsking</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skjermet innhold */}
                  <Card className="border-muted">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>
                          AI-samtaler, detaljerte personlighetsresultater og søknadsnotater
                          er skjermet og ikke synlige for foresatte.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Samtykketrekking */}
                  <Card className="border-destructive/20">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Trekk samtykke
                      </CardTitle>
                      <CardDescription>
                        Fjerner koblingen og all tilgang til elevens data.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {showWithdrawConfirm ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Er du sikker? Du mister all tilgang til {student.displayName}s fremdriftsdata.
                            Eleven må generere en ny koblingskode for å koble deg igjen.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleWithdrawConsent}
                              disabled={withdrawing}
                              aria-label="Bekreft trekk samtykke"
                            >
                              {withdrawing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Ja, trekk samtykke
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowWithdrawConfirm(false)}
                              aria-label="Avbryt trekk samtykke"
                            >
                              Avbryt
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowWithdrawConfirm(true)}
                          className="text-destructive border-destructive/30 hover:bg-destructive/5"
                          aria-label="Trekk samtykke for denne eleven"
                        >
                          Trekk samtykke tilbake
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </main>
  );
}
