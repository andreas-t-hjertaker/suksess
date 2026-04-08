"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  StarOff,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendSparkline } from "@/components/trend-sparkline";
import type { LiveStudyProgram } from "@/hooks/use-opptaksdata";

// ---------------------------------------------------------------------------
// «Dine sjanser»-labels
// ---------------------------------------------------------------------------

const SJANSE_LABELS: Record<string, string> = {
  god: "God sjanse",
  usikker: "Usikker",
  lav: "Lav sjanse",
  ukjent: "Ukjent",
};

const SJANSE_COLORS: Record<string, string> = {
  god: "text-green-600",
  usikker: "text-yellow-600",
  lav: "text-red-600",
  ukjent: "text-muted-foreground",
};

function sjanseTilProsent(sjanse: string, diff: number | null): number {
  if (sjanse === "god") return diff !== null && diff >= 5 ? 95 : 80;
  if (sjanse === "usikker") return 55;
  if (sjanse === "lav") return diff !== null && diff >= -5 ? 25 : 10;
  return 50;
}

// ---------------------------------------------------------------------------
// ProgramCard
// ---------------------------------------------------------------------------

export function ProgramCard({
  program,
  myPoints,
  isFavorite,
  onToggleFavorite,
}: {
  program: LiveStudyProgram;
  myPoints: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = sjanseTilProsent(program.sjanse, program.poengDiff);
  const sjanseLabel = SJANSE_LABELS[program.sjanse] ?? "Ukjent";
  const sjanseFarge = SJANSE_COLORS[program.sjanse] ?? "text-muted-foreground";

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
          <p className="text-sm font-medium truncate">{program.navn}</p>
          <p className="text-xs text-muted-foreground">{program.institusjon}</p>
        </div>

        {program.trend.length >= 2 && (
          <TrendSparkline data={program.trend} />
        )}

        {program.poenggrense !== null && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Poenggrense</p>
            <p className="text-sm font-semibold">{program.poenggrense}</p>
          </div>
        )}

        <Badge
          variant="outline"
          className={cn("text-xs shrink-0", sjanseFarge)}
        >
          {sjanseLabel}
        </Badge>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Sjanse-meter */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Dine sjanser</span>
              <span className={cn("font-medium", sjanseFarge)}>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>Dine poeng: <strong className="text-foreground">{myPoints.toFixed(1)}</strong></span>
              {program.poenggrense !== null && (
                <span>
                  {program.poenggrense}
                  {program.topPoeng !== null && program.topPoeng !== program.poenggrense ? ` – ${program.topPoeng}` : ""}
                  {" "}(grense)
                </span>
              )}
            </div>
          </div>

          {/* Historisk trend */}
          {program.trend.length >= 2 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Historisk poenggrense ({program.trend[0].year}–{program.trend[program.trend.length - 1].year})
              </p>
              <div className="grid grid-cols-5 gap-1">
                {program.trend.slice(-5).map((t) => (
                  <div key={t.year} className="text-center">
                    <div className="text-xs font-semibold">{t.required}</div>
                    <div className="text-[10px] text-muted-foreground">{t.year}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Trend: {program.trendRetning === "stigende" ? (
                  <span className="text-green-600">↑ Stigende</span>
                ) : program.trendRetning === "synkende" ? (
                  <span className="text-red-600">↓ Synkende</span>
                ) : program.trendRetning === "stabil" ? (
                  <span className="text-muted-foreground">→ Stabil</span>
                ) : (
                  <span className="text-muted-foreground">Utilstrekkelig data</span>
                )}
              </p>
            </div>
          )}

          {/* Datakilde */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {program.kilde === "live" ? (
              <><Wifi className="h-3 w-3 text-green-500" /> Oppdatert data fra utdanning.no/DBH</>
            ) : (
              <><WifiOff className="h-3 w-3 text-muted-foreground" /> Basert på historiske data</>
            )}
          </div>

          {/* Hva mangler / råd */}
          {program.poenggrense !== null && program.poengDiff !== null && program.poengDiff < 0 && (
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 text-xs text-orange-700 dark:text-orange-400">
              <strong>Du mangler {Math.abs(program.poengDiff).toFixed(1)} poeng</strong> for å nå poenggrensen.
              Vurder realfagsfag (R2 gir +3p) eller forbedring av karakterer.
            </div>
          )}
          {program.poenggrense !== null && program.poengDiff !== null && program.poengDiff >= 0 && program.poengDiff < 2 && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-700 dark:text-yellow-400">
              Du er like over poenggrensen (<strong>+{program.poengDiff.toFixed(1)}</strong>).
              Konkurransen kan bli hard — vurder backup-studier.
            </div>
          )}
          {program.poengDiff !== null && program.poengDiff >= 2 && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-700 dark:text-green-400">
              Du er <strong>{program.poengDiff.toFixed(1)} poeng over</strong> grensen — god sjanse for inntak!
            </div>
          )}

          {/* Antall plasser */}
          {program.antallPlasser !== null && (
            <p className="text-xs text-muted-foreground">
              {program.antallPlasser} studieplasser
            </p>
          )}
        </div>
      )}
    </div>
  );
}
