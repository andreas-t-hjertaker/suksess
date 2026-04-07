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
import { useStudentInsight } from "@/hooks/use-student-insight";
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
  Loader2,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { StudentInsightView } from "@/components/student-insight-view";
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
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { insight, loading: insightLoading, error: insightError, loadInsight: loadStudentInsight, reset: resetInsight } = useStudentInsight(user?.uid);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError("Kunne ikke laste koblede elever. Prøv igjen senere.");
    } finally {
      setLoading(false);
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
      resetInsight();
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
    return (
      <div className="flex min-h-[300px] items-center justify-center" role="status" aria-label="Laster foresatt-portal">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState
          message={loadError}
          onRetry={() => loadLinkedStudents()}
        />
      </div>
    );
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
                  id={`tab-${s.uid}`}
                  onClick={() => handleSelectStudent(s.uid)}
                  role="tab"
                  aria-selected={selectedStudent === s.uid}
                  aria-controls="student-tabpanel"
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
            <div
              id="student-tabpanel"
              role="tabpanel"
              aria-labelledby={`tab-${selectedStudent}`}
              className="space-y-4"
              aria-live="polite"
            >
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
              ) : insightError ? (
                <ErrorState
                  message={insightError}
                  onRetry={() => selectedStudent && loadStudentInsight(selectedStudent)}
                />
              ) : insight ? (
                <>
                  <StudentInsightView insight={insight} />

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
