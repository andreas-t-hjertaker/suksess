"use client";

/**
 * Søknads-coach — Poenggrense-tracker og søknads-coach (issue #19)
 * - Søk og sammenlign studieprogram vs. egne SO-poeng
 * - Historisk trenddata (2020–2024)
 * - «Dine sjanser»-indikator
 * - Søknadsfrist-sjekkliste
 */

import { useState, useMemo } from "react";
import { useGrades } from "@/hooks/use-grades";
import { calculateGradePoints, STUDY_PROGRAMS, type StudyProgramEntry } from "@/lib/grades/calculator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Star,
  StarOff,
  CheckCircle2,
  Circle,
  CalendarDays,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Historisk trenddata (mock, basert på reelle SO-tall 2020–2024)
// ---------------------------------------------------------------------------

const YEARS = [2020, 2021, 2022, 2023, 2024] as const;

type TrendEntry = { year: number; required: number; top: number };

const HISTORICAL_TRENDS: Record<string, TrendEntry[]> = {
  "Medisin|UiO": [
    { year: 2020, required: 65.1, top: 67.2 },
    { year: 2021, required: 65.5, top: 67.5 },
    { year: 2022, required: 65.8, top: 67.8 },
    { year: 2023, required: 66.0, top: 67.9 },
    { year: 2024, required: 66.3, top: 68.0 },
  ],
  "Medisin|UiB": [
    { year: 2020, required: 64.2, top: 66.5 },
    { year: 2021, required: 64.6, top: 66.8 },
    { year: 2022, required: 65.0, top: 67.0 },
    { year: 2023, required: 65.2, top: 67.2 },
    { year: 2024, required: 65.5, top: 67.5 },
  ],
  "Sivilingeniør, datateknikk|NTNU": [
    { year: 2020, required: 48.5, top: 54.2 },
    { year: 2021, required: 49.0, top: 55.0 },
    { year: 2022, required: 49.8, top: 55.8 },
    { year: 2023, required: 50.2, top: 56.3 },
    { year: 2024, required: 50.5, top: 56.8 },
  ],
  "Rettsvitenskap|UiO": [
    { year: 2020, required: 56.5, top: 58.5 },
    { year: 2021, required: 56.8, top: 58.8 },
    { year: 2022, required: 57.2, top: 59.5 },
    { year: 2023, required: 57.5, top: 59.8 },
    { year: 2024, required: 57.8, top: 60.0 },
  ],
  "Siviløkonom|NHH": [
    { year: 2020, required: 55.0, top: 57.8 },
    { year: 2021, required: 55.5, top: 58.2 },
    { year: 2022, required: 55.8, top: 58.5 },
    { year: 2023, required: 56.2, top: 59.0 },
    { year: 2024, required: 56.5, top: 59.2 },
  ],
  "Profesjonsstudium i psykologi|UiO": [
    { year: 2020, required: 57.0, top: 59.5 },
    { year: 2021, required: 57.5, top: 60.0 },
    { year: 2022, required: 57.8, top: 60.5 },
    { year: 2023, required: 58.0, top: 60.8 },
    { year: 2024, required: 58.3, top: 61.0 },
  ],
  "Informatikk (bachelor)|UiO": [
    { year: 2020, required: 46.5, top: 52.0 },
    { year: 2021, required: 47.0, top: 52.8 },
    { year: 2022, required: 47.5, top: 53.2 },
    { year: 2023, required: 48.0, top: 54.0 },
    { year: 2024, required: 48.3, top: 54.5 },
  ],
  "Sykepleie (bachelor)|OsloMet": [
    { year: 2020, required: 44.5, top: 49.0 },
    { year: 2021, required: 45.0, top: 49.5 },
    { year: 2022, required: 45.5, top: 50.0 },
    { year: 2023, required: 45.8, top: 50.2 },
    { year: 2024, required: 46.0, top: 50.5 },
  ],
};

function getTrend(program: StudyProgramEntry): TrendEntry[] {
  const key = `${program.name}|${program.institution}`;
  if (HISTORICAL_TRENDS[key]) return HISTORICAL_TRENDS[key];
  // Fallback: generer lineær trend bakover fra 2024
  return YEARS.map((year, i) => ({
    year,
    required: Math.round((program.requiredPoints - (4 - i) * 0.4) * 10) / 10,
    top: Math.round((program.topPoints - (4 - i) * 0.4) * 10) / 10,
  }));
}

// ---------------------------------------------------------------------------
// «Dine sjanser»-kalkulator
// ---------------------------------------------------------------------------

type ChanceLevel = "høy" | "middels" | "lav" | "svært lav";

