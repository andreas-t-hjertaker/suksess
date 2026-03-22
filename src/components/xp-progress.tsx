"use client";

/**
 * XpProgress — viser brukerens nivå, XP-fremdrift og achievements.
 * Brukes på dashboard.
 */

import { useEffect } from "react";
import { useXp } from "@/hooks/use-xp";
import { LEVELS, ACHIEVEMENTS, getNextLevel } from "@/lib/gamification/xp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Zap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function XpProgress() {
  const { loading, totalXp, level, progress, streak, earnedAchievements, recordDailyLogin } = useXp();

  // Registrer daglig innlogging
  useEffect(() => {
    recordDailyLogin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;

  const nextLevel = getNextLevel(level.name);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Din fremgang</CardTitle>
          <div className="flex items-center gap-2">
            {streak >= 3 && (
              <Badge variant="secondary" className="gap-1 text-orange-500">
                <Flame className="h-3 w-3" />
                {streak} dager
              </Badge>
            )}
            <Badge variant="outline" className={cn("gap-1", level.color)}>
              <Trophy className="h-3 w-3" />
              {level.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XP-fremdrift */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" aria-hidden="true" />
              {totalXp} XP
            </span>
            {nextLevel && (
              <span className="text-muted-foreground">
                {nextLevel.minXp} XP → {nextLevel.label}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Fremgang mot ${nextLevel?.label ?? "maks nivå"}: ${progress.percent}%`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {nextLevel && (
            <p className="text-xs text-muted-foreground">
              {progress.needed - progress.current} XP til {nextLevel.label}
            </p>
          )}
        </div>

        {/* Achievements */}
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Achievements
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ACHIEVEMENTS.map((a) => {
              const earned = earnedAchievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  title={earned ? `${a.title}: ${a.description}` : `Låst: ${a.description}`}
                  aria-label={earned ? `${a.title}: ${a.description}` : `Låst achievement: ${a.description}`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
                    earned
                      ? "border-primary/30 bg-primary/5"
                      : "border-dashed opacity-40"
                  )}
                >
                  <span className="text-lg" aria-hidden="true">
                    {earned ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <span className="text-[10px] font-medium leading-tight">
                    {earned ? a.title : "?"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nivå-oversikt */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
            Se alle nivåer ▾
          </summary>
          <div className="mt-3 space-y-2">
            {LEVELS.map((l) => {
              const isCurrentLevel = l.name === level.name;
              const isUnlocked = totalXp >= l.minXp;
              return (
                <div
                  key={l.name}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    isCurrentLevel && "border-primary/40 bg-primary/5",
                    !isUnlocked && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("font-semibold", l.color)}>{l.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.maxXp === Infinity ? `${l.minXp}+ XP` : `${l.minXp}–${l.maxXp} XP`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
                  {isCurrentLevel && (
                    <Badge variant="secondary" className="mt-1.5 text-xs">
                      Nåværende nivå
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
