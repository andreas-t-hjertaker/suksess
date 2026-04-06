import { cn } from "@/lib/utils";
import { DEMAND_LABELS, type Demand } from "@/lib/karriere/data";

/** Ikonindikator for etterspørselsnivå */
const DEMAND_ICON: Record<Demand, string> = {
  high: "\u2191",
  medium: "\u2192",
  low: "\u2193",
};

/** Farget badge som viser etterspørselsnivå for et yrke */
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
