"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { useXp } from "@/hooks/use-xp";
import { useCareerData, useCareerLiveData } from "@/hooks/use-career-data";
import { FeatureGate } from "@/components/feature-gate";
import type { UserProfile, RiasecScores } from "@/types/domain";
import type { EnrichedCareer } from "@/lib/karriere/data-service";
import {
  SECTOR_COLORS,
  EDU_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  type EducationLevel,
} from "@/lib/karriere/data";
import { CareerCard, DemandBadge } from "@/components/career-card";
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
  ExternalLink,
  Loader2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";

const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

const ALL_EDU_LEVELS: EducationLevel[] = ["vgs", "fagbrev", "bachelor", "master", "phd"];

function formatSalary(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function CareerDetail({
  career,
  allCareers,
  riasec,
  onClose,
}: {
  career: EnrichedCareer;
  allCareers: EnrichedCareer[];
  riasec: RiasecScores | null;
  onClose: () => void;
}) {
  const score = riasec ? calcFitScore(career, riasec) : null;
  const advancedCareers = career.advancesTo
    ? allCareers.filter((c) => career.advancesTo!.includes(c.id))
    : [];
  const { data: liveData, loading: liveLoading } = useCareerLiveData(career.id);

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
              {career.ssbSalaryData ? (
                <p className="text-[10px] text-muted-foreground">
                  {formatSalary(career.ssbSalaryData.p25)} – {formatSalary(career.ssbSalaryData.p75)}
                  <br />
                  <span className="text-muted-foreground/60">SSB {career.ssbSalaryData.year}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">per år</p>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Utdanning</span>
              </div>
              <p className="text-sm font-semibold">{EDU_LABELS[career.educationLevel]}</p>
            </div>
          </div>

          {/* Aktive stillinger fra NAV */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Aktive stillinger (NAV)</span>
            </div>
            {liveLoading ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Henter...</span>
              </div>
            ) : (
              <p className="text-sm font-semibold">
                {liveData && liveData.activeJobs > 0 ? liveData.activeJobs : "Ingen funnet"}
              </p>
            )}
          </div>

          {/* Relevante studieprogram */}
          {!liveLoading && liveData && liveData.studyPrograms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Relevante studieprogram
              </h3>
              <ul className="space-y-2">
                {liveData.studyPrograms.slice(0, 5).map((prog) => (
                  <li key={`${prog.name}-${prog.institution}`} className="rounded-lg border bg-muted/20 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{prog.name}</p>
                        <p className="text-xs text-muted-foreground">{prog.institution}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {prog.requiredGpa && (
                          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {prog.requiredGpa.toFixed(1)}
                          </span>
                        )}
                        {prog.url && (
                          <a
                            href={prog.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                            aria-label={`Åpne ${prog.name}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
  const [profileError, setProfileError] = useState<Error | null>(null);
  const { earnXp } = useXp();
  const { careers: careerData, loading: careerLoading, error: careerError, source: dataSource } = useCareerData();

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("alle");
  const [eduFilter, setEduFilter] = useState<string>("alle");
  const [demandFilter, setDemandFilter] = useState<string>("alle");
  const [selectedCareer, setSelectedCareer] = useState<EnrichedCareer | null>(null);
  const [sortBy, setSortBy] = useState<"match" | "salary" | "title">("match");

  useEffect(() => {
    if (!user) return;
    setProfileError(null);
    try {
      const unsub = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setProfileLoading(false);
      });
      return unsub;
    } catch (err) {
      setProfileError(err instanceof Error ? err : new Error("Kunne ikke laste profil"));
      setProfileLoading(false);
      return undefined;
    }
  }, [user]);

  const riasec = profile?.riasec ?? null;

  const allSectors = useMemo(
    () => Array.from(new Set(careerData.map((c) => c.sector))).sort(),
    [careerData]
  );

  const filtered = useMemo(() => {
    let list = careerData;

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
  }, [careerData, search, sectorFilter, eduFilter, demandFilter, sortBy, riasec]);

  const topMatches = useMemo(() => {
    if (!riasec) return [];
    return [...careerData]
      .sort((a, b) => calcFitScore(b, riasec) - calcFitScore(a, riasec))
      .slice(0, 3);
  }, [careerData, riasec]);

  const hasFilters =
    search.trim() !== "" ||
    sectorFilter !== "alle" ||
    eduFilter !== "alle" ||
    demandFilter !== "alle";

  if (profileLoading || careerLoading) {
    return <PageSkeleton variant="grid" cards={6} />;
  }

  if (profileError || careerError) {
    return <ErrorState message={(profileError ?? careerError)!.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <main id="main-content" tabIndex={-1} className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Karrierestiutforsker</h1>
        <p className="text-muted-foreground mt-1">
          Utforsk karriereveier basert på din RIASEC-profil og interesser.
        </p>
        {dataSource && (
          <div className="flex items-center gap-1.5 mt-1">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {dataSource === "firestore"
                ? "Data fra utdanning.no, NAV og SSB"
                : "Lokalt datasett (Firestore utilgjengelig)"}
            </span>
          </div>
        )}
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
            {allSectors.map((s) => (
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
          {filtered.length} av {careerData.length} yrker
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
          allCareers={careerData}
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
