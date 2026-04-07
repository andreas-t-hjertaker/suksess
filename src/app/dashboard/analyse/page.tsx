"use client";

/**
 * Avansert analyse — dypere personlighetsinnsikt:
 * - Big Five dimensjonsfordeling med tolkning
 * - RIASEC-profil med karriereimplikasjoner
 * - Personlighetsprofil-klynge (analytic/creative/social/structured)
 * - Læringssti-anbefaling
 * - Sammenligning av sterkeste og svakeste trekk
 */

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FeatureGate } from "@/components/feature-gate";
import { ErrorState } from "@/components/error-state";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { computePersonalityUI } from "@/lib/personality/engine";
import type { UserProfile, BigFiveScores, RiasecScores } from "@/types/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarChart } from "@/components/radar-chart";
import {
  Brain,
  Compass,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Zap,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Statiske data
// ---------------------------------------------------------------------------

const BIG_FIVE_META: Record<
  keyof BigFiveScores,
  {
    label: string;
    highTitle: string;
    lowTitle: string;
    highDesc: string;
    lowDesc: string;
    midDesc: string;
    color: string;
    implications: string[];
  }
> = {
  openness: {
    label: "Åpenhet for erfaring",
    highTitle: "Kreativ og nysgjerrig",
    lowTitle: "Praktisk og jordnær",
    midDesc: "Balansert mellom kreativitet og praktisk tilnærming",
    highDesc: "Du er nysgjerrig, kreativ og åpen for nye ideer. Du trives med abstrakt tenkning og utforsker gjerne nye konsepter.",
    lowDesc: "Du foretrekker struktur og kjente løsninger. Du er praktisk og foretrekker konkrete resultater fremfor abstrakte teorier.",
    color: "bg-violet-500",
    implications: ["Kunstneriske fag", "Forskning", "Innovasjon", "Filosofi"],
  },
  conscientiousness: {
    label: "Planmessighet",
    highTitle: "Organisert og målrettet",
    lowTitle: "Fleksibel og spontan",
    midDesc: "Moderat strukturert — tilpasser deg situasjonen",
    highDesc: "Du er disiplinert, organisert og pålitelig. Du setter mål og holder deg til planer.",
    lowDesc: "Du er fleksibel og spontan. Du trives bedre med frihet enn strenge rutiner.",
    color: "bg-blue-500",
    implications: ["Medisin", "Juss", "Økonomi", "Prosjektledelse"],
  },
  extraversion: {
    label: "Utadvendthet",
    highTitle: "Utadvendt og energisk",
    lowTitle: "Introvert og refleksiv",
    midDesc: "Ambivert — komfortabel i begge sosiale settinger",
    highDesc: "Du er sosial, pratsam og trives blant folk. Du henter energi fra samvær med andre.",
    lowDesc: "Du er refleksiv og trives godt alene. Du foretrekker dype samtaler fremfor store grupper.",
    color: "bg-amber-500",
    implications: ["Salg", "Undervisning", "Ledelse", "Kommunikasjon"],
  },
  agreeableness: {
    label: "Medmenneskelighet",
    highTitle: "Empatisk og samarbeidsvillig",
    lowTitle: "Direkte og uavhengig",
    midDesc: "Balansert mellom samarbeid og selvhevdelse",
    highDesc: "Du er vennlig, empatisk og samarbeidsvillig. Du verdsetter harmoni og andres velferd.",
    lowDesc: "Du er direkte og uavhengig. Du holder deg til fakta og er ikke redd for å utfordre andres synspunkter.",
    color: "bg-green-500",
    implications: ["Helsefag", "Sosialt arbeid", "HR", "Rådgivning"],
  },
  neuroticism: {
    label: "Emosjonell stabilitet",
    highTitle: "Følsom og reaktiv",
    lowTitle: "Rolig og stabil",
    midDesc: "Moderat emosjonell sensitivitet",
    highDesc: "Du er emosjonelt sensitiv og opplever sterke følelser. Dette kan gi kreativ energi og empati.",
    lowDesc: "Du er rolig, stabil og håndterer stress godt. Du bevarer roen i krevende situasjoner.",
    color: "bg-rose-500",
    implications: ["Kunst", "Psykologi", "Skriving", "Musikk"],
  },
};

const RIASEC_META: Record<
  keyof RiasecScores,
  {
    label: string;
    letter: string;
    color: string;
    desc: string;
    strengths: string[];
    careers: string[];
  }
> = {
  realistic: {
    label: "Realistisk",
    letter: "R",
    color: "bg-slate-500",
    desc: "Liker praktisk arbeid, maskiner og konkrete problemer.",
    strengths: ["Teknisk", "Håndverk", "Natur", "Mekanikk"],
    careers: ["Ingeniør", "Håndverker", "Pilot", "Jordbruker"],
  },
  investigative: {
    label: "Undersøkende",
    letter: "I",
    color: "bg-blue-500",
    desc: "Liker å analysere, forske og løse komplekse problemer.",
    strengths: ["Analytisk", "Vitenskapelig", "Logisk", "Kritisk"],
    careers: ["Forsker", "Lege", "Dataanalytiker", "Økonom"],
  },
  artistic: {
    label: "Artistisk",
    letter: "A",
    color: "bg-violet-500",
    desc: "Liker kreativt arbeid, selvuttrykk og estetikk.",
    strengths: ["Kreativ", "Intuitiv", "Ekspressiv", "Sensitiv"],
    careers: ["Designer", "Forfatter", "Arkitekt", "Skuespiller"],
  },
  social: {
    label: "Sosial",
    letter: "S",
    color: "bg-green-500",
    desc: "Liker å hjelpe, undervise og arbeide med mennesker.",
    strengths: ["Empatisk", "Kommunikativ", "Tålmodig", "Støttende"],
    careers: ["Lærer", "Sykepleier", "Rådgiver", "Sosionom"],
  },
  enterprising: {
    label: "Entreprenant",
    letter: "E",
    color: "bg-amber-500",
    desc: "Liker å lede, overtale og ta risiko for å nå mål.",
    strengths: ["Lederskap", "Overbevisende", "Ambisiøs", "Selvsikker"],
    careers: ["Leder", "Gründer", "Politiker", "Selger"],
  },
  conventional: {
    label: "Konvensjonell",
    letter: "C",
    color: "bg-orange-500",
    desc: "Liker struktur, systemer og veldefinerte oppgaver.",
    strengths: ["Organisert", "Nøyaktig", "Pålitelig", "Detaljorientert"],
    careers: ["Revisor", "Sekretær", "Databankfunksjonær", "Bibliotekar"],
  },
};

type Trend = "high" | "mid" | "low";

function getTrend(score: number): Trend {
  if (score >= 65) return "high";
  if (score <= 35) return "low";
  return "mid";
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "high") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "low") return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AnalysePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    return subscribeToUserProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      (err) => {
        setLoadError(err instanceof Error ? err : new Error("Kunne ikke laste profil"));
        setLoading(false);
      }
    );
  }, [user]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  const personalityUI = useMemo(() => {
    if (!profile?.bigFive || !profile?.riasec) return null;
    return computePersonalityUI(profile.bigFive, profile.riasec);
  }, [profile]);

  const bigFiveAxes = useMemo(() => {
    if (!profile?.bigFive) return [];
    return [
      { label: "Åpenhet", value: profile.bigFive.openness },
      { label: "Planmessig", value: profile.bigFive.conscientiousness },
      { label: "Utadvendt", value: profile.bigFive.extraversion },
      { label: "Medmennesk.", value: profile.bigFive.agreeableness },
      { label: "Stabilitet", value: 100 - profile.bigFive.neuroticism },
    ];
  }, [profile]);

  const riasecAxes = useMemo(() => {
    if (!profile?.riasec) return [];
    return [
      { label: "Realistisk", value: profile.riasec.realistic },
      { label: "Undersøkende", value: profile.riasec.investigative },
      { label: "Artistisk", value: profile.riasec.artistic },
      { label: "Sosial", value: profile.riasec.social },
      { label: "Entreprenant", value: profile.riasec.enterprising },
      { label: "Konvensjonell", value: profile.riasec.conventional },
    ];
  }, [profile]);

  // Topp og bunnscorer
  const bigFiveRanked = useMemo(() => {
    if (!profile?.bigFive) return [];
    const keys = Object.keys(profile.bigFive) as (keyof BigFiveScores)[];
    return [...keys].sort((a, b) => profile.bigFive[b] - profile.bigFive[a]);
  }, [profile]);

  const riasecRanked = useMemo(() => {
    if (!profile?.riasec) return [];
    const keys = Object.keys(profile.riasec) as (keyof RiasecScores)[];
    return [...keys].sort((a, b) => profile.riasec[b] - profile.riasec[a]);
  }, [profile]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6 space-y-3">
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
            </CardContent></Card>
          ))}
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <ErrorState message={loadError.message} onRetry={() => window.location.reload()} />
      </main>
    );
  }

  if (!profile?.bigFive || !profile?.riasec) {
    return (
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h2 className="font-semibold mb-1">Ingen profil funnet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Fullfør onboarding for å se din avanserte analyse.
          </p>
          <Link href="/dashboard" className="text-sm text-primary underline">
            Gå til dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avansert analyse</h1>
        <p className="text-muted-foreground mt-1">
          Dypdykk i din personlighetsprofil — styrker, mønstre og implikasjoner.
        </p>
      </div>

      {/* Personlighetsprofil-klynge */}
      {personalityUI && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Din profil-klynge: {personalityUI.profileName}
            </CardTitle>
            <CardDescription>
              Basert på kombinasjonen av Big Five og RIASEC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {personalityUI.profileName === "Analytisk" &&
                "Du er logisk, metodisk og liker å forstå systemer i dybden. Du trives med komplekse problemer og fakta-baserte beslutninger."}
              {personalityUI.profileName === "Kreativ" &&
                "Du er fantasifull, ekspressiv og ser verden på nye måter. Du trives med frie rammer og kreative utfordringer."}
              {personalityUI.profileName === "Sosial" &&
                "Du er empatisk, kommunikativ og trives med å hjelpe andre. Du bygger sterke relasjoner og liker samarbeid."}
              {personalityUI.profileName === "Strukturert" &&
                "Du er organisert, pålitelig og trives med klare rammer. Du leverer konsekvent og er god til å planlegge."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                RIASEC: {riasecCode}
              </Badge>
              <Badge variant="outline">
                Animasjon: {personalityUI.animationIntensity}
              </Badge>
              <Badge variant="outline">
                Tone: {personalityUI.toneOfVoice}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar-charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-500" />
              Big Five (OCEAN)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RadarChart axes={bigFiveAxes} size={200} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-500" />
              RIASEC-profil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RadarChart axes={riasecAxes} size={200} />
          </CardContent>
        </Card>
      </div>

      {/* Big Five detaljert */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Big Five — detaljert analyse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bigFiveRanked.map((key) => {
            const score = profile.bigFive[key];
            const meta = BIG_FIVE_META[key];
            const trend = getTrend(score);
            const desc =
              trend === "high" ? meta.highDesc
              : trend === "low" ? meta.lowDesc
              : meta.midDesc;
            const title =
              trend === "high" ? meta.highTitle
              : trend === "low" ? meta.lowTitle
              : meta.label;
            return (
              <div key={key} className="rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={trend} />
                    <span className="font-medium text-sm">{title}</span>
                    <span className="text-xs text-muted-foreground">({meta.label})</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      trend === "high" ? "text-green-600 dark:text-green-400"
                      : trend === "low" ? "text-rose-600 dark:text-rose-400"
                      : "text-muted-foreground"
                    )}
                  >
                    {score}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-2">
                  <div
                    className={cn("h-full rounded-full transition-all", meta.color)}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                {trend === "high" && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {meta.implications.map((imp) => (
                      <span key={imp} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {imp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* RIASEC detaljert */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Compass className="h-4 w-4" />
            RIASEC — topp 3 dimensjoner
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {riasecRanked.slice(0, 3).map((key, rank) => {
            const score = profile.riasec[key];
            const meta = RIASEC_META[key];
            return (
              <div key={key} className="rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold shrink-0",
                      meta.color
                    )}
                  >
                    {meta.letter}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">#{rank + 1} · Score {score}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{meta.desc}</p>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Styrker</p>
                  <div className="flex flex-wrap gap-1">
                    {meta.strengths.map((s) => (
                      <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</span>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">Typiske yrker</p>
                  <div className="flex flex-wrap gap-1">
                    {meta.careers.map((c) => (
                      <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Læringsstil */}
      {profile.learningStyle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Din læringsstil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {{
              visual: (
                <div>
                  <p className="font-semibold text-sm mb-1">Visuell learner</p>
                  <p className="text-sm text-muted-foreground">
                    Du lærer best gjennom bilder, diagrammer og visuelle presentasjoner. Bruk tankekart, farger og grafer i studiene.
                  </p>
                </div>
              ),
              auditory: (
                <div>
                  <p className="font-semibold text-sm mb-1">Auditiv learner</p>
                  <p className="text-sm text-muted-foreground">
                    Du lærer best ved å lytte og snakke. Diskusjoner, podcaster og muntlige oppsummeringer fungerer godt for deg.
                  </p>
                </div>
              ),
              kinesthetic: (
                <div>
                  <p className="font-semibold text-sm mb-1">Kinestetisk learner</p>
                  <p className="text-sm text-muted-foreground">
                    Du lærer best ved å gjøre. Praktiske øvelser, labarbeid og hands-on erfaring er ideelt for deg.
                  </p>
                </div>
              ),
              reading: (
                <div>
                  <p className="font-semibold text-sm mb-1">Lese/skrive-learner</p>
                  <p className="text-sm text-muted-foreground">
                    Du lærer best gjennom tekst. Notater, pensumlitteratur og å skrive sammendrag er dine beste metoder.
                  </p>
                </div>
              ),
            }[profile.learningStyle]}
          </CardContent>
        </Card>
      )}

      {/* Tips basert på profil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Anbefalte neste steg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">1</span>
              <span>Utforsk karriereveier som matcher RIASEC-koden <strong>{riasecCode}</strong> på <Link href="/dashboard/karriere" className="text-primary underline">Karrierestiutforskeren</Link>.</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">2</span>
              <span>Snakk med <Link href="/dashboard/veileder" className="text-primary underline">AI-veilederen</Link> om hva RIASEC-koden din betyr i praksis.</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">3</span>
              <span>Sjekk <Link href="/dashboard/karakterer" className="text-primary underline">karaktersiden</Link> for å se hvilke studier du kan søke på med dine poeng.</span>
            </li>
            {profile.bigFive.conscientiousness < 40 && (
              <li className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-600">💡</span>
                <span>Din planmessighet er lav — prøv korte daglige studiesesjoner og bruk kalender for å holde oversikten.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AnalysePageGated() {
  return (
    <FeatureGate feature="avansert-analyse">
      <AnalysePage />
    </FeatureGate>
  );
}
