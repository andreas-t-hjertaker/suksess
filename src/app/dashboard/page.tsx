"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useXp } from "@/hooks/use-xp";
import { useGrades } from "@/hooks/use-grades";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { calculateGradePoints } from "@/lib/grades/calculator";
import { getRiasecCode } from "@/lib/personality/scoring";
import { XpProgress } from "@/components/xp-progress";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Compass,
  GraduationCap,
  Sparkles,
  ScrollText,
  BarChart2,
  ChevronRight,
  Star,
  TrendingUp,
  CheckCircle2,
  Circle,
  ClipboardList,
  Briefcase,
  BookOpen,
  GitBranch,
  Flame,
  Zap,
  Target,
} from "lucide-react";
import { SlideIn, StaggerList, StaggerItem } from "@/components/motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Quick-action lenker
// ---------------------------------------------------------------------------

const QUICK_LINKS = [
  {
    href: "/dashboard/veileder",
    label: "AI-veileder",
    desc: "Personlig karriereveiledning",
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    featured: true,
  },
  {
    href: "/dashboard/karriere",
    label: "Karrierestiutforsker",
    desc: "Yrker som passer deg",
    icon: Compass,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    featured: false,
  },
  {
    href: "/dashboard/soknadscoach",
    label: "Søknads-coach",
    desc: "Sjekk sjanser og poenggrenser",
    icon: ClipboardList,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    featured: false,
  },
  {
    href: "/dashboard/karakterer",
    label: "Karakterer & SO-poeng",
    desc: "Beregn SO-poeng",
    icon: GraduationCap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    featured: false,
  },
  {
    href: "/dashboard/jobbmatch",
    label: "Jobbmatch",
    desc: "Finn jobber som passer",
    icon: Briefcase,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    featured: false,
  },
  {
    href: "/dashboard/studier",
    label: "Studiemestring",
    desc: "ECTS-poeng og eksamen",
    icon: BookOpen,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    featured: false,
  },
  {
    href: "/dashboard/karrieregraf",
    label: "Karrieregraf",
    desc: "Visualiser karriereveier",
    icon: GitBranch,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    featured: false,
  },
  {
    href: "/dashboard/analyse",
    label: "Avansert analyse",
    desc: "Dypdykk i din profil",
    icon: BarChart2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    featured: false,
  },
  {
    href: "/dashboard/cv",
    label: "CV-builder",
    desc: "Bygg og last ned CV",
    icon: ScrollText,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    featured: false,
  },
  {
    href: "/dashboard/profil",
    label: "Min profil",
    desc: "RIASEC- og Big Five-profil",
    icon: Brain,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    featured: false,
  },
];

// ---------------------------------------------------------------------------
// Onboarding-sjekkliste
// ---------------------------------------------------------------------------

type CheckItem = { label: string; done: boolean; href: string };

function getChecklist(profile: UserProfile | null, gradeCount: number): CheckItem[] {
  return [
    { label: "Fullfør onboarding", done: !!profile, href: "/dashboard" },
    { label: "Ta Big Five-testen", done: !!profile?.bigFive, href: "/dashboard" },
    { label: "Ta RIASEC-testen", done: !!profile?.riasec, href: "/dashboard" },
    { label: "Registrer karakterer", done: gradeCount > 0, href: "/dashboard/karakterer" },
    { label: "Utforsk karrierestier", done: !!profile?.riasec, href: "/dashboard/karriere" },
    { label: "Chat med AI-veilederen", done: false, href: "/dashboard/veileder" },
    { label: "Sjekk søknadssjansene", done: false, href: "/dashboard/soknadscoach" },
    { label: "Last ned din CV", done: false, href: "/dashboard/cv" },
  ];
}

