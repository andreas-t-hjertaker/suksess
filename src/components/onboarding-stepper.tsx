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
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Lokal lagring av delvis utfylte tester
// ---------------------------------------------------------------------------

const STORAGE_KEY = "suksess-onboarding-progress";

type SavedProgress = {
  step: number;
  bigFiveBlock: number;
  riasecBlock: number;
  bigFiveAnswers: RawAnswers;
  riasecAnswers: RawAnswers;
  strengthAnswers: RawAnswers;
  displayName: string;
  consentPersonality: boolean;
  consentAnalytics: boolean;
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
  const [direction, setDirection] = useState(1); // 1 = fremover, -1 = bakover
  const [celebration, setCelebration] = useState<string | null>(null);

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

  useEffect(() => {
    if (!firebaseUser) {
      setChecking(false);
      return;
    }
    getDoc(doc(db, "users", firebaseUser.uid)).then((snap) => {
      if (!snap.exists() || !snap.data()?.onboardingComplete) {
        setDisplayName(firebaseUser.displayName || "");
        // Gjenopprett lagret fremdrift
        const saved = loadProgress();
        if (saved) {
          setStep(saved.step);
          setBigFiveBlock(saved.bigFiveBlock);
          setRiasecBlock(saved.riasecBlock);
          setBigFiveAnswers(saved.bigFiveAnswers);
          setRiasecAnswers(saved.riasecAnswers);
          setStrengthAnswers(saved.strengthAnswers);
          if (saved.displayName) setDisplayName(saved.displayName);
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
      bigFiveBlock,
      riasecBlock,
      bigFiveAnswers,
      riasecAnswers,
      strengthAnswers,
      displayName,
      consentPersonality,
      consentAnalytics,
    });
  }, [show, step, bigFiveBlock, riasecBlock, bigFiveAnswers, riasecAnswers, strengthAnswers, displayName, consentPersonality, consentAnalytics]);

  // Micro-celebration ved dimensjon-fullføring
  function showCelebration(message: string) {
    setCelebration(message);
    setTimeout(() => setCelebration(null), 2000);
  }

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

      clearProgress();
      setShow(false);
    } finally {
      setSaving(false);
    }
  }, [firebaseUser, displayName, bigFiveAnswers, riasecAnswers, strengthAnswers, consentAnalytics]);

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
    setDirection(1);
    const current = STEPS[step].id;

    if (current === "bigfive" && bigFiveBlock < BIG_FIVE_BLOCKS.length - 1) {
      setBigFiveBlock((b) => b + 1);
      showCelebration(`${BIG_FIVE_TITLES[bigFiveBlock]} fullført! ✓`);
      return;
    }
    if (current === "riasec" && riasecBlock < 5) {
      setRiasecBlock((b) => b + 1);
      return;
    }

    // Celebration ved overgang til nytt steg
    if (current === "bigfive") {
      setBigFiveBlock(0);
      showCelebration("Personlighetstest fullført! 🎉");
    }
    if (current === "riasec") {
      setRiasecBlock(0);
      showCelebration("Interessetest fullført! 🎉");
    }
    if (current === "strengths") {
      showCelebration("Styrketest fullført! 🎉");
    }

    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function handlePrev() {
    setDirection(-1);
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
  const totalAnswered = Object.keys(bigFiveAnswers).length + Object.keys(riasecAnswers).length + Object.keys(strengthAnswers).length;
  const totalQuestions = 40 + 30 + 14; // Big Five + RIASEC + Styrker
  const overallProgress = Math.round(
    ((step + (currentStepId === "bigfive" ? bigFiveBlock / 5 : 0) +
      (currentStepId === "riasec" ? riasecBlock / 6 : 0)) /
      (TOTAL_STEPS - 1)) * 100
  );
  const remainingQuestions = totalQuestions - totalAnswered;
  const estimatedMinutes = Math.max(1, Math.ceil(remainingQuestions * 0.15));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding — steg ${step + 1} av ${TOTAL_STEPS}: ${STEPS[step].label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-xl shadow-2xl">
        {/* Fremdriftslinje øverst */}
        <Progress
          value={overallProgress}
          className="h-1 rounded-none rounded-t-xl"
          aria-label={`Onboarding ${overallProgress}% fullført`}
        />
        {/* Steg-indikatorer */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
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

        <CardContent className="px-6 pb-4 pt-2 min-h-[340px] relative overflow-hidden">

          {/* Micro-celebration overlay */}
          <AnimatePresence>
            {celebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm"
              >
                <div className="text-center space-y-2">
                  <Trophy className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                  <p className="text-lg font-semibold" role="status">{celebration}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentStepId}-${bigFiveBlock}-${riasecBlock}`}
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
                Vi hjelper deg med å finne den studieveien og karrieren som passer deg best.
                Svar på noen spørsmål om deg selv — det tar ca. 10–15 minutter.
              </p>
              <p className="text-xs text-muted-foreground">
                Du kan når som helst lukke og gjenoppta der du slapp.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <Brain className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="font-medium">Personlighetstest</p>
                  <p className="text-xs text-muted-foreground">Big Five (OCEAN)</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <Compass className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="font-medium">Interessetest</p>
                  <p className="text-xs text-muted-foreground">RIASEC / Holland</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <Star className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="font-medium">Styrker</p>
                  <p className="text-xs text-muted-foreground">VIA-inspirert</p>
                </div>
              </div>
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

          </motion.div>
          </AnimatePresence>
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
            {(currentStepId === "bigfive" || currentStepId === "riasec" || currentStepId === "strengths") && remainingQuestions > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">~{estimatedMinutes} min igjen</span>
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
