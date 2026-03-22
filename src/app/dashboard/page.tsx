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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    desc: "Få personlig karriereveiledning",
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    href: "/dashboard/karriere",
    label: "Karrierestiutforsker",
    desc: "Se hvilke yrker som passer deg",
    icon: Compass,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/dashboard/karakterer",
    label: "Karakterer",
    desc: "Beregn SO-poeng og se studieprogram",
    icon: GraduationCap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    href: "/dashboard/analyse",
    label: "Avansert analyse",
    desc: "Dypdykk i din personlighetsprofil",
    icon: BarChart2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    href: "/dashboard/cv",
    label: "CV-builder",
    desc: "Bygg og last ned din CV",
    icon: ScrollText,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    href: "/dashboard/profil",
    label: "Min profil",
    desc: "Se din RIASEC- og Big Five-profil",
    icon: Brain,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
];

// ---------------------------------------------------------------------------
// Onboarding-sjekkliste
// ---------------------------------------------------------------------------

type CheckItem = { label: string; done: boolean; href: string };

function getChecklist(profile: UserProfile | null, gradeCount: number): CheckItem[] {
  return [
    {
      label: "Fullfør onboarding",
      done: !!profile,
      href: "/dashboard",
    },
    {
      label: "Ta Big Five-testen",
      done: !!profile?.bigFive,
      href: "/dashboard",
    },
    {
      label: "Ta RIASEC-testen",
      done: !!profile?.riasec,
      href: "/dashboard",
    },
    {
      label: "Registrer karakterer",
      done: gradeCount > 0,
      href: "/dashboard/karakterer",
    },
    {
      label: "Chat med AI-veilederen",
      done: false,
      href: "/dashboard/veileder",
    },
  ];
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

  const firstName = user?.displayName?.split(" ")[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Velkomsthilsen */}
      <SlideIn direction="up" duration={0.4}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hei{firstName ? `, ${firstName}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Her er en oversikt over din utvikling og karriereplan.
          </p>
        </div>
      </SlideIn>

      {/* Hurtigstatistikk */}
      <StaggerList className="grid gap-4 sm:grid-cols-3" staggerDelay={0.08}>
        {/* Karaktersnitt */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Karaktersnitt</CardDescription>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {gradePoints.average > 0 ? gradePoints.average.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {grades.length > 0
                  ? `${gradePoints.subjectCount} fag · ${gradePoints.quotaPoints} SO-poeng`
                  : "Ingen karakterer ennå"}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* RIASEC */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Interesseprofil</CardDescription>
              <Compass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">
                {riasecCode ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {riasecCode ? "RIASEC-kode" : "Fullfør onboarding"}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* XP */}
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>XP & nivå</CardDescription>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalXp}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {level.label}
                {streak >= 3 && ` · 🔥 ${streak} dager`}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerList>

      {/* XP og fremgang */}
      <XpProgress />

      {/* Hurtiglenker */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Utforsk</h2>
        <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.05}>
          {QUICK_LINKS.map((link) => (
            <StaggerItem key={link.href}>
              <Link
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shrink-0", link.bg)}>
                  <link.icon className={cn("h-4 w-4", link.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>

      {/* Kom-i-gang sjekkliste */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kom i gang</h2>
          <span className="text-sm text-muted-foreground">
            {completedSteps}/{checklist.length} fullført
          </span>
        </div>
        <Card>
          <CardContent className="pt-4">
            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted mb-4">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${(completedSteps / checklist.length) * 100}%` }}
              />
            </div>
            <ul className="space-y-2">
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
                    <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    {!item.done && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Styrker (hvis tilgjengelig) */}
      {topStrengths.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Dine topp-styrker
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
