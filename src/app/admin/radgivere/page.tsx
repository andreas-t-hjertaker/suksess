"use client";

/**
 * Rådgiver-dashboard — aggregerte, anonymiserte elevdata for skoler og rådgivere.
 * Viser distribusjoner, fullføringsstatus og karrierematch uten individuelle data.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeStudents } from "@/hooks/use-realtime-students";
import { UserProfileSchema } from "@/types/schemas";
import type { UserProfile, BigFiveScores, RiasecScores } from "@/types/domain";
import {
  type TrafficLight,
  classifyActivity,
  computeStats,
  exportToCsv,
  RIASEC_LABELS,
  BIG_FIVE_LABELS,
  TRAFFIC_CONFIG,
} from "@/lib/admin/radgiver-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Brain,
  Compass,
  TrendingUp,
  BarChart2,
  Info,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Periodefilter
// ---------------------------------------------------------------------------

type PeriodFilter = "week" | "month" | "semester" | "year";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  week: "Siste uke",
  month: "Siste måned",
  semester: "Semester",
  year: "Skoleår",
};

const TRAFFIC_ICONS = {
  green: CheckCircle2,
  yellow: Clock,
  red: AlertTriangle,
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ label, value, max = 100, color = "bg-primary" }: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RadgivereAdminPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("month");

  // Realtime elevdata for trafikklys
  const { students } = useRealtimeStudents();

  async function fetchProfiles() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "profiles"));
      const data = snap.docs.reduce<UserProfile[]>((acc, d) => {
        const result = UserProfileSchema.safeParse(d.data());
        if (result.success) {
          acc.push(result.data as unknown as UserProfile);
        }
        return acc;
      }, []);
      setProfiles(data);
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) fetchProfiles();
  }, [user]);

  const stats = useMemo(() => computeStats(profiles), [profiles]);

  // Trafikklys-aggregering
  const trafficCounts = useMemo(() => {
    const counts: Record<TrafficLight, number> = { green: 0, yellow: 0, red: 0 };
    for (const s of students) {
      const light = classifyActivity(s.lastLoginAt, s.bigFiveCompleted, s.riskLevel);
      counts[light]++;
    }
    return counts;
  }, [students]);

  const handleExport = useCallback(() => {
    exportToCsv(stats, trafficCounts);
  }, [stats, trafficCounts]);

  const riasecKeys: (keyof RiasecScores)[] = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"];
  const bigFiveKeys: (keyof BigFiveScores)[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

  const maxRiasecFreq = Math.max(...Object.values(stats.riasecTopFreq), 1);
  const topStrengths = Object.entries(stats.strengthFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rådgiverdashbord</h1>
          <p className="text-muted-foreground mt-1">
            Læringsanalyse og elevoppfølging — aggregert og anonymisert (GDPR)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            {(Object.entries(PERIOD_LABELS) as [PeriodFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  period === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfiles}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Oppdater
          </Button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Data vises aggregert og anonymisert i samsvar med GDPR. Ingen enkeltelevers identitet, navn eller e-post er synlig.
        </p>
      </div>

      {/* Trafikklys-risikoindikator (#67) */}
      {students.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["green", "yellow", "red"] as TrafficLight[]).map((light) => {
            const cfg = TRAFFIC_CONFIG[light];
            const Icon = TRAFFIC_ICONS[light];
            const count = trafficCounts[light];
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            return (
              <Card key={light}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", {
                    "bg-green-100 dark:bg-green-900/30": light === "green",
                    "bg-amber-100 dark:bg-amber-900/30": light === "yellow",
                    "bg-red-100 dark:bg-red-900/30": light === "red",
                  })}>
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold", cfg.color)}>{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {cfg.label} ({pct}%) — {cfg.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Elevprofiler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats.totalProfiles}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Fullført onboarding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vanligste RIASEC</CardTitle>
            <Compass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : stats.totalProfiles === 0 ? (
              <p className="text-2xl font-bold">—</p>
            ) : (
              <p className="text-2xl font-bold capitalize">
                {riasecKeys.reduce((best, k) =>
                  stats.riasecTopFreq[k] > stats.riasecTopFreq[best] ? k : best,
                  riasecKeys[0]
                ).charAt(0).toUpperCase()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Dominerende kode</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gj.snitt åpenhet</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats.bigFiveAvg.openness}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Av 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Topp karrierematch</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : stats.topCareers.length > 0 ? (
              <p className="text-base font-bold leading-tight">{stats.topCareers[0]?.title}</p>
            ) : (
              <p className="text-2xl font-bold">—</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Høyest gjennomsnittlig match</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats.totalProfiles === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Ingen elevprofiler funnet ennå.</p>
            <p className="text-xs mt-1">Data vises etter at elever har fullført onboarding.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Big Five */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Big Five — gjennomsnittsscorer
              </CardTitle>
              <CardDescription>Normalisert 0–100, {stats.totalProfiles} elever</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bigFiveKeys.map((k) => (
                <ScoreBar
                  key={k}
                  label={BIG_FIVE_LABELS[k]}
                  value={stats.bigFiveAvg[k]}
                  color="bg-violet-500"
                />
              ))}
            </CardContent>
          </Card>

          {/* RIASEC */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                RIASEC — gjennomsnittsscorer
              </CardTitle>
              <CardDescription>Normalisert 0–100, interesseprofil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {riasecKeys.map((k) => (
                <ScoreBar
                  key={k}
                  label={RIASEC_LABELS[k]}
                  value={stats.riasecAvg[k]}
                  color="bg-blue-500"
                />
              ))}
            </CardContent>
          </Card>

          {/* RIASEC top code distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Dominerende RIASEC-kode per elev
              </CardTitle>
              <CardDescription>Antall elever med hver kode som sterkest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {riasecKeys.map((k) => {
                const count = stats.riasecTopFreq[k];
                const pct = Math.round((count / stats.totalProfiles) * 100);
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{RIASEC_LABELS[k]}</span>
                      <span className="font-medium">
                        {count} elev{count !== 1 ? "er" : ""} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-700"
                        style={{ width: `${(count / maxRiasecFreq) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top careers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Topp karrierematcher for kohorten
              </CardTitle>
              <CardDescription>Gjennomsnittlig fit-score på tvers av alle elever</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topCareers.slice(0, 8).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{c.title}</span>
                        <span
                          className={cn(
                            "text-xs font-bold shrink-0 ml-2",
                            c.avgScore >= 70
                              ? "text-green-600 dark:text-green-400"
                              : c.avgScore >= 45
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.avgScore}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            c.avgScore >= 70
                              ? "bg-green-500"
                              : c.avgScore >= 45
                              ? "bg-amber-500"
                              : "bg-muted-foreground/40"
                          )}
                          style={{ width: `${c.avgScore}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {c.sector}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top strengths */}
          {topStrengths.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Vanligste styrker i kohorten</CardTitle>
                <CardDescription>VIA-inspirerte styrker rangert etter frekvens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {topStrengths.map(([strength, count]) => (
                    <div
                      key={strength}
                      className="flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1"
                    >
                      <span className="text-sm font-medium capitalize">{strength}</span>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {lastFetched && (
        <p className="text-xs text-muted-foreground text-right">
          Sist oppdatert: {lastFetched.toLocaleTimeString("nb-NO")}
        </p>
      )}
    </div>
  );
}
