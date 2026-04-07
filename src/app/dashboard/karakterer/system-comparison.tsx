"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DualSystemPoints, AdmissionSystem } from "@/lib/grades/calculator";

interface SystemComparisonProps {
  dualPoints: DualSystemPoints;
  activeSystem: AdmissionSystem;
}

export function SystemComparison({ dualPoints, activeSystem }: SystemComparisonProps) {
  const [showBothSystems, setShowBothSystems] = useState(false);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <button
        onClick={() => setShowBothSystems((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors"
        aria-expanded={showBothSystems}
      >
        <span>Sammenlign begge opptakssystemer</span>
        <span className="text-muted-foreground" aria-hidden="true">{showBothSystems ? "▲ Skjul" : "▼ Vis"}</span>
      </button>
      {showBothSystems && (
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div className={cn("rounded-lg border p-3 space-y-1", activeSystem === "legacy" && "border-primary bg-primary/5")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gjeldende system (→ 2027) {activeSystem === "legacy" && "✓ Ditt system"}
            </p>
            <p className="text-2xl font-bold">{dualPoints.totalLegacy.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Realfag: +{dualPoints.legacy.sciencePoints} · Alder: +{dualPoints.legacy.agePoints} · Militær: +{dualPoints.legacy.military} · Folkehøgskole: +{dualPoints.legacy.folkHighSchool}</p>
            <p className="text-xs text-muted-foreground">Maks 14 tilleggspoeng</p>
          </div>
          <div className={cn("rounded-lg border p-3 space-y-1", activeSystem === "reform-2028" && "border-primary bg-primary/5")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reform 2028 (→) {activeSystem === "reform-2028" && "✓ Ditt system"}
            </p>
            <p className="text-2xl font-bold">{dualPoints.totalReform.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Realfag: +{dualPoints.reform.sciencePoints} · Militær: +{dualPoints.reform.military}</p>
            <p className="text-xs text-muted-foreground">Maks 4 tilleggspoeng — alderspoeng og folkehøgskolepoeng fjernet</p>
          </div>
        </div>
      )}
    </div>
  );
}
