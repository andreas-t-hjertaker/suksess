"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { useXp } from "@/hooks/use-xp";
import { useCareerData } from "@/hooks/use-career-data";
import { FeatureGate } from "@/components/feature-gate";
import type { UserProfile, RiasecScores } from "@/types/domain";
import type { EnrichedCareer } from "@/lib/karriere/data-service";
import {
  EDU_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  type EducationLevel,
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
  TrendingUp,
  Search,
  X,
  Briefcase,
  Info,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import { CareerCard } from "@/components/career-card";
import { CareerDetail } from "@/components/career-detail";

const ALL_EDU_LEVELS: EducationLevel[] = ["vgs", "fagbrev", "bachelor", "master", "phd"];

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
      {/* Sideoverskrift */}
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

      {/* Topp-matcher */}
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

      {/* Ingen RIASEC-profil */}
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

      {/* Filtre */}
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

      {/* Antall resultater */}
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {filtered.length} av {careerData.length} yrker
        </span>
      </div>

      {/* Karriererutenett */}
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

      {/* Detaljpanel */}
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
