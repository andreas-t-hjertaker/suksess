"use client";

/**
 * Personlig karrierehandlingsplan — AI-generert (Issue #130)
 *
 * Genererer en skreddersydd handlingsplan basert på:
 * - Personlighetsprofil (Big Five / RIASEC)
 * - Karakterer og studieønske
 * - Valgt karrieresti
 *
 * Planen inneholder konkrete steg med tidsfrister, milepæler og ressurser.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiDisclosure } from "@/components/ai-disclosure";
import {
  Target,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Loader2,
  GraduationCap,
  Briefcase,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type ActionStep = {
  id: string;
  title: string;
  description: string;
  category: "utdanning" | "erfaring" | "nettverk" | "ferdigheter" | "søknad";
  deadline: string;
  completed: boolean;
  resources: string[];
};

type ActionPlan = {
  goalTitle: string;
  goalDescription: string;
  riasecCode: string;
  steps: ActionStep[];
  generatedAt: string;
  lastUpdatedAt: string;
};

const CATEGORY_ICONS: Record<ActionStep["category"], typeof GraduationCap> = {
  utdanning: GraduationCap,
  erfaring: Briefcase,
  nettverk: BookOpen,
  ferdigheter: Target,
  søknad: Calendar,
};

const CATEGORY_COLORS: Record<ActionStep["category"], string> = {
  utdanning: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  erfaring: "text-green-600 bg-green-50 dark:bg-green-950",
  nettverk: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  ferdigheter: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  søknad: "text-red-600 bg-red-50 dark:bg-red-950",
};

// ---------------------------------------------------------------------------
// AI-generert handlingsplan via Firebase AI (Gemini)
// ---------------------------------------------------------------------------

async function generateActionPlanAI(
  profile: UserProfile,
  riasecCode: string
): Promise<ActionPlan> {
  const { generateText } = await import("@/lib/firebase/ai");

  const now = new Date();
  const bigFive = profile.bigFive;
  const riasec = profile.riasec;

  const prompt = `Du er en karriereveileder for norske VGS-elever. Generer en personlig karrierehandlingsplan.

ELEVPROFIL:
- RIASEC-kode: ${riasecCode}
- RIASEC-scorer: R=${riasec.realistic}, I=${riasec.investigative}, A=${riasec.artistic}, S=${riasec.social}, E=${riasec.enterprising}, C=${riasec.conventional}
${bigFive ? `- Big Five: Åpenhet=${bigFive.openness}, Planmessighet=${bigFive.conscientiousness}, Utadvendthet=${bigFive.extraversion}, Medmenneskelighet=${bigFive.agreeableness}, Nevrotisisme=${bigFive.neuroticism}` : ""}
- Dato i dag: ${now.toISOString().slice(0, 10)}

INSTRUKSJONER:
Generer en handlingsplan med 6–8 konkrete steg. Hvert steg skal være personalisert basert på profilen.
Bruk realistiske norske ressurser (utdanning.no, samordnaopptak.no, nav.no, frivillig.no).
Frister skal være YYYY-MM format, 1–6 måneder frem i tid.

Svar KUN i dette JSON-formatet (ingen markdown, bare ren JSON):
{
  "goalTitle": "Kort tittel for karrieremålet",
  "goalDescription": "2–3 setninger som beskriver planen personlig",
  "steps": [
    {
      "id": "step_1",
      "title": "Kort tittel",
      "description": "2–3 setninger med konkret handling",
      "category": "utdanning|erfaring|nettverk|ferdigheter|søknad",
      "deadline": "YYYY-MM",
      "resources": ["Ressurs 1", "Ressurs 2"]
    }
  ]
}`;

  try {
    const response = await generateText(prompt);
    // Rens respons for eventuelle markdown-kodeblokker
    const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      goalTitle: parsed.goalTitle ?? `Karrierevei for ${riasecCode}-profil`,
      goalDescription: parsed.goalDescription ?? "Personlig handlingsplan.",
      riasecCode,
      steps: (parsed.steps ?? []).map((s: Record<string, unknown>, i: number) => ({
        id: s.id ?? `step_${i + 1}`,
        title: String(s.title ?? ""),
        description: String(s.description ?? ""),
        category: ["utdanning", "erfaring", "nettverk", "ferdigheter", "søknad"].includes(String(s.category))
          ? s.category
          : "utdanning",
        deadline: String(s.deadline ?? now.toISOString().slice(0, 7)),
        completed: false,
        resources: Array.isArray(s.resources) ? s.resources.map(String) : [],
      })),
      generatedAt: now.toISOString(),
      lastUpdatedAt: now.toISOString(),
    };
  } catch {
    // Fallback til enkel plan ved AI-feil
    return generateFallbackPlan(riasecCode);
  }
}

/** Fallback-plan hvis AI er utilgjengelig */
function generateFallbackPlan(riasecCode: string): ActionPlan {
  const now = new Date();
  const month = (offset: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 7);
  };

  return {
    goalTitle: `Karrierevei basert på ${riasecCode}-profil`,
    goalDescription:
      "En handlingsplan med konkrete steg for å nå dine karrieremål. " +
      "Planen er basert på din personlighetsprofil.",
    riasecCode,
    steps: [
      {
        id: "step_1",
        title: "Utforsk studieprogram",
        description: "Undersøk 3–5 studieprogram som matcher din RIASEC-profil på utdanning.no.",
        category: "utdanning",
        deadline: month(1),
        completed: false,
        resources: ["utdanning.no — Studievelgeren", "samordnaopptak.no — Poenggrenser"],
      },
      {
        id: "step_2",
        title: "Sett karaktermål",
        description: "Identifiser fag der du kan forbedre karakteren og lag en studieplan.",
        category: "ferdigheter",
        deadline: month(1),
        completed: false,
        resources: ["Suksess karakterkalkulator"],
      },
      {
        id: "step_3",
        title: "Bygg relevant erfaring",
        description: "Søk sommerjobb, frivillig arbeid eller praksisplass innen ditt interesseområde.",
        category: "erfaring",
        deadline: month(3),
        completed: false,
        resources: ["NAV — Ledige stillinger", "Frivillig.no"],
      },
      {
        id: "step_4",
        title: "Utvid nettverket ditt",
        description: "Delta på utdanningsmesser og åpne dager ved universiteter.",
        category: "nettverk",
        deadline: month(4),
        completed: false,
        resources: ["Utdanningsmessa", "Åpen dag ved universiteter"],
      },
      {
        id: "step_5",
        title: "Forbered søknader",
        description: "Skriv motivasjonsbrev og send søknad til Samordna Opptak innen fristen.",
        category: "søknad",
        deadline: month(5),
        completed: false,
        resources: ["Samordna Opptak — Søknadsfrist 15. april", "Suksess Søknads-coach"],
      },
    ],
    generatedAt: now.toISOString(),
    lastUpdatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HandlingsplanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Hent profil
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, setProfile);
    return () => unsub();
  }, [user]);

  // Hent eksisterende plan
  useEffect(() => {
    if (!user) return;
    async function loadPlan() {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid, "actionPlan", "current"));
        if (snap.exists()) {
          setPlan(snap.data() as ActionPlan);
        }
      } catch {
        // Ingen plan ennå
      }
      setLoading(false);
    }
    loadPlan();
  }, [user]);

  async function handleGenerate() {
    if (!user || !profile) return;
    setGenerating(true);

    const riasecCode = getRiasecCode(profile.riasec);
    const newPlan = await generateActionPlanAI(profile, riasecCode);

    try {
      await setDoc(doc(db, "users", user.uid, "actionPlan", "current"), {
        ...newPlan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPlan(newPlan);
    } catch {
      // Feil ved lagring
    }
    setGenerating(false);
  }

  async function toggleStep(stepId: string) {
    if (!user || !plan) return;
    const updated = {
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      ),
      lastUpdatedAt: new Date().toISOString(),
    };
    setPlan(updated);
    try {
      await setDoc(doc(db, "users", user.uid, "actionPlan", "current"), {
        ...updated,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Feil ved oppdatering
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completedCount = plan?.steps.filter((s) => s.completed).length ?? 0;
  const totalCount = plan?.steps.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Min handlingsplan</h1>
        <p className="text-muted-foreground">
          En personlig plan med konkrete steg mot dine karrieremål.
        </p>
      </div>

      <AiDisclosure featureId="career-advisor" compact />

      {!plan ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Lag din handlingsplan</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Basert på din personlighetsprofil og interesser genererer vi en
                skreddersydd handlingsplan med konkrete steg, tidsfrister og ressurser.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !profile}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Genererer plan…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generer handlingsplan
                </>
              )}
            </Button>
            {!profile && (
              <p className="text-xs text-muted-foreground">
                Fullfør personlighetstesten først for å få en tilpasset plan.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Fremgang */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{plan.goalTitle}</CardTitle>
                  <CardDescription>{plan.goalDescription}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {plan.riasecCode}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Fullført ${completedCount} av ${totalCount} steg`}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Steg */}
          <div className="space-y-3">
            {plan.steps.map((step, index) => {
              const CategoryIcon = CATEGORY_ICONS[step.category];
              return (
                <Card
                  key={step.id}
                  className={cn(
                    "transition-opacity",
                    step.completed && "opacity-60"
                  )}
                >
                  <CardContent className="flex gap-4 py-4">
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="mt-0.5 shrink-0"
                      aria-label={step.completed ? `Merk "${step.title}" som ufullført` : `Merk "${step.title}" som fullført`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={cn(
                            "font-medium",
                            step.completed && "line-through"
                          )}
                        >
                          {index + 1}. {step.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs gap-1", CATEGORY_COLORS[step.category])}
                        >
                          <CategoryIcon className="h-3 w-3" />
                          {step.category}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>

                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Frist: {step.deadline}
                        </span>
                      </div>

                      {step.resources.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {step.resources.map((r, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground"
                            >
                              <ArrowRight className="h-3 w-3 shrink-0" />
                              {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Regenerer */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Generer ny plan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
