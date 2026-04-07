"use client";

/**
 * Horisontal score-bar med label og progressbar.
 * Ekstrahert fra profil-side (#169).
 */

import { cn } from "@/lib/utils";

export function ScoreBar({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", color)}>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
