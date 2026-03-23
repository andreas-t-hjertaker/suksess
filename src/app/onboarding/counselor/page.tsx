"use client";

/**
 * Onboarding for rådgivere (counselors) — Issue #39
 *
 * Steg:
 * 1. Velkommen og rollebekreftelse
 * 2. Skoleinformasjon og DBA-aksept
 * 3. Inviter kollegaer (valgfritt)
 * 4. Ferdig — gå til rådgiverportalen
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  Building2,
  Users,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileCheck,
} from "lucide-react";

const STEPS = [
  { id: "welcome", label: "Velkommen", icon: UserCheck },
  { id: "school", label: "Skole", icon: Building2 },
  { id: "dpa", label: "Dataavtale", icon: FileCheck },
  { id: "invite", label: "Inviter", icon: Users },
  { id: "done", label: "Ferdig", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function CounselorOnboardingPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Steg 2: Skole
  const [schoolName, setSchoolName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [county, setCounty] = useState("");

  // Steg 3: DBA
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [dpaSignerName, setDpaSignerName] = useState("");

  // Steg 4: Inviter
  const [inviteEmails, setInviteEmails] = useState("");

  const currentStepId = STEPS[step].id as StepId;
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  function canGoNext(): boolean {
    if (currentStepId === "school") return schoolName.trim().length > 0;
    if (currentStepId === "dpa") return dpaAccepted && dpaSignerName.trim().length > 0;
    return true;
  }

  async function handleComplete() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const uid = firebaseUser.uid;
      const tenantId = (firebaseUser as { tenantId?: string })?.tenantId ??
        `tenant_${uid.slice(0, 8)}`;

      // Opprett tenant-dokument
      await setDoc(doc(db, "tenants", tenantId), {
        tenantId,
        name: schoolName,
        shortName: schoolName.split(" ")[0],
        orgNumber: orgNumber || null,
        county: county || null,
        subscriptionStatus: "trial",
        subscriptionPlan: "school",
        maxStudents: 500,
        stripeCustomerId: null,
        dpaSignedAt: serverTimestamp(),
        dpaSignedBy: firebaseUser.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Merk bruker som onboardet rådgiver
      await setDoc(doc(db, "users", uid), {
        onboardingCompleted: true,
        onboardingRole: "counselor",
        tenantId,
        role: "counselor",
        displayName: firebaseUser.displayName || dpaSignerName,
        email: firebaseUser.email,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Opprett invitasjoner i Firestore — Cloud Function sender e-post automatisk
      if (inviteEmails.trim()) {
        const emailList = inviteEmails
          .split(/[,\n]/)
          .map((e) => e.trim())
          .filter((e) => e.includes("@"));
        // Generer et enkelt invite-token
        const tokenBase = `${uid}-${Date.now()}`;
        for (const email of emailList) {
          await addDoc(collection(db, "counselorInvites"), {
            inviterName: firebaseUser.displayName || dpaSignerName || "Rådgiver",
            inviterEmail: firebaseUser.email,
            schoolName,
            inviteeEmail: email,
            token: btoa(tokenBase + "-" + email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 32),
            tenantId,
            createdAt: serverTimestamp(),
            accepted: false,
          });
        }
      }

      router.push("/admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Fremdrift */}
        <Progress value={progress} className="h-1 mb-6" aria-label={`Onboarding ${progress}% fullført`} />

        {/* Steg-indikatorer */}
        <div className="flex justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                  i === step && "border-primary bg-primary text-primary-foreground",
                  i < step && "border-primary/40 bg-primary/10 text-primary",
                  i > step && "border-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  i === step ? "text-primary" : "text-muted-foreground"
                )}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm min-h-[340px] flex flex-col">
          <div className="flex-1">

            {/* STEG: VELKOMMEN */}
            {currentStepId === "welcome" && (
              <div className="space-y-4 text-center">
                <UserCheck className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold">Velkommen, rådgiver!</h1>
                <p className="text-muted-foreground">
                  Du er i ferd med å sette opp Suksess for din skole.
                  Det tar 3–4 minutter å fullføre oppsettet.
                </p>
                <ul className="text-left space-y-2 mt-6">
                  {[
                    "Registrer skoleinformasjon",
                    "Inngå databehandleravtale (GDPR art. 28)",
                    "Inviter kollegaer (valgfritt)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* STEG: SKOLE */}
            {currentStepId === "school" && (
              <div className="space-y-5">
                <div>
                  <Building2 className="h-8 w-8 text-primary mb-2" />
                  <h2 className="text-xl font-bold">Skoleinformasjon</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Disse opplysningene brukes i databehandleravtalen.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Skolens navn <span className="text-destructive">*</span></label>
                    <Input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="f.eks. Akershus videregående skole"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Organisasjonsnummer</label>
                    <Input
                      value={orgNumber}
                      onChange={(e) => setOrgNumber(e.target.value)}
                      placeholder="9 siffer"
                      maxLength={9}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fylke</label>
                    <Input
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder="f.eks. Akershus"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEG: DATABEHANDLERAVTALE */}
            {currentStepId === "dpa" && (
              <div className="space-y-5">
                <div>
                  <FileCheck className="h-8 w-8 text-primary mb-2" />
                  <h2 className="text-xl font-bold">Databehandleravtale</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    I henhold til GDPR art. 28 må skolen inngå en
                    databehandleravtale med Suksess AS før behandling
                    av elevdata kan starte.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                  <p>
                    <strong>{schoolName}</strong> (behandlingsansvarlig) inngår
                    herved databehandleravtale med <strong>Suksess AS</strong> (databehandler)
                    i henhold til vilkårene beskrevet på{" "}
                    <a
                      href="/legal/databehandleravtale"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 text-primary"
                    >
                      suksess.no/legal/databehandleravtale
                    </a>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avtalen regulerer lagring av elevdata i Firestore europe-west1 (Belgia),
                    AI-behandling via VertexAI i EØS, og skolens rettigheter til innsyn,
                    retting og sletting av data.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Fullt navn på undertegner <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={dpaSignerName}
                      onChange={(e) => setDpaSignerName(e.target.value)}
                      placeholder="Ditt fulle navn"
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={dpaAccepted}
                      onChange={(e) => setDpaAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-primary"
                      aria-required="true"
                    />
                    <span className="text-sm">
                      Jeg bekrefter at jeg har fullmakt til å inngå avtale på vegne av{" "}
                      <strong>{schoolName || "skolen"}</strong>, og aksepterer
                      databehandleravtalen med Suksess AS.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* STEG: INVITER */}
            {currentStepId === "invite" && (
              <div className="space-y-5">
                <div>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <h2 className="text-xl font-bold">Inviter kollegaer</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Valgfritt: Inviter andre rådgivere ved din skole.
                    Du kan også gjøre dette senere fra admin-panelet.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">E-postadresser (én per linje)</label>
                  <textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder={"rådgiver1@skole.no\nrådgiver2@skole.no"}
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Inviterte brukere må logge inn via Feide for å bekrefte identiteten.
                </p>
              </div>
            )}

            {/* STEG: FERDIG */}
            {currentStepId === "done" && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                <h2 className="text-2xl font-bold">Alt er klart!</h2>
                <p className="text-muted-foreground">
                  <strong>{schoolName}</strong> er nå satt opp i Suksess.
                  Elever kan logge inn via Feide og starte karriereveiledningen.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-medium">Elevinnlogging</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Via Feide på suksess.no</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="font-medium">Rådgiverportal</p>
                    <p className="text-xs text-muted-foreground mt-0.5">suksess.no/admin/elever</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigasjon */}
          <div className="flex items-center justify-between pt-6 border-t mt-6">
            {step > 0 && step < STEPS.length - 1 ? (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Tilbake
              </Button>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canGoNext()}
              >
                Neste
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gå til rådgiverportalen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
