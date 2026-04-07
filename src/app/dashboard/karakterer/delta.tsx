"use client";

import { cn } from "@/lib/utils";

export function Delta({
  current,
  simulated,
  decimals = 1,
}: {
  current: number;
  simulated: number;
  decimals?: number;
}) {
  const diff = simulated - current;
  if (Math.abs(diff) < 0.01) return null;
  const positive = diff > 0;
  return (
    <p className={cn("text-xs font-semibold", positive ? "text-green-600" : "text-red-500")}>
      {positive ? "+" : ""}{diff.toFixed(decimals)}
    </p>
  );
}
