"use client";

/**
 * Fremgang-side — XP, nivå, achievements og streak-oversikt (issue #20)
 */

import { useXp } from "@/hooks/use-xp";
import {
  LEVELS,
  ACHIEVEMENTS,
  getXpProgress,
  getNextLevel,
} from "@/lib/gamification/xp";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Flame, Trophy, Zap, Star, Lock } from "lucide-react";

// ---------------------------------------------------------------------------
// Nivå-farger / bakgrunner
// ---------------------------------------------------------------------------

const LEVEL_STYLES: Record<string, { badge: string; ring: string; bar: string }> = {
  nybegynner: { badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", ring: "border-slate-300", bar: "bg-slate-400" },
  utforsker:  { badge: "bg-blue-100  text-blue-700  dark:bg-blue-900  dark:text-blue-300",  ring: "border-blue-300",  bar: "bg-blue-500" },
  veiviser:   { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300", ring: "border-violet-300", bar: "bg-violet-500" },
  mester:     { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", ring: "border-amber-300", bar: "bg-amber-500" },
};

const LEVEL_ICONS: Record<string, string> = {
  nybegynner: "🌱",
  utforsker:  "🗺️",
  veiviser:   "🧭",
  mester:     "⭐",
};

// ---------------------------------------------------------------------------
// XP-hendelse-beskrivelser (til aktivitets-guide)
// ---------------------------------------------------------------------------

const XP_GUIDE = [
  { label: "Fullfør onboarding", xp: 50, icon: "🎯" },
  { label: "Ta personlighetstesten (Big Five)", xp: 30, icon: "🧠" },
  { label: "Ta RIASEC-testen", xp: 30, icon: "🔭" },
  { label: "Legg til karakterer (per karakter, maks 50 XP)", xp: 10, icon: "📊" },
  { label: "Daglig innlogging", xp: 5, icon: "📅" },
  { label: "Chat med AI-veilederen", xp: 5, icon: "🤖" },
  { label: "Utforsk karrierevei", xp: 3, icon: "🗺️" },
  { label: "Lagre studieprogram", xp: 8, icon: "⭐" },
  { label: "7-dagers streak", xp: 25, icon: "⚡" },
  { label: "30-dagers streak", xp: 75, icon: "🏆" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FremgangPage() {
  const { totalXp, level, streak, earnedAchievements } = useXp();
  const progress = getXpProgress(totalXp);
  const nextLevel = getNextLevel(level.name);
  const levelStyle = LEVEL_STYLES[level.name] ?? LEVEL_STYLES.nybegynner;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Fremgang</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Se XP, nivå, achievements og daglig streak.
        </p>
      </div>

      {/* Nivå-kort */}
      <div className={cn("rounded-2xl border-2 p-6 space-y-4", levelStyle.ring)}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">{LEVEL_ICONS[level.name]}</span>
            <div>
              <Badge className={cn("text-sm font-semibold px-3 py-0.5", levelStyle.badge)}>
                {level.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{totalXp} <span className="text-sm font-normal text-muted-foreground">XP</span></p>
            {nextLevel && (
              <p className="text-xs text-muted-foreground">{progress.current} / {progress.needed} til {nextLevel.label}</p>
            )}
          </div>
        </div>

        {nextLevel ? (
          <div>
            <Progress value={progress.percent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{progress.percent}%</p>
          </div>
        ) : (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">🎉 Du har nådd høyeste nivå!</p>
        )}

        {/* Streak */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Flame className={cn("h-5 w-5", streak > 0 ? "text-orange-500" : "text-muted-foreground")} aria-hidden="true" />
          <span className="text-sm font-semibold">{streak} dagers streak</span>
          {streak >= 7 && <Badge variant="secondary" className="text-xs">🔥 Imponerende!</Badge>}
          {streak >= 30 && <Badge className="text-xs bg-orange-500">👑 Månedshelt</Badge>}
        </div>
      </div>

      {/* Alle nivåer */}
      <section aria-labelledby="niva-heading">
        <h2 id="niva-heading" className="text-base font-semibold mb-3">Nivåer</h2>
        <div className="space-y-2">
          {LEVELS.map((l, i) => {
            const isPast = totalXp >= l.minXp;
            const isCurrent = level.name === l.name;
            const nextL = LEVELS[i + 1];

            return (
              <div
                key={l.name}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                  isCurrent && "border-primary/40 bg-primary/5",
                  !isPast && "opacity-50"
                )}
              >
                <span className="text-2xl" aria-hidden="true">{LEVEL_ICONS[l.name]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{l.label}</p>
                    {isCurrent && <Badge variant="outline" className="text-xs">Nåværende</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{l.minXp} XP{nextL ? ` – ${nextL.minXp - 1} XP` : "+"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Låser opp</p>
                  <p className="text-xs font-medium">{l.unlockedFeatures.length} funksjoner</p>
                </div>
                {isPast ? (
                  <Star className="h-4 w-4 text-amber-500 shrink-0" aria-label="Oppnådd" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Låst" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements */}
      <section aria-labelledby="achievements-heading">
        <h2 id="achievements-heading" className="text-base font-semibold mb-3">
          Achievements
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({earnedAchievements.length} / {ACHIEVEMENTS.length})
          </span>
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const earned = earnedAchievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3",
                  earned ? "bg-card" : "opacity-40"
                )}
              >
                <span className="text-2xl" aria-hidden="true">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                {a.xpReward > 0 && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Zap className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                    +{a.xpReward} XP
                  </Badge>
                )}
                {earned && (
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0" aria-label="Låst opp" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Aktivitets-guide */}
      <section aria-labelledby="guide-heading">
        <h2 id="guide-heading" className="text-base font-semibold mb-3">Slik tjener du XP</h2>
        <div className="rounded-xl border overflow-hidden">
          {XP_GUIDE.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                i % 2 === 0 && "bg-muted/30"
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <Badge variant="outline" className="text-xs">
                +{item.xp} XP
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
