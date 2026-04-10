"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { updateProfile } from "firebase/auth";
import { uploadFile } from "@/lib/firebase/storage";
import { serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";
import { nowISO, todayISO } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Loader2,
  Rocket,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { StaggerList, StaggerItem } from "@/components/motion";

// ---------------------------------------------------------------------------
// Lokal lagring av delvis utfylte tester
// ---------------------------------------------------------------------------

const STORAGE_KEY = "suksess-onboarding-progress";

type SavedProgress = {
  step: number;
  displayName: string;
  consentPersonality: boolean;
  consentAnalytics: boolean;
  selectedGoal: string | null;
};

function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgress(data: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorer — localStorage kan være fullt
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorer
  }
}

// Steg-overgangsanimasjon
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Steg-definisjon (forenklet: kun intro + samtykke + profil)
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "welcome", label: "Velkommen", icon: Rocket },
  { id: "goals", label: "Mål", icon: Sparkles },
  { id: "consent", label: "Samtykke", icon: ShieldCheck },
  { id: "profile", label: "Profil", icon: Upload },
] as const;

const GOALS = [
  { id: "studieretning", emoji: "🎯", label: "Finne riktig studieretning", desc: "Hvilken linje passer meg?" },
  { id: "yrker", emoji: "🔍", label: "Utforske ulike yrker", desc: "Hva kan jeg jobbe med?" },
  { id: "søknad", emoji: "📝", label: "Forberede studiesøknad", desc: "SO-poeng og frister" },
  { id: "usikker", emoji: "🤷", label: "Jeg er usikker", desc: "Og det er helt OK!" },
];

