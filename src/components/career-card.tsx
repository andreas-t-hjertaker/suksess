import type { RiasecScores } from "@/types/domain";
import {
  SECTOR_COLORS,
  EDU_LABELS,
  DEMAND_LABELS,
  calcFitScore,
  fitScoreColor,
  fitScoreBg,
  type CareerNode,
  type Demand,
} from "@/lib/karriere/data";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMAND_ICON: Record<Demand, string> = {
  high: "↑",
  medium: "→",
  low: "↓",
};

export function DemandBadge({ demand }: { demand: Demand }) {
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
