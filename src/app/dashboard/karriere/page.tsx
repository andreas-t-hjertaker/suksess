"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { useXp } from "@/hooks/use-xp";
import { FeatureGate } from "@/components/feature-gate";
import type { UserProfile, RiasecScores } from "@/types/domain";
import {
  CAREER_NODES,
  SECTOR_COLORS,
  EDU_LABELS,
  DEMAND_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  type CareerNode,
  type EducationLevel,
  type Demand,
} from "@/lib/karriere/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TrendingUp,
  GraduationCap,
  Banknote,
  Search,
  X,
  ArrowRight,
  Briefcase,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

const DEMAND_ICON: Record<Demand, string> = {
  high: "↑",
  medium: "→",
  low: "↓",
};

const ALL_SECTORS = Array.from(new Set(CAREER_NODES.map((c) => c.sector))).sort();
const ALL_EDU_LEVELS: EducationLevel[] = ["vgs", "fagbrev", "bachelor", "master", "phd"];

function formatSalary(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function DemandBadge({ demand }: { demand: Demand }) {
  const colors: Record<Demand, string> = {
    high: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30",
    medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
    low: "text-muted-foreground bg-muted/50 border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        colors[demand]
      )}
    >
      {DEMAND_ICON[demand]} {DEMAND_LABELS[demand]}
    </span>
  );
}

