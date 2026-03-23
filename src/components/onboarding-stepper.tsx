"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { updateProfile } from "firebase/auth";
import { uploadFile } from "@/lib/firebase/storage";
import { saveUserProfile, saveTestResult } from "@/lib/firebase/profiles";
import { serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RadarChart } from "@/components/radar-chart";
import {
  BIG_FIVE_QUESTIONS,
  RIASEC_QUESTIONS,
  STRENGTH_QUESTIONS,
} from "@/lib/personality/questions";
import {
  scoreBigFive,
  scoreRiasec,
  scoreStrengths,
  getTopStrengths,
  getRiasecCode,
  type RawAnswers,
} from "@/lib/personality/scoring";
import {
  Upload,
  Loader2,
  Rocket,
  Brain,
  Compass,
  Star,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// XP per steg (gamification)
// ---------------------------------------------------------------------------
const STEP_XP: Record<string, number> = {
  welcome: 0,
  consent: 5,
  profile: 15,
  bigfive: 30,
  riasec: 30,
  strengths: 20,
  results: 10,
};

// ---------------------------------------------------------------------------
// Mini-konfetti-komponent (CSS-animasjon, ingen eksternt lib)
// ---------------------------------------------------------------------------
function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => i);
  const colors = ["bg-primary", "bg-violet-400", "bg-pink-400", "bg-amber-400", "bg-green-400", "bg-blue-400"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
      {pieces.map((i) => (
        <div
          key={i}
          className={cn(
            "absolute h-2 w-1.5 rounded-sm opacity-0",
            colors[i % colors.length],
          )}
          style={{
            left: `${8 + (i * 5.2) % 84}%`,
            top: "-8px",
            animation: `confetti-fall ${0.7 + (i % 5) * 0.2}s ease-out ${(i % 4) * 0.1}s forwards`,
            transform: `rotate(${i * 23}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(280px) rotate(540deg); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XP-toast — vises ved steg-fullføring
// ---------------------------------------------------------------------------
function XpToast({ xp, show }: { xp: number; show: boolean }) {
  if (!show || xp === 0) return null;
  return (
    <div
      className={cn(
        "absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-lg z-10",
        "animate-in slide-in-from-top-2 duration-300"
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <Zap className="h-3.5 w-3.5" />
      +{xp} XP
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steg-definisjon
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "welcome", label: "Velkommen", icon: Rocket },
  { id: "consent", label: "Samtykke", icon: ShieldCheck },
  { id: "profile", label: "Profil", icon: Upload },
  { id: "bigfive", label: "Personlighet", icon: Brain },
  { id: "riasec", label: "Interesser", icon: Compass },
  { id: "strengths", label: "Styrker", icon: Star },
  { id: "results", label: "Resultater", icon: Check },
] as const;

type StepId = (typeof STEPS)[number]["id"];
const TOTAL_STEPS = STEPS.length;

// Likert-skala
const LIKERT = [
  { value: 1, label: "Stemmer ikke" },
  { value: 2, label: "Stemmer lite" },
  { value: 3, label: "Nøytral" },
  { value: 4, label: "Stemmer godt" },
  { value: 5, label: "Stemmer svært godt" },
];

// Big Five-spørsmål i blokker av 8 (ett steg per dimensjon)
const BIG_FIVE_BLOCKS = [
  BIG_FIVE_QUESTIONS.slice(0, 8),   // openness
  BIG_FIVE_QUESTIONS.slice(8, 16),  // conscientiousness
  BIG_FIVE_QUESTIONS.slice(16, 24), // extraversion
  BIG_FIVE_QUESTIONS.slice(24, 32), // agreeableness
  BIG_FIVE_QUESTIONS.slice(32, 40), // neuroticism
];

const BIG_FIVE_TITLES = [
  "Åpenhet for opplevelser",
  "Planmessighet",
  "Utadvendthet",
  "Medmenneskelighet",
  "Emosjonell stabilitet",
];

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export function OnboardingStepper() {
  const { user, firebaseUser } = useAuth();
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // GDPR-samtykke
  const [consentPersonality, setConsentPersonality] = useState(false);
  const [consentAnalytics, setConsentAnalytics] = useState(false);

  // Profil-steg
  const [displayName, setDisplayName] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Big Five: sub-blokk (0-4), svar
  const [bigFiveBlock, setBigFiveBlock] = useState(0);
  const [bigFiveAnswers, setBigFiveAnswers] = useState<RawAnswers>({});

  // RIASEC: sub-blokk (0-5), svar
  const [riasecBlock, setRiasecBlock] = useState(0);
  const [riasecAnswers, setRiasecAnswers] = useState<RawAnswers>({});

  // Styrker
  const [strengthAnswers, setStrengthAnswers] = useState<RawAnswers>({});

  // Beregnede resultater
  const [bigFiveScores, setBigFiveScores] = useState<ReturnType<typeof scoreBigFive> | null>(null);
  const [riasecScores, setRiasecScores] = useState<ReturnType<typeof scoreRiasec> | null>(null);

  // Gamification
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [showXpToast, setShowXpToast] = useState(false);
  const [lastXp, setLastXp] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setChecking(false);
      return;
    }
    getDoc(doc(db, "users", firebaseUser.uid)).then((snap) => {
      if (!snap.exists() || !snap.data()?.onboardingComplete) {
        setDisplayName(firebaseUser.displayName || "");
        setShow(true);
      }
      setChecking(false);
    });
  }, [firebaseUser]);

  // Beregn scorer når vi ankommer results-steget
  useEffect(() => {
    if (STEPS[step].id === "results") {
      setBigFiveScores(scoreBigFive(bigFiveAnswers));
      setRiasecScores(scoreRiasec(riasecAnswers));
    }
  }, [step, bigFiveAnswers, riasecAnswers]);

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
      const bf = scoreBigFive(bigFiveAnswers);
      const rs = scoreRiasec(riasecAnswers);
      const st = scoreStrengths(strengthAnswers);
      const topStrengths = getTopStrengths(st);

      // Lagre visningsnavn
      if (displayName && displayName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Lagre profil
      await saveUserProfile(firebaseUser.uid, {
        userId: firebaseUser.uid,
        bigFive: bf,
        riasec: rs,
        strengths: topStrengths,
        interests: [],
        learningStyle: null,
        clusterId: null,
        lastUpdated: null,
      });

      // Lagre testresultater
      await saveTestResult(firebaseUser.uid, {
        userId: firebaseUser.uid,
        testType: "big_five",
        rawAnswers: bigFiveAnswers,
        scores: bf,
        completedAt: null,
      });
      await saveTestResult(firebaseUser.uid, {
        userId: firebaseUser.uid,
        testType: "riasec",
        rawAnswers: riasecAnswers,
        scores: rs,
        completedAt: null,
      });
      await saveTestResult(firebaseUser.uid, {
        userId: firebaseUser.uid,
        testType: "strengths",
        rawAnswers: strengthAnswers,
        scores: st,
        completedAt: null,
      });

      // Marker onboarding ferdig (inkl. GDPR-samtykke)
      await setDoc(
        doc(db, "users", firebaseUser.uid),
        {
          onboardingComplete: true,
          consentPersonality: true,
          consentAnalytics: consentAnalytics,
          consentTimestamp: new Date().toISOString(),
          displayName: displayName || firebaseUser.displayName,
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: "student",
          tenantId: null,
          photoURL: firebaseUser.photoURL,
        },
        { merge: true }
      );

      // Gi XP for fullført onboarding
      await setDoc(
        doc(db, "users", firebaseUser.uid, "gamification", "xp"),
        {
          totalXp: 110, // onboarding(50) + personality_test(30) + riasec_test(30)
          earnedAchievements: ["first_login", "profile_complete", "test_taker"],
          streak: 1,
          lastLoginDate: new Date().toISOString().split("T")[0],
          updatedAt: firestoreServerTimestamp(),
        },
        { merge: true }
      );

      setShow(false);
    } finally {
      setSaving(false);
    }
  }, [firebaseUser, displayName, bigFiveAnswers, riasecAnswers, strengthAnswers, consentAnalytics]);

  async function handleSkip() {
    if (!firebaseUser) return;
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
      return consentPersonality; // personlighetstest-samtykke er påkrevd
    }
    if (current === "bigfive") {
      const block = BIG_FIVE_BLOCKS[bigFiveBlock];
      return block.every((q) => bigFiveAnswers[q.id] !== undefined);
    }
    if (current === "riasec") {
      const block = RIASEC_QUESTIONS.slice(riasecBlock * 5, riasecBlock * 5 + 5);
      return block.every((q) => riasecAnswers[q.id] !== undefined);
    }
    if (current === "strengths") {
      return STRENGTH_QUESTIONS.every((q) => strengthAnswers[q.id] !== undefined);
    }
    return true;
  }

  function handleNext() {
    const current = STEPS[step].id;

    if (current === "bigfive" && bigFiveBlock < BIG_FIVE_BLOCKS.length - 1) {
      setBigFiveBlock((b) => b + 1);
      return;
    }
    if (current === "riasec" && riasecBlock < 5) {
      setRiasecBlock((b) => b + 1);
      return;
    }

    // Tilbakestill sub-blokk ved steg-bytte
    if (current === "bigfive") setBigFiveBlock(0);
    if (current === "riasec") setRiasecBlock(0);

    // XP for fullført steg
    const xp = STEP_XP[current] ?? 0;
    if (xp > 0) {
      setLastXp(xp);
      setTotalXpEarned((prev) => prev + xp);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 2000);
    }

    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handlePrev() {
    const current = STEPS[step].id;
    if (current === "bigfive" && bigFiveBlock > 0) {
      setBigFiveBlock((b) => b - 1);
      return;
    }
    if (current === "riasec" && riasecBlock > 0) {
      setRiasecBlock((b) => b - 1);
      return;
    }
    if (current === "bigfive") setBigFiveBlock(BIG_FIVE_BLOCKS.length - 1);
    if (current === "riasec") setRiasecBlock(5);
    setStep((s) => Math.max(s - 1, 0));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (checking || !show) return null;

  const currentStepId = STEPS[step].id as StepId;
  const initials = (displayName || user?.email || "?").charAt(0).toUpperCase();

  // Fremdrift for spørsmålssteg
  function innerProgress() {
    if (currentStepId === "bigfive") {
      const answered = BIG_FIVE_BLOCKS[bigFiveBlock].filter(
        (q) => bigFiveAnswers[q.id] !== undefined
      ).length;
      return `${answered} / ${BIG_FIVE_BLOCKS[bigFiveBlock].length}`;
    }
    if (currentStepId === "riasec") {
      const block = RIASEC_QUESTIONS.slice(riasecBlock * 5, riasecBlock * 5 + 5);
      const answered = block.filter((q) => riasecAnswers[q.id] !== undefined).length;
      return `${answered} / 5`;
    }
    if (currentStepId === "strengths") {
      const answered = STRENGTH_QUESTIONS.filter(
        (q) => strengthAnswers[q.id] !== undefined
      ).length;
      return `${answered} / ${STRENGTH_QUESTIONS.length}`;
    }
    return null;
  }

  const innerProgressText = innerProgress();

  // Beregn overordnet fremdrift i prosent
  const overallProgress = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding — steg ${step + 1} av ${TOTAL_STEPS}: ${STEPS[step].label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-xl shadow-2xl relative overflow-hidden">
        {/* Konfetti på resultater-steg */}
        {currentStepId === "results" && <Confetti />}
        {/* XP toast */}
        <XpToast xp={lastXp} show={showXpToast} />
        {/* Fremdriftslinje øverst */}
        <Progress
          value={overallProgress}
          className="h-1.5 rounded-none rounded-t-xl"
          aria-label={`Onboarding ${overallProgress}% fullført`}
        />
        {/* Steg-indikatorer + XP-teller */}
        <div className="flex items-start justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                      isActive && "border-primary bg-primary text-primary-foreground scale-110 shadow-sm",
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
          {/* XP-teller */}
          {totalXpEarned > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Zap className="h-3 w-3" />
              {totalXpEarned} XP
            </div>
          )}
        </div>

        <CardContent className="px-6 pb-4 pt-2 min-h-[340px]">

          {/* ---- STEG: VELKOMMEN ---- */}
          {currentStepId === "welcome" && (
            <div className="space-y-4 text-center py-4">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg animate-float">
                <Rocket className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Velkommen til Suksess! 🎉</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Vi hjelper deg finne studieveien som passer deg best — basert på hvem du er.
                  Svar på noen spørsmål (10–15 min) og tjen{" "}
                  <span className="font-semibold text-amber-600">110 XP</span>!
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                {[
                  { icon: Brain, label: "Personlighet", sub: "Big Five · +30 XP", color: "text-violet-500", bg: "bg-violet-500/10" },
                  { icon: Compass, label: "Interesser", sub: "RIASEC · +30 XP", color: "text-blue-500", bg: "bg-blue-500/10" },
                  { icon: Star, label: "Styrker", sub: "VIA · +20 XP", color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(({ icon: Icon, label, sub, color, bg }) => (
                  <div key={label} className={cn("rounded-xl border p-3", bg)}>
                    <Icon className={cn("mx-auto mb-1.5 h-5 w-5", color)} />
                    <p className="font-semibold text-xs">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Data lagres sikkert i EU · GDPR-compliant · Kan slettes når som helst
              </p>
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
                {/* Påkrevd */}
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
                {/* Valgfritt */}
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
                <label className="text-sm font-medium">Visningsnavn</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ditt navn"
                />
              </div>
            </div>
          )}

          {/* ---- STEG: BIG FIVE ---- */}
          {currentStepId === "bigfive" && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Personlighetstest · Dimensjon {bigFiveBlock + 1} av {BIG_FIVE_BLOCKS.length}
                </p>
                <CardTitle className="mt-0.5 text-lg">
                  {BIG_FIVE_TITLES[bigFiveBlock]}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Vurder hvert utsagn fra 1 (stemmer ikke) til 5 (stemmer svært godt).
                </p>
              </div>
              <div className="space-y-3">
                {BIG_FIVE_BLOCKS[bigFiveBlock].map((q) => (
                  <QuestionRow
                    key={q.id}
                    text={q.text}
                    value={bigFiveAnswers[q.id]}
                    onChange={(v) =>
                      setBigFiveAnswers((prev) => ({ ...prev, [q.id]: v }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---- STEG: RIASEC ---- */}
          {currentStepId === "riasec" && (() => {
            const block = RIASEC_QUESTIONS.slice(riasecBlock * 5, riasecBlock * 5 + 5);
            const riasecTitles = [
              "Realistisk — praktisk & teknisk",
              "Undersøkende — analytisk & vitenskapelig",
              "Artistisk — kreativ & ekspressiv",
              "Sosial — hjelpende & pedagogisk",
              "Entrepenørisk — ledende & selgende",
              "Konvensjonell — strukturert & systematisk",
            ];
            return (
              <div className="space-y-4 py-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Interessetest · Gruppe {riasecBlock + 1} av 6
                  </p>
                  <CardTitle className="mt-0.5 text-lg">
                    {riasecTitles[riasecBlock]}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vurder i hvilken grad hvert utsagn passer deg.
                  </p>
                </div>
                <div className="space-y-3">
                  {block.map((q) => (
                    <QuestionRow
                      key={q.id}
                      text={q.text}
                      value={riasecAnswers[q.id]}
                      onChange={(v) =>
                        setRiasecAnswers((prev) => ({ ...prev, [q.id]: v }))
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ---- STEG: STYRKER ---- */}
          {currentStepId === "strengths" && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Styrketест
                </p>
                <CardTitle className="mt-0.5 text-lg">Hva er du god på?</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Vurder utsagnene om dine styrker.
                </p>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {STRENGTH_QUESTIONS.map((q) => (
                  <QuestionRow
                    key={q.id}
                    text={q.text}
                    value={strengthAnswers[q.id]}
                    onChange={(v) =>
                      setStrengthAnswers((prev) => ({ ...prev, [q.id]: v }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ---- STEG: RESULTATER ---- */}
          {currentStepId === "results" && bigFiveScores && riasecScores && (() => {
            const strengthScores = scoreStrengths(strengthAnswers);
            const topStrengths = getTopStrengths(strengthScores);
            const riasecCode = getRiasecCode(riasecScores);

            const bigFiveAxes = [
              { label: "Åpenhet", value: bigFiveScores.openness },
              { label: "Planmessig", value: bigFiveScores.conscientiousness },
              { label: "Utadvendt", value: bigFiveScores.extraversion },
              { label: "Medmennesk.", value: bigFiveScores.agreeableness },
              { label: "Emosj. stab.", value: 100 - bigFiveScores.neuroticism },
            ];

            const riasecAxes = [
              { label: "Realistisk", value: riasecScores.realistic },
              { label: "Undersøkende", value: riasecScores.investigative },
              { label: "Artistisk", value: riasecScores.artistic },
              { label: "Sosial", value: riasecScores.social },
              { label: "Entrepr.", value: riasecScores.enterprising },
              { label: "Konvensjonnell", value: riasecScores.conventional },
            ];

            const STRENGTH_LABELS: Record<string, string> = {
              kreativitet: "Kreativitet",
              nysgjerrighet: "Nysgjerrighet",
              lederskap: "Lederskap",
              empati: "Empati",
              utholdenhet: "Utholdenhet",
              humor: "Humor",
              rettferdighet: "Rettferdighet",
            };

            return (
              <div className="space-y-4 py-2">
                <div className="text-center">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                    <Zap className="h-4 w-4" />
                    +{totalXpEarned + (STEP_XP["results"] ?? 0)} XP opptjent! 🎉
                  </div>
                  <CardTitle className="text-xl">Din personlighetsprofil</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    RIASEC-kode: <span className="font-bold text-primary">{riasecCode}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Big Five</p>
                    <RadarChart axes={bigFiveAxes} size={190} className="mx-auto" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">RIASEC</p>
                    <RadarChart axes={riasecAxes} size={190} className="mx-auto" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Topp-styrker
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topStrengths.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {STRENGTH_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>

        {/* Navigasjon */}
        <CardContent className="flex items-center justify-between border-t pt-4 pb-5">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Hopp over
          </Button>
          <div className="flex items-center gap-3">
            {innerProgressText && (
              <span className="text-xs text-muted-foreground">{innerProgressText}</span>
            )}
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

// ---------------------------------------------------------------------------
// QuestionRow — enkelt Likert-spørsmål
// ---------------------------------------------------------------------------

function QuestionRow({
  text,
  value,
  onChange,
}: {
  text: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5" role="group" aria-label={text}>
      <p className="text-sm" id={undefined}>{text}</p>
      <div className="flex gap-1.5" role="radiogroup" aria-label={`Svar på: ${text}`}>
        {LIKERT.map((l) => (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={value === l.value}
            aria-label={`${l.value} — ${l.label}`}
            onClick={() => onChange(l.value)}
            className={cn(
              "flex h-8 w-8 flex-1 items-center justify-center rounded border text-xs font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              value === l.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {l.value}
          </button>
        ))}
      </div>
    </div>
  );
}
