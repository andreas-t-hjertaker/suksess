"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudyProgramEntry } from "@/lib/grades/calculator";

export function StudyGroup({
  title,
  variant,
  programs,
  userPoints,
}: {
  title: string;
  variant: "success" | "warning" | "neutral";
  programs: StudyProgramEntry[];
  userPoints: number;
}) {
  const [expanded, setExpanded] = useState(variant !== "neutral");

  const colorMap = {
    success: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800",
    warning: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800",
    neutral: "text-muted-foreground bg-muted border-border",
  };

  return (
    <div>
      <button
        className="flex w-full items-center justify-between py-2"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{programs.length}</Badge>
          <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="grid gap-2 sm:grid-cols-2">
          {programs.map((p, i) => {
            const missing = p.requiredPoints - userPoints;
            return (
              <div
                key={i}
                className={cn("rounded-lg border p-3 text-sm", colorMap[variant])}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs opacity-75">{p.institution}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs">Grense: {p.requiredPoints.toFixed(1)}p</span>
                  {variant === "warning" && (
                    <span className="text-xs font-medium">
                      Mangler {missing.toFixed(1)}p
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