function CareerCard({
  career,
  riasec,
  onClick,
}: {
  career: CareerNode;
  riasec: RiasecScores | null;
  onClick: () => void;
}) {
  const score = riasec ? calcFitScore(career, riasec) : null;
  const sectorClass = SECTOR_COLORS[career.sector] ?? "bg-muted border-border text-foreground";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-xl border p-4 text-left transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        score !== null ? fitScoreBg(score) : "border-border bg-card"
      )}
      aria-label={`${career.title} — ${score !== null ? `${score}% match` : "ukjent match"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{career.title}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              sectorClass
            )}
          >
            {career.sector}
          </span>
        </div>
        {score !== null && (
          <div className={cn("text-right shrink-0", fitScoreColor(score))}>
            <p className="text-lg font-bold leading-none">{score}</p>
            <p className="text-[10px] text-muted-foreground">match</p>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {career.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            {EDU_LABELS[career.educationLevel]}
          </span>
          <DemandBadge demand={career.demand} />
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
}

function CareerDetail({
  career,
  riasec,
  onClose,
}: {
  career: CareerNode;
  riasec: RiasecScores | null;
  onClose: () => void;
}) {
  const score = riasec ? calcFitScore(career, riasec) : null;
  const advancedCareers = career.advancesTo
    ? CAREER_NODES.filter((c) => career.advancesTo!.includes(c.id))
    : [];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">{career.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium",
                SECTOR_COLORS[career.sector] ?? "bg-muted border-border text-foreground"
              )}
            >
              {career.sector}
            </span>
            <DemandBadge demand={career.demand} />
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Match score */}
          {score !== null && (
            <div className={cn("rounded-xl border p-4", fitScoreBg(score))}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Din match</span>
                <span className={cn("text-2xl font-bold", fitScoreColor(score))}>
                  {score}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Match: ${score}%`}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    score >= 70
                      ? "bg-green-500"
                      : score >= 45
                      ? "bg-amber-500"
                      : "bg-muted-foreground/40"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Basert på din RIASEC-profil.{" "}
                {score >= 70
                  ? "Sterk match — dette kan passe deg godt!"
                  : score >= 45
                  ? "Moderat match — verdt å utforske."
                  : "Lavere match — men det hindrer deg ikke!"}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Om yrket</h3>
            <p className="text-sm text-muted-foreground">{career.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Median lønn</span>
              </div>
              <p className="text-sm font-semibold">{formatSalary(career.medianSalary)}</p>
              <p className="text-[10px] text-muted-foreground">per år</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Utdanning</span>
              </div>
              <p className="text-sm font-semibold">{EDU_LABELS[career.educationLevel]}</p>
            </div>
          </div>

          {/* RIASEC codes */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Typiske personlighetstrekk</h3>
            <div className="flex gap-2 flex-wrap">
              {career.riasecCodes.map((code) => {
                const userScore = riasec?.[code] ?? null;
                return (
                  <div
                    key={code}
                    className="rounded-lg border bg-muted/30 px-3 py-1.5 text-center"
                  >
                    <p className="text-xs font-bold">{RIASEC_LABELS[code]}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{code}</p>
                    {userScore !== null && (
                      <p
                        className={cn(
                          "text-[10px] font-medium mt-0.5",
                          userScore >= 60
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {userScore}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Education paths */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              Utdanningsveier
            </h3>
            <ul className="space-y-1.5">
              {career.educationPaths.map((path) => (
                <li key={path} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                  {path}
                </li>
              ))}
            </ul>
          </div>

          {/* Advances to */}
          {advancedCareers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Videreutvikling
              </h3>
              <div className="space-y-2">
                {advancedCareers.map((next) => {
                  const nextScore = riasec ? calcFitScore(next, riasec) : null;
                  return (
                    <div
                      key={next.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{next.title}</p>
                        <p className="text-xs text-muted-foreground">{next.sector}</p>
                      </div>
                      {nextScore !== null && (
                        <span className={cn("text-sm font-semibold", fitScoreColor(nextScore))}>
                          {nextScore}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KarrierePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { earnXp } = useXp();

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("alle");
  const [eduFilter, setEduFilter] = useState<string>("alle");
  const [demandFilter, setDemandFilter] = useState<string>("alle");
  const [selectedCareer, setSelectedCareer] = useState<CareerNode | null>(null);
  const [sortBy, setSortBy] = useState<"match" | "salary" | "title">("match");

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const riasec = profile?.riasec ?? null;

  const filtered = useMemo(() => {
    let list = CAREER_NODES;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.sector.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (sectorFilter !== "alle") {
      list = list.filter((c) => c.sector === sectorFilter);
    }
    if (eduFilter !== "alle") {
      list = list.filter((c) => c.educationLevel === eduFilter);
    }
    if (demandFilter !== "alle") {
      list = list.filter((c) => c.demand === demandFilter);
    }

    if (sortBy === "match" && riasec) {
      list = [...list].sort((a, b) => calcFitScore(b, riasec) - calcFitScore(a, riasec));
    } else if (sortBy === "salary") {
      list = [...list].sort((a, b) => b.medianSalary - a.medianSalary);
    } else if (sortBy === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "nb"));
    }

    return list;
  }, [search, sectorFilter, eduFilter, demandFilter, sortBy, riasec]);

  const topMatches = useMemo(() => {
    if (!riasec) return [];
    return [...CAREER_NODES]
      .sort((a, b) => calcFitScore(b, riasec) - calcFitScore(a, riasec))
      .slice(0, 3);
  }, [riasec]);

  const hasFilters =
    search.trim() !== "" ||
    sectorFilter !== "alle" ||
    eduFilter !== "alle" ||
    demandFilter !== "alle";

  return (
    <main id="main-content" tabIndex={-1} className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Karrierestiutforsker</h1>
        <p className="text-muted-foreground mt-1">
          Utforsk karriereveier basert på din RIASEC-profil og interesser.
        </p>
      </div>

      {/* Top matches */}
      {!profileLoading && riasec && topMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Dine beste matcher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {topMatches.map((career) => {
                const score = calcFitScore(career, riasec);
                return (
                  <button
                    key={career.id}
                    onClick={() => { setSelectedCareer(career); earnXp("career_path_viewed"); }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                      fitScoreBg(score)
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold truncate">{career.title}</span>
                      <span className={cn("text-sm font-bold shrink-0 ml-2", fitScoreColor(score))}>
                        {score}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{career.sector}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {career.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No RIASEC profile notice */}
      {!profileLoading && !riasec && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Ingen RIASEC-profil funnet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fullfør onboarding for å se personlig match-score for hvert yrke.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Søk etter yrke, bransje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={sectorFilter} onValueChange={(v) => setSectorFilter(v ?? "alle")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Bransje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle bransjer</SelectItem>
            {ALL_SECTORS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={eduFilter} onValueChange={(v) => setEduFilter(v ?? "alle")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Utdanning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle nivåer</SelectItem>
            {ALL_EDU_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {EDU_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={demandFilter} onValueChange={(v) => setDemandFilter(v ?? "alle")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Etterspørsel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle</SelectItem>
            <SelectItem value="high">Høy etterspørsel</SelectItem>
            <SelectItem value="medium">Moderat</SelectItem>
            <SelectItem value="low">Lavere</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy((v ?? "match") as typeof sortBy)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Sorter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Match %</SelectItem>
            <SelectItem value="salary">Lønn</SelectItem>
            <SelectItem value="title">Navn A–Å</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setSectorFilter("alle");
              setEduFilter("alle");
              setDemandFilter("alle");
            }}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Nullstill
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {filtered.length} av {CAREER_NODES.length} yrker
        </span>
      </div>

      {/* Career grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-sm">Ingen yrker matcher søket ditt.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setSearch("");
              setSectorFilter("alle");
              setEduFilter("alle");
              setDemandFilter("alle");
            }}
          >
            Nullstill filtre
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((career) => (
            <CareerCard
              key={career.id}
              career={career}
              riasec={riasec}
              onClick={() => { setSelectedCareer(career); earnXp("career_path_viewed"); }}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedCareer && (
        <CareerDetail
          career={selectedCareer}
          riasec={riasec}
          onClose={() => setSelectedCareer(null)}
        />
      )}
    </main>
  );
}

export default function KarrierePageGated() {
  return (
    <FeatureGate feature="karrierestiutforsker">
      <KarrierePage />
    </FeatureGate>
  );
}