// ---------------------------------------------------------------------------
// Bento-kort-wrapper
// ---------------------------------------------------------------------------
function BentoCard({
  className,
  children,
  href,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const base = cn(
    "glass-card rounded-2xl p-5 transition-all duration-200",
    href && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer group",
    className
  );
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return <div className={base} onClick={onClick}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const { totalXp, level, streak } = useXp();
  const { grades } = useGrades();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  const gradePoints = useMemo(() => calculateGradePoints(grades), [grades]);
  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;
  const topStrengths = profile?.strengths?.slice(0, 3) ?? [];

  const checklist = useMemo(
    () => getChecklist(profile, grades.length),
    [profile, grades.length]
  );
  const completedSteps = checklist.filter((c) => c.done).length;
  const progressPct = Math.round((completedSteps / checklist.length) * 100);

  const firstName = user?.displayName?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Velkomst */}
      <SlideIn direction="up" duration={0.35}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Hei, ${firstName}! 👋` : "Hei! 👋"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Din personlige karriereoversikt
          </p>
        </div>
      </SlideIn>

      {/* ------------------------------------------------------------------ */}
      {/* BENTO GRID — toppseksjon                                            */}
      {/* ------------------------------------------------------------------ */}
      <SlideIn direction="up" delay={0.08} duration={0.35}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">

          {/* [Stor] Velkomst/profil-widget — 2×2 */}
          <BentoCard
            className="col-span-2 row-span-2 flex flex-col gap-3 bg-gradient-to-br from-primary/8 to-violet-500/8 border-primary/20"
            href="/dashboard/profil"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              {riasecCode && (
                <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                  {riasecCode}
                </Badge>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Din profil</p>
              <p className="mt-1 text-xl font-bold">
                {riasecCode ? `RIASEC: ${riasecCode}` : "Fullfør testen"}
              </p>
              {topStrengths.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topStrengths.map((s) => (
                    <span key={s} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary capitalize">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Se full profil <ChevronRight className="h-3 w-3" />
            </div>
          </BentoCard>

          {/* XP-widget */}
          <BentoCard className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-gradient-to-br from-amber-400/8 to-orange-400/8 border-amber-300/30">
            <div className="flex items-center justify-between">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {level.label}
              </span>
            </div>
            <p className="text-2xl font-extrabold">{totalXp}</p>
            <p className="text-xs text-muted-foreground">XP opptjent</p>
          </BentoCard>

          {/* Streak-widget */}
          <BentoCard className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-gradient-to-br from-rose-400/8 to-pink-400/8 border-rose-300/30">
            <div className="flex items-center justify-between">
              <Flame className="h-4 w-4 text-rose-500" />
              <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Streak</span>
            </div>
            <p className="text-2xl font-extrabold">{streak || 0}</p>
            <p className="text-xs text-muted-foreground">dager på rad</p>
          </BentoCard>

          {/* Karaktersnitt */}
          <BentoCard
            className="col-span-1 sm:col-span-2 flex flex-col gap-1 bg-gradient-to-br from-green-400/8 to-teal-400/8 border-green-300/30"
            href="/dashboard/karakterer"
          >
            <div className="flex items-center justify-between">
              <GraduationCap className="h-4 w-4 text-green-500" />
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">SO-poeng</span>
            </div>
            <p className="text-2xl font-extrabold">
              {gradePoints.average > 0 ? gradePoints.average.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {grades.length > 0 ? `${gradePoints.quotaPoints} SO-poeng` : "Ingen karakterer"}
            </p>
          </BentoCard>

          {/* Fremgang-widget */}
          <BentoCard className="col-span-1 sm:col-span-2 flex flex-col gap-1.5 bg-gradient-to-br from-blue-400/8 to-indigo-400/8 border-blue-300/30">
            <div className="flex items-center justify-between">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Fremgang</span>
            </div>
            <p className="text-2xl font-extrabold">{progressPct}%</p>
            <div className="h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </BentoCard>
        </div>
      </SlideIn>

      {/* XP-progress bar */}
      <SlideIn direction="up" delay={0.12} duration={0.35}>
        <XpProgress />
      </SlideIn>

      {/* ------------------------------------------------------------------ */}
      {/* Quick actions — Bento grid                                          */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Utforsk
        </h2>
        <StaggerList className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.04}>
          {QUICK_LINKS.map((link) => (
            <StaggerItem key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all",
                  "hover:shadow-md hover:-translate-y-0.5 hover:bg-card",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  link.featured && "border-primary/20 bg-primary/3"
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", link.bg)}>
                  <link.icon className={cn("h-4 w-4", link.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Nedre grid: Kom-i-gang + Styrker                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Sjekkliste — 3/5 bredde */}
        <SlideIn direction="up" delay={0.15} duration={0.35} className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Kom i gang</h2>
              <span className="text-xs text-muted-foreground font-medium">
                {completedSteps}/{checklist.length}
              </span>
            </div>
            {/* Progress */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-4">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-1">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      item.done
                        ? "text-muted-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn("flex-1 text-sm", item.done && "line-through opacity-60")}>
                      {item.label}
                    </span>
                    {!item.done && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SlideIn>

        {/* Styrker + profil-preview — 2/5 bredde */}
        <SlideIn direction="up" delay={0.18} duration={0.35} className="lg:col-span-2 flex flex-col gap-4">
          {/* Styrker */}
          {topStrengths.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Dine styrker</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {topStrengths.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize text-xs px-3 py-1">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI-veileder CTA */}
          <Link
            href="/dashboard/veileder"
            className="group glass-card rounded-2xl p-5 flex flex-col gap-3 bg-gradient-to-br from-primary/8 to-violet-500/8 border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Spør AI-veilederen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Få personlig karriereveiledning basert på din profil
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
              Start samtale <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </SlideIn>
      </div>
    </div>
  );
}
