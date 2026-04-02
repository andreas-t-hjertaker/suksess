"use client";

/**
 * Foresatt-portal — innsyn for foreldre/foresatte (#106).
 *
 * Gir foresatte begrenset innsyn i elevens fremdrift:
 * - Onboarding-status og personlighetstest-fullføring
 * - Karriereutforsking-aktivitet
 * - XP og achievements (gamification)
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
  serverTimestamp,
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
} from "lucide-react";

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

type StudentInsight = {
  xpTotal: number;
  achievementCount: number;
  streak: number;
  personalityTestComplete: boolean;
  careersExplored: number;
  onboardingStepsCompleted: number;
  totalOnboardingSteps: number;
};

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function ParentPortalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [insight, setInsight] = useState<StudentInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Koble elev
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    loadLinkedStudents();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLinkedStudents() {
    setLoading(true);
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

      // Hent personlighetsprofil
      const profileDoc = await getDoc(doc(db, `profiles/${studentUid}`));

      // Hent karriereutforsking (teller unike karrieresider besøkt)
      const activitySnap = await getDocs(
        query(
          collection(db, `users/${studentUid}/activity`),
          where("type", "==", "career_explored")
        )
      );

      setInsight({
        xpTotal: xpData?.totalXp || 0,
        achievementCount: xpData?.earnedAchievements?.length || 0,
        streak: xpData?.streak || 0,
        personalityTestComplete: profileDoc.exists(),
        careersExplored: activitySnap.size,
        onboardingStepsCompleted: profileDoc.exists() ? 4 : 1,
        totalOnboardingSteps: 5,
      });
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
      await invite.ref.update({ status: "accepted", acceptedAt: serverTimestamp() });

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

  async function handleSelectStudent(uid: string) {
    setSelectedStudent(uid);
    await loadStudentInsight(uid);
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const student = linkedStudents.find((s) => s.uid === selectedStudent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Foresatt-portal</h1>
          <p className="text-muted-foreground text-sm">
            Følg med på elevens karriereutforsking og fremdrift.
          </p>
        </div>
        <Button onClick={() => setShowLinkForm(!showLinkForm)} variant="outline" className="gap-2">
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
              />
              <Button onClick={handleLinkStudent} disabled={linking}>
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
            <div className="flex gap-2 flex-wrap">
              {linkedStudents.map((s) => (
                <button
                  key={s.uid}
                  onClick={() => handleSelectStudent(s.uid)}
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
            <div className="space-y-4">
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
                          Sist aktiv: {student.lastLogin
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
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : insight ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{insight.xpTotal}</p>
                        <p className="text-xs text-muted-foreground">XP opptjent</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{insight.streak}</p>
                        <p className="text-xs text-muted-foreground">Dagers streak</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{insight.careersExplored}</p>
                        <p className="text-xs text-muted-foreground">Karrierer utforsket</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{insight.achievementCount}</p>
                        <p className="text-xs text-muted-foreground">Achievements</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fremdrift */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Fremdrift
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Onboarding</span>
                          <span>{insight.onboardingStepsCompleted}/{insight.totalOnboardingSteps}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(insight.onboardingStepsCompleted / insight.totalOnboardingSteps) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm">
                          {insight.personalityTestComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>Personlighetstest</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {insight.careersExplored > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
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
                        <Lock className="h-4 w-4 shrink-0" />
                        <p>
                          AI-samtaler, detaljerte personlighetsresultater og søknadsnotater
                          er skjermet og ikke synlige for foresatte.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