type StepId = (typeof STEPS)[number]["id"];
const TOTAL_STEPS = STEPS.length;

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export function OnboardingStepper() {
  const { user, firebaseUser } = useAuth();
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  // Mål-setting
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  // GDPR-samtykke
  const [consentPersonality, setConsentPersonality] = useState(false);
  const [consentAnalytics, setConsentAnalytics] = useState(false);

  // Profil-steg
  const [displayName, setDisplayName] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setChecking(false);
      return;
    }
    getDoc(doc(db, "users", firebaseUser.uid)).then((snap) => {
      if (!snap.exists() || !snap.data()?.onboardingComplete) {
        setDisplayName(firebaseUser.displayName || "");
        const saved = loadProgress();
        if (saved) {
          setStep(saved.step);
          if (saved.displayName) setDisplayName(saved.displayName);
          if (saved.selectedGoal) setSelectedGoal(saved.selectedGoal);
          setConsentPersonality(saved.consentPersonality);
          setConsentAnalytics(saved.consentAnalytics);
        }
        setShow(true);
      }
      setChecking(false);
    });
  }, [firebaseUser]);

  // Lagre fremdrift til localStorage ved endringer
  useEffect(() => {
    if (!show) return;
    saveProgress({
      step,
      displayName,
      consentPersonality,
      consentAnalytics,
      selectedGoal,
    });
  }, [show, step, displayName, consentPersonality, consentAnalytics, selectedGoal]);

  // ---------------------------------------------------------------------------
  // Handlinger
  // ---------------------------------------------------------------------------

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setAvatarUploading(true);
    try {
      const { url } = await uploadFile(`avatars/${firebaseUser.uid}`, file);
      await updateProfile(firebaseUser, { photoURL: url });
    } catch {
      // Ignorer — bruker kan fortsette uten bilde
    }
    setAvatarUploading(false);
  }

  const handleComplete = useCallback(async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      // Lagre visningsnavn
      if (displayName && displayName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Marker onboarding ferdig (profil + samtykke)
      await setDoc(
        doc(db, "users", firebaseUser.uid),
        {
          onboardingComplete: true,
          consentPersonality: true,
          consentAnalytics: consentAnalytics,
          consentTimestamp: nowISO(),
          displayName: displayName || firebaseUser.displayName,
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: "student",
          tenantId: null,
          photoURL: firebaseUser.photoURL,
          selectedGoal: selectedGoal,
        },
        { merge: true }
      );

      // Gi XP for fullført onboarding (profil)
      await setDoc(
        doc(db, "users", firebaseUser.uid, "gamification", "xp"),
        {
          totalXp: 50,
          earnedAchievements: ["first_login", "profile_complete"],
          streak: 1,
          lastLoginDate: todayISO(),
          updatedAt: firestoreServerTimestamp(),
        },
        { merge: true }
      );

      clearProgress();
      setShow(false);
    } finally {
      setSaving(false);
    }
  }, [firebaseUser, displayName, consentAnalytics, selectedGoal]);

  async function handleSkip() {
    if (!firebaseUser) return;
    clearProgress();
    await setDoc(
      doc(db, "users", firebaseUser.uid),
      { onboardingComplete: true },
      { merge: true }
    );
    setShow(false);
  }

  // ---------------------------------------------------------------------------
  // Navigasjonslogikk
  // ---------------------------------------------------------------------------

  function canGoNext(): boolean {
    const current = STEPS[step].id;
    if (current === "consent") {
      return consentPersonality;
    }
    return true;
  }

  function handleNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handlePrev() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (checking || !show) return null;

  const currentStepId = STEPS[step].id as StepId;
  const initials = (displayName || user?.email || "?").charAt(0).toUpperCase();
  const overallProgress = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding — steg ${step + 1} av ${TOTAL_STEPS}: ${STEPS[step].label}`}
      aria-live="polite"
      aria-busy={saving}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Fremdriftslinje øverst */}
        <Progress
          value={overallProgress}
          className="h-1 rounded-none rounded-t-xl shrink-0"
          aria-label={`Onboarding ${overallProgress}% fullført`}
        />
        {/* Steg-indikatorer */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isDone && "border-primary/50 bg-primary/10 text-primary",
                    !isActive && !isDone && "border-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <CardContent className="px-6 pb-4 pt-2 min-h-[280px] relative overflow-y-auto flex-1">
          <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepId}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >

          {/* ---- STEG: VELKOMMEN ---- */}
          {currentStepId === "welcome" && (
            <div className="space-y-4 text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              >
                <Sparkles className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
              </motion.div>
              <CardTitle className="text-2xl font-display">Velkommen til Suksess!</CardTitle>
              <p className="text-muted-foreground">
                Vi hjelper deg med å finne studieveien og karrieren som passer deg best.
                Sett opp profilen din raskt — vi blir bedre kjent med deg over tid.
              </p>
              <p className="text-xs text-muted-foreground">
                Bare noen få steg, så er du i gang!
              </p>
            </div>
          )}

          {/* ---- STEG: MÅL-SETTING ---- */}
          {currentStepId === "goals" && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CardTitle className="text-xl font-display">Hva vil du oppnå med Suksess?</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Velg det som passer deg best — vi tilpasser opplevelsen.
                </p>
              </div>
              <StaggerList className="grid grid-cols-2 gap-3">
                {GOALS.map((goal) => (
                  <StaggerItem key={goal.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGoal(goal.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all w-full",
                        "hover:border-primary/50 hover:bg-primary/5",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        selectedGoal === goal.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border"
                      )}
                    >
                      <span className="text-2xl" aria-hidden="true">{goal.emoji}</span>
                      <span className="text-sm font-medium">{goal.label}</span>
                      <span className="text-xs text-muted-foreground">{goal.desc}</span>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          )}

          {/* ---- STEG: SAMTYKKE (GDPR) ---- */}
          {currentStepId === "consent" && (
            <div className="space-y-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">Personvern og samtykke</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Vi behandler dine personopplysninger i henhold til GDPR.
                Du kan se, eksportere og slette all data fra <strong>Mine data</strong>-siden.
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentPersonality}
                    onChange={(e) => setConsentPersonality(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-primary"
                    aria-required="true"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Behandling av personlighetsdata
                      <span className="ml-1.5 text-xs text-destructive font-semibold">Påkrevd</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Jeg samtykker til at Suksess lagrer og bruker mine svar fra
                      personlighets- og interessetestene til å gi personalisert veiledning.
                      Data brukes kun til dette formålet og deles ikke med tredjeparter.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentAnalytics}
                    onChange={(e) => setConsentAnalytics(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Anonymisert bruksanalyse
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">Valgfritt</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hjelp oss forbedre tjenesten ved å dele anonymisert bruksdata
                      (klikk, tid brukt, funksjonspreferanser). Ingen personlig
                      identifiserbar informasjon.
                    </p>
                  </div>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Les vår{" "}
                <a href="/personvern" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                  personvernerklæring
                </a>{" "}
                for mer informasjon. Du kan trekke tilbake samtykke når som helst.
              </p>
            </div>
          )}

          {/* ---- STEG: PROFIL ---- */}
          {currentStepId === "profile" && (
            <div className="space-y-5 py-4">
              <div className="text-center">
                <CardTitle className="text-xl">Sett opp profilen din</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Legg til navn og bilde så vi kan gjenkjenne deg.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={firebaseUser?.photoURL || undefined} alt={displayName} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Last opp bilde
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="onboarding-display-name">Visningsnavn</label>
                <Input
                  id="onboarding-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ditt navn"
                />
              </div>
            </div>
          )}

          </motion.div>
          </AnimatePresence>
        </CardContent>

        {/* Navigasjon */}
        <CardContent className="flex items-center justify-between border-t pt-4 pb-5 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Hopp over
          </Button>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Forrige
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button size="sm" onClick={handleNext} disabled={!canGoNext()}>
                Neste
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Kom i gang!
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
