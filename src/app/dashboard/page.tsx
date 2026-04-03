"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useXp } from "@/hooks/use-xp";
import { useGrades } from "@/hooks/use-grades";
import { PageSkeleton } from "@/components/page-skeleton";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { calculateGradePoints } from "@/lib/grades/calculator";
import { getRiasecCode } from "@/lib/personality/scoring";
import { XpProgress } from "@/components/xp-progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Bot,
  User,
} from "lucide-react";
import { SlideIn, StaggerList, StaggerItem, AnimatedCounter } from "@/components/motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Quick-action lenker
// ---------------------------------------------------------------------------

type QuickLinkDef = {
  href: string;
  labelKey: keyof typeof import("@/lib/i18n/locales").MESSAGES.nb.quickLinks;
  descKey: keyof typeof import("@/lib/i18n/locales").MESSAGES.nb.quickLinks;
  icon: typeof Sparkles;
  color: string;
  bg: string;
};

const QUICK_LINK_DEFS: QuickLinkDef[] = [
  { href: "/dashboard/veileder", labelKey: "aiAdvisor", descKey: "aiAdvisorDesc", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" },
  { href: "/dashboard/karriere", labelKey: "careerExplorer", descKey: "careerExplorerDesc", icon: Compass, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/dashboard/soknadscoach", labelKey: "applicationCoach", descKey: "applicationCoachDesc", icon: ClipboardList, color: "text-orange-500", bg: "bg-orange-500/10" },
  { href: "/dashboard/karakterer", labelKey: "gradesAndPoints", descKey: "gradesAndPointsDesc", icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { href: "/dashboard/jobbmatch", labelKey: "jobMatch", descKey: "jobMatchDesc", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "/dashboard/studier", labelKey: "studyMastery", descKey: "studyMasteryDesc", icon: BookOpen, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "/dashboard/karrieregraf", labelKey: "careerGraph", descKey: "careerGraphDesc", icon: GitBranch, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { href: "/dashboard/analyse", labelKey: "advancedAnalysis", descKey: "advancedAnalysisDesc", icon: BarChart2, color: "text-green-500", bg: "bg-green-500/10" },
  { href: "/dashboard/cv", labelKey: "cvBuilder", descKey: "cvBuilderDesc", icon: ScrollText, color: "text-rose-500", bg: "bg-rose-500/10" },
  { href: "/dashboard/profil", labelKey: "myProfile", descKey: "myProfileDesc", icon: Brain, color: "text-teal-500", bg: "bg-teal-500/10" },
];

// ---------------------------------------------------------------------------
// Onboarding-sjekkliste
// ---------------------------------------------------------------------------

type CheckItem = { label: string; done: boolean; href: string };

type ChecklistMessages = typeof import("@/lib/i18n/locales").MESSAGES.nb.checklist;

function getChecklist(profile: UserProfile | null, gradeCount: number, cl: ChecklistMessages): CheckItem[] {
  return [
    { label: cl.completeOnboarding, done: !!profile, href: "/dashboard" },
    { label: cl.takeBigFive, done: !!profile?.bigFive, href: "/dashboard" },
    { label: cl.takeRiasec, done: !!profile?.riasec, href: "/dashboard" },
    { label: cl.registerGrades, done: gradeCount > 0, href: "/dashboard/karakterer" },
    { label: cl.exploreCareerPaths, done: !!profile?.riasec, href: "/dashboard/karriere" },
    { label: cl.chatWithAdvisor, done: false, href: "/dashboard/veileder" },
    { label: cl.checkApplicationChances, done: false, href: "/dashboard/soknadscoach" },
    { label: cl.downloadCv, done: false, href: "/dashboard/cv" },
  ];
}

// ---------------------------------------------------------------------------
// Page — Bento Grid Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
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
    () => getChecklist(profile, grades.length, t.checklist),
    [profile, grades.length, t.checklist]
  );
  const completedSteps = checklist.filter((c) => c.done).length;
  const progressPercent = Math.round((completedSteps / checklist.length) * 100);

  const firstName = user?.displayName?.split(" ")[0] ?? null;

  if (authLoading) {
    return <PageSkeleton variant="grid" cards={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Velkomsthilsen */}
      <SlideIn direction="up" duration={0.4}>
        <div>
          <h1 className="text-fluid-2xl font-bold tracking-tight font-display">
            {t.dashboard.welcome}{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.dashboard.overview}
          </p>
        </div>
      </SlideIn>

      {/* Bento Grid */}
      <StaggerList
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        staggerDelay={0.08}
      >
        {/* Profilkort — stor (span 2 kolonner på lg) */}
        <StaggerItem>
          <Card variant="glass" className="lg:col-span-1 row-span-1 h-full">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/20">
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-primary" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="font-semibold font-display">{user?.displayName ?? t.dashboard.newUser}</p>
                {riasecCode && (
                  <p className="text-sm font-mono text-primary mt-0.5">{riasecCode}</p>
                )}
              </div>
              {topStrengths.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {topStrengths.map((s) => (
                    <Badge key={s} variant="secondary" className="capitalize text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              <Link
                href="/dashboard/profil"
                className="text-xs text-primary hover:underline mt-1"
              >
                {t.dashboard.seeFullProfile} →
              </Link>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* XP & Streak-kort */}
        <StaggerItem>
          <Card variant="glass" className="h-full">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">XP & Nivå</span>
                </div>
                {streak >= 3 && (
                  <Badge variant="secondary" className="gap-1 text-orange-500">
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    {streak} d
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold font-display">
                <AnimatedCounter value={totalXp} />
                <span className="text-base font-normal text-muted-foreground ml-1">XP</span>
              </p>
              <Badge variant="outline" className={cn("mt-2 gap-1", level.color)}>
                {level.label}
              </Badge>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Karaktersnitt */}
        <StaggerItem>
          <Card variant="glass" className="h-full">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                  <GraduationCap className="h-4 w-4 text-amber-500" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t.dashboard.gradeAverage}</span>
              </div>
              <p className="text-3xl font-bold font-display">
                {gradePoints.average > 0 ? gradePoints.average.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {grades.length > 0
                  ? `${gradePoints.subjectCount} ${t.grades.subject.toLowerCase()} · ${gradePoints.quotaPoints} ${t.grades.soPoints}`
                  : t.dashboard.noGradesYet}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* RIASEC Interesseprofil */}
        <StaggerItem>
          <Card variant="glass" className="h-full">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                  <Compass className="h-4 w-4 text-blue-500" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t.dashboard.interestProfile}</span>
              </div>
              <p className="text-3xl font-bold font-mono">
                {riasecCode ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {riasecCode ? t.dashboard.riasecCode : t.dashboard.completeOnboarding}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* AI Chat widget */}
        <StaggerItem>
          <Link href="/dashboard/veileder" className="block h-full group">
            <Card variant="glass" className="h-full transition-all group-hover:shadow-lg group-hover:-translate-y-0.5">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10">
                    <Bot className="h-4 w-4 text-violet-500" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{t.nav.advisor}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" aria-hidden="true" />
                </div>
                <p className="text-sm text-foreground">
                  {t.aiWidget.greeting}
                </p>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{t.aiWidget.careerTips}</Badge>
                  <Badge variant="secondary" className="text-xs">{t.aiWidget.studyChoice}</Badge>
                  <Badge variant="secondary" className="text-xs">{t.aiWidget.cvHelp}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </StaggerItem>

        {/* Kom-i-gang sjekkliste — høyt kort */}
        <StaggerItem>
          <Card variant="glass" className="h-full">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{t.dashboard.getStarted}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {completedSteps}/{checklist.length}
                </span>
              </div>

              {/* Sirkulær progressring */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/50" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                      className="text-primary transition-all duration-700"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressPercent / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {progressPercent}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {completedSteps === checklist.length
                    ? `${t.dashboard.allDone} 🎉`
                    : `${checklist.length - completedSteps} ${t.dashboard.stepsRemaining}`}
                </div>
              </div>

              <ul className="space-y-1.5">
                {checklist.slice(0, 5).map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                        item.done ? "text-muted-foreground" : "hover:bg-accent"
                      )}
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    </Link>
                  </li>
                ))}
                {checklist.length > 5 && (
                  <li className="text-xs text-muted-foreground px-2 pt-1">
                    +{checklist.length - 5} {t.dashboard.moreSteps}
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerList>

      {/* XP og fremgang (full bredde) */}
      <XpProgress />

      {/* Utforsk — Hurtiglenker */}
      <div>
        <h2 className="text-lg font-semibold font-display mb-4">{t.dashboard.explore}</h2>
        <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
          {QUICK_LINK_DEFS.map((link) => (
            <StaggerItem key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shrink-0", link.bg)}>
                  <link.icon className={cn("h-4 w-4", link.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.quickLinks[link.labelKey]}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.quickLinks[link.descKey]}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {/* Styrker (hvis tilgjengelig) */}
      {topStrengths.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 font-display">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t.dashboard.topStrengths}
          </h2>
          <div className="flex flex-wrap gap-2">
            {topStrengths.map((s) => (
              <Badge key={s} variant="secondary" className="capitalize px-3 py-1 text-sm">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
