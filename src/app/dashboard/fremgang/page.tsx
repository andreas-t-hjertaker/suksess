"use client";

/**
 * Fremgang-side — XP, nivå, achievements, streak og ukentlige oppdrag (Issue #68)
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
import { Flame, Trophy, Zap, Star, Lock, Shield, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Konstanter
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
// Ukentlige oppdrag (Issue #68 — 5+ oppdrag)
// ---------------------------------------------------------------------------

type Challenge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  xp: number;
  link: string;
};

const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "chat_3",
    icon: "🤖", title: "3 AI-samtaler",
    description: "Chat med AI-veilederen tre ganger denne uken",
    xp: 15, link: "/dashboard/veileder",
  },
  {
    id: "explore_career",
    icon: "🗺️", title: "Utforsk 5 karrierer",
    description: "Se profilen til 5 forskjellige karrierestier",
    xp: 15, link: "/dashboard/karriere",
  },
  {
    id: "add_grade",
    icon: "📊", title: "Oppdater karakterer",
    description: "Legg til eller oppdater minst én karakter",
    xp: 10, link: "/dashboard/karakterer",
  },
  {
    id: "cv_update",
    icon: "📝", title: "Oppdater CV-en",
    description: "Legg til et nytt avsnitt i CV-builderen",
    xp: 10, link: "/dashboard/cv",
  },
  {
    id: "study_save",
    icon: "⭐", title: "Lagre et studieprogram",
    description: "Lagre et studieprogram du er interessert i",
    xp: 8, link: "/dashboard/soknadscoach",
  },
  {
    id: "mentor_visit",
    icon: "👥", title: "Utforsk mentorer",
    description: "Se på profiler til minst 2 karrierementorer",
    xp: 8, link: "/dashboard/mentorer",
  },
];

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function FremgangPage() {
  const { totalXp, level, streak, streakShieldUsedAt, earnedAchievements } = useXp();
  const progress = getXpProgress(totalXp);
  const nextLevel = getNextLevel(level.name);
  const levelStyle = LEVEL_STYLES[level.name] ?? LEVEL_STYLES.nybegynner;

  // Streak-skjold: er det tilgjengelig denne uken?
  const currentWeek = getCurrentIsoWeek();
  const shieldAvailable = streakShieldUsedAt !== currentWeek;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Fremgang & XP</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Se XP, nivå, achievements, streak og ukentlige oppdrag.
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
            <p className="text-3xl font-bold">
              {totalXp} <span className="text-sm font-normal text-muted-foreground">XP</span>
            </p>
            {nextLevel && (
              <p className="text-xs text-muted-foreground">
                {progress.current} / {progress.needed} til {nextLevel.label}
              </p>
            )}
          </div>
        </div>

        {nextLevel ? (
          <div>
            <Progress value={progress.percent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{progress.percent}%</p>
          </div>
        ) : (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            🎉 Du har nådd høyeste nivå!
          </p>
        )}

        {/* Streak + skjold */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t flex-wrap">
          <div className="flex items-center gap-2">
            <Flame
              className={cn("h-5 w-5", streak > 0 ? "text-orange-500" : "text-muted-foreground")}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">{streak} dagers streak</span>
            {streak >= 30 && <Badge className="text-xs bg-orange-500">👑 Månedshelt</Badge>}
            {streak >= 7 && streak < 30 && <Badge variant="secondary" className="text-xs">🔥 Imponerende!</Badge>}
          </div>

          {/* Streak-skjold (Issue #68) */}
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
              shieldAvailable
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            )}
            title={shieldAvailable ? "Streak-skjold tilgjengelig denne uken" : "Skjoldet er allerede brukt denne uken"}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{shieldAvailable ? "Skjold tilgjengelig" : "Skjold brukt"}</span>
          </div>
        </div>
      </div>

      {/* Ukentlige oppdrag (Issue #68 — 5+ utfordringer) */}
      <section aria-labelledby="oppdrag-heading">
        <h2 id="oppdrag-heading" className="text-base font-semibold mb-3">
          Ukentlige oppdrag
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Nye oppdrag hver mandag
          </span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEEKLY_CHALLENGES.map((ch) => (
            <a
              key={ch.id}
              href={ch.link}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:bg-accent/40 transition-colors group"
              aria-label={`${ch.title} — ${ch.description}`}
            >
              <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">{ch.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{ch.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ch.description}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">
                <Zap className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                +{ch.xp} XP
              </Badge>
            </a>
          ))}
        </div>
      </section>

      {/* Nivåer */}
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
                  <p className="text-xs text-muted-foreground">
                    {l.minXp} XP{nextL ? ` – ${nextL.minXp - 1} XP` : "+"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Låser opp</p>
                  <p className="text-xs font-medium">{l.unlockedFeatures.length} funksjoner</p>
                </div>
                {isPast
                  ? <Star className="h-4 w-4 text-amber-500 shrink-0" aria-label="Oppnådd" />
                  : <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Låst" />
                }
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievements-samling */}
      <section aria-labelledby="achievements-heading">
        <h2 id="achievements-heading" className="text-base font-semibold mb-3">
          Badge-samling
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
                {earned && <Trophy className="h-4 w-4 text-amber-500 shrink-0" aria-label="Låst opp" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* XP-guide */}
      <section aria-labelledby="guide-heading">
        <h2 id="guide-heading" className="text-base font-semibold mb-3">Slik tjener du XP</h2>
        <div className="rounded-xl border overflow-hidden">
          {XP_GUIDE.map((item, i) => (
            <div key={item.label} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", i % 2 === 0 && "bg-muted/30")}>
              <span aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <Badge variant="outline" className="text-xs">+{item.xp} XP</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getCurrentIsoWeek(): string {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
