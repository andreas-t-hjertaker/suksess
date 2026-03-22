"use client";

/**
 * FeatureGate — viser barn kun hvis brukeren har nok XP til å bruke funksjonen.
 * Ellers vises en "låst"-skjerm med informasjon om nødvendig nivå.
 */

import { useXp } from "@/hooks/use-xp";
import { isFeatureUnlocked, getLevelForXp, LEVELS } from "@/lib/gamification/xp";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FeatureGateProps = {
  feature: string;
  children: React.ReactNode;
  /** Valgfri override-melding */
  lockedMessage?: string;
};

export function FeatureGate({ feature, children, lockedMessage }: FeatureGateProps) {
  const { totalXp, level } = useXp();
  const unlocked = isFeatureUnlocked(feature, totalXp);

  if (unlocked) return <>{children}</>;

  // Finn første nivå som låser opp denne funksjonen
  const requiredLevel = LEVELS.find((l) => l.unlockedFeatures.includes(feature));
  const xpNeeded = requiredLevel ? Math.max(0, requiredLevel.minXp - totalXp) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>

      <div className="max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Låst funksjon</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {lockedMessage ??
            (requiredLevel
              ? `Denne funksjonen låses opp på ${requiredLevel.label}-nivå (${requiredLevel.minXp} XP). Du mangler ${xpNeeded} XP.`
              : "Denne funksjonen er ikke tilgjengelig på ditt nåværende nivå.")}
        </p>
      </div>

      {requiredLevel && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">Ditt nivå: <span className="capitalize">{level.label}</span></p>
          <p className="text-muted-foreground">Kreves: <span className="capitalize">{requiredLevel.label}</span> ({requiredLevel.minXp} XP)</p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-muted mx-auto">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (totalXp / requiredLevel.minXp) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{totalXp} / {requiredLevel.minXp} XP</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Tilbake til dashboard</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/dashboard/profil">Fullfør profil (+XP)</Link>
        </Button>
      </div>
    </div>
  );
}
