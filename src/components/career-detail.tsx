import {
  SECTOR_COLORS,
  EDU_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
} from "@/lib/karriere/data";
import type { RiasecScores } from "@/types/domain";
import type { EnrichedCareer } from "@/lib/karriere/data-service";
import { useCareerLiveData } from "@/hooks/use-career-data";
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
  ArrowRight,
  Briefcase,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemandBadge } from "@/components/demand-badge";

/** RIASEC-kodeforkortelser */
const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

/** Formater tall som norsk valuta */
function formatSalary(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Detaljvisning for en karriere i et sidepanel (Sheet) */
export function CareerDetail({
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
          {/* Match-score */}
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

          {/* Beskrivelse */}
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Om yrket</h3>
            <p className="text-sm text-muted-foreground">{career.description}</p>
          </div>

          {/* Statistikk */}
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

          {/* RIASEC-koder */}
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

          {/* Utdanningsveier */}
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

          {/* Videreutvikling */}
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
