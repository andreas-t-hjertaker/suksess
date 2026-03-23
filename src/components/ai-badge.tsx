/**
 * AI-merking i brukergrensesnitt (Issue #57)
 *
 * EU AI Act (art. 50) og Datatilsynets retningslinjer krever tydelig
 * merking av AI-generert innhold, spesielt overfor mindreårige.
 * Trer i kraft august 2026 — implementert nå for å være forberedt.
 */

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function AiBadge({ className, size = "sm" }: AiBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-medium dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
      title="Dette svaret er generert av kunstig intelligens (AI)"
      aria-label="AI-generert innhold"
    >
      <Bot className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
      AI-generert
    </span>
  );
}