function calcChance(myPoints: number, program: StudyProgramEntry): {
  level: ChanceLevel;
  label: string;
  color: string;
  pct: number;
} {
  const diff = myPoints - program.requiredPoints;
  const range = program.topPoints - program.requiredPoints;

  if (myPoints >= program.topPoints) {
    return { level: "høy", label: "God sjanse", color: "text-green-600", pct: 100 };
  }
  if (myPoints >= program.requiredPoints) {
    const pct = range > 0 ? Math.round(((myPoints - program.requiredPoints) / range) * 60 + 40) : 50;
    return { level: "middels", label: "Mulig sjanse", color: "text-yellow-600", pct };
  }
  if (diff >= -3) {
    return { level: "lav", label: "Lav sjanse", color: "text-orange-600", pct: 20 };
  }
  return { level: "svært lav", label: "Svært lav", color: "text-red-600", pct: 5 };
}

// ---------------------------------------------------------------------------
// Trendlinje-komponent (SVG sparkline)
// ---------------------------------------------------------------------------

function TrendSparkline({ data }: { data: TrendEntry[] }) {
  if (data.length < 2) return null;
  const W = 120, H = 32, PAD = 4;

  const allReq = data.map((d) => d.required);
  const minV = Math.min(...allReq) - 1;
  const maxV = Math.max(...allReq) + 1;

  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);

  const last = data[data.length - 1];
  const first = data[0];
  const rising = last.required > first.required;

  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline
        points={data.map((d, i) => `${x(i)},${y(d.required)}`).join(" ")}
        fill="none"
        stroke={rising ? "rgb(34,197,94)" : "rgb(239,68,68)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(data.length - 1)} cy={y(last.required)} r={2.5} fill={rising ? "rgb(34,197,94)" : "rgb(239,68,68)"} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Søknadsfrist-sjekkliste
// ---------------------------------------------------------------------------

type CheckItem = {
  id: string;
  label: string;
  deadline: string;
  done: boolean;
};

const DEFAULT_CHECKLIST: CheckItem[] = [
  { id: "so-profil", label: "Opprett profil på Samordna opptak", deadline: "Innen 1. februar", done: false },
  { id: "so-tidlig", label: "Søk tidlig opptak (bare ved snitt ≥ 5.0)", deadline: "1. mars", done: false },
  { id: "vitnemal", label: "Sjekk at vitnemål er korrekt", deadline: "Innen 1. april", done: false },
  { id: "so-ordinaer", label: "Send ordinær søknad via Samordna opptak", deadline: "15. april", done: false },
  { id: "dokumentasjon", label: "Last opp nødvendig dokumentasjon", deadline: "Innen 1. juli", done: false },
  { id: "svar", label: "Svar på tilbud innen fristen", deadline: "20. juli", done: false },
  { id: "poengberegn", label: "Beregn egne poeng inkl. realfagspoeng", deadline: "Løpende", done: false },
  { id: "backup", label: "Velg backup-studier (3–10 prioriteter)", deadline: "Innen 15. april", done: false },
];

// ---------------------------------------------------------------------------
// ProgramCard
// ---------------------------------------------------------------------------

function ProgramCard({
  program,
  myPoints,
  isFavorite,
  onToggleFavorite,
}: {
  program: StudyProgramEntry;
  myPoints: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const chance = calcChance(myPoints, program);
  const trend = getTrend(program);
  const trendDir = trend[trend.length - 1].required - trend[0].required;

  return (
    <div className={cn(
      "rounded-xl border bg-card transition-all",
      isFavorite && "border-primary/40 bg-primary/5"
    )}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
          aria-label={isFavorite ? "Fjern favoritt" : "Legg til favoritt"}
        >
          {isFavorite ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{program.name}</p>
          <p className="text-xs text-muted-foreground">{program.institution}</p>
        </div>

        <TrendSparkline data={trend} />

        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Nedre grense</p>
          <p className="text-sm font-semibold">{program.requiredPoints}</p>
        </div>

        <Badge
          variant="outline"
          className={cn("text-xs shrink-0", chance.color)}
        >
          {chance.label}
        </Badge>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Sjanse-meter */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Dine sjanser</span>
              <span className={cn("font-medium", chance.color)}>{chance.pct}%</span>
            </div>
            <Progress value={chance.pct} className="h-2" />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>Dine poeng: <strong className="text-foreground">{myPoints.toFixed(1)}</strong></span>
              <span>{program.requiredPoints} – {program.topPoints} (grense)</span>
            </div>
          </div>

          {/* Historisk trend */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Historisk poenggrense (2020–2024)
            </p>
            <div className="grid grid-cols-5 gap-1">
              {trend.map((t) => (
                <div key={t.year} className="text-center">
                  <div className="text-xs font-semibold">{t.required}</div>
                  <div className="text-[10px] text-muted-foreground">{t.year}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Trend: {trendDir > 0 ? (
                <span className="text-green-600">↑ Stigende ({trendDir.toFixed(1)} p over 5 år)</span>
              ) : trendDir < 0 ? (
                <span className="text-red-600">↓ Synkende ({Math.abs(trendDir).toFixed(1)} p over 5 år)</span>
              ) : (
                <span className="text-muted-foreground">→ Stabil</span>
              )}
            </p>
          </div>

          {/* Hva mangler */}
          {myPoints < program.requiredPoints && (
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 text-xs text-orange-700 dark:text-orange-400">
              <strong>Du mangler {(program.requiredPoints - myPoints).toFixed(1)} poeng</strong> for å nå nedre grense.
              Vurder realfagsfag (R2 gir +3p) eller forbedring av karakterer.
            </div>
          )}
          {myPoints >= program.requiredPoints && myPoints < program.topPoints && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-700 dark:text-yellow-400">
              Du er innenfor nedre grense, men <strong>{(program.topPoints - myPoints).toFixed(1)} under toppoeng</strong>.
              Du kan komme inn i kvoteplass eller ordinær kvote.
            </div>
          )}
          {myPoints >= program.topPoints && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-700 dark:text-green-400">
              Du er <strong>over toppoeng</strong> — du har god sjanse for inntak!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SoknadsCoachPage() {
  const { grades } = useGrades();
  const gradePoints = useMemo(() => calculateGradePoints(grades), [grades]);
  const myPoints = gradePoints.totalPoints;

  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [checklist, setChecklist] = useState<CheckItem[]>(DEFAULT_CHECKLIST);
  const [tab, setTab] = useState<"programmer" | "sjekkliste">("programmer");

  const programKey = (p: StudyProgramEntry) => `${p.name}|${p.institution}`;

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const filtered = useMemo(() => {
    let list = STUDY_PROGRAMS;
    if (showFavoritesOnly) list = list.filter((p) => favorites.has(programKey(p)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const diffA = myPoints - a.requiredPoints;
      const diffB = myPoints - b.requiredPoints;
      // Vis programmer du er nærmest å kvalifisere for øverst
      return Math.abs(diffA) - Math.abs(diffB);
    });
  }, [search, showFavoritesOnly, favorites, myPoints]);

  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Søknads-coach</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sammenlign studieprogram med dine poeng, se historiske trender og sjekk søknadsfristene.
        </p>
      </div>

      {/* Mine poeng-kort */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Dine SO-poeng</p>
            <p className="text-3xl font-bold text-primary">{myPoints > 0 ? myPoints.toFixed(1) : "–"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Karaktersnitt</p>
            <p className="text-2xl font-semibold">{gradePoints.average > 0 ? gradePoints.average.toFixed(2) : "–"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Realfagspoeng</p>
            <p className="text-2xl font-semibold">{gradePoints.sciencePoints}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Antall fag</p>
            <p className="text-2xl font-semibold">{gradePoints.subjectCount}</p>
          </div>
          {myPoints === 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Legg til karakterer for å se dine poeng
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["programmer", "sjekkliste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "programmer" ? "Studieprogram" : "Sjekkliste"}
            {t === "sjekkliste" && (
              <Badge variant="outline" className="ml-2 text-xs">
                {doneCount}/{checklist.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {tab === "programmer" && (
        <div className="space-y-4">
          {/* Søk + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk studieprogram eller institusjon…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className="gap-1.5 shrink-0"
            >
              <Star className="h-4 w-4" />
              Mine favoritter
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} programmer — sortert etter nærhet til dine poeng. Klikk for å se trenddata og sjansekalkulator.
          </p>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                {showFavoritesOnly ? "Du har ingen favoritter ennå." : "Ingen program matcher søket."}
              </p>
            ) : (
              filtered.map((p) => (
                <ProgramCard
                  key={programKey(p)}
                  program={p}
                  myPoints={myPoints}
                  isFavorite={favorites.has(programKey(p))}
                  onToggleFavorite={() => toggleFavorite(programKey(p))}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "sjekkliste" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hold styr på alle steg i søknadsprosessen
            </p>
            <Badge variant="secondary">{doneCount} av {checklist.length} fullført</Badge>
          </div>

          <Progress value={(doneCount / checklist.length) * 100} className="h-2" />

          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.done && "bg-muted/50 opacity-70"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", item.done && "line-through text-muted-foreground")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {item.deadline}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Viktige frister 2025</p>
            <p>• <strong>1. mars</strong>: Tidlig opptak (snitt ≥ 5.0 alle fag)</p>
            <p>• <strong>15. april</strong>: Ordinær søknadsfrist, Samordna opptak</p>
            <p>• <strong>1. juli</strong>: Frist for dokumentasjon</p>
            <p>• <strong>20. juli</strong>: Svar på tilbud om studieplass</p>
          </div>
        </div>
      )}
    </div>
  );
}
