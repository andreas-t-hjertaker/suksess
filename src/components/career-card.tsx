import {
  SECTOR_COLORS,
  EDU_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  type CareerNode,
} from "@/lib/karriere/data";
import type { RiasecScores } from "@/types/domain";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemandBadge } from "@/components/demand-badge";

/** Kompakt karrierekort med match-score, sektor og etterspørsel */
export function CareerCard({
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
      {/* Overskrift */}
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

      {/* Beskrivelse */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {career.description}
      </p>

      {/* Bunntekst */}
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
