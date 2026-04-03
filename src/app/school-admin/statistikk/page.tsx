"use client";

/**
 * Skole self-service — Statistikk (#134).
 *
 * Viser:
 * - Daglige/ukentlige aktive brukere (siste 30 dager)
 * - Mest brukte moduler
 * - KPI-kort (totalt, aktive 7d, 30d, onboarding)
 * - Rådgiver-aktivitet
 */

import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  UserCheck,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type StatsData = {
  totalStudents: number;
  totalCounselors: number;
  active7d: number;
  active30d: number;
  onboardingComplete: number;
  dailyActive: { date: string; count: number }[];
  moduleUsage: { module: string; visits: number }[];
  counselorActivity: { uid: string; displayName: string; lastActive: string | null }[];
};

// ---------------------------------------------------------------------------
// Aktivitetsgraf (SVG bar chart)
// ---------------------------------------------------------------------------

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null;

  const W = 600;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 30, left: 35 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barW = chartW / data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daglig aktivitet siste 30 dager">
      {/* Y-akse labels */}
      {[0, Math.round(maxCount / 2), maxCount].map((v, i) => {
        const y = PAD.top + chartH - (v / maxCount) * chartH;
        return (
          <g key={i}>
            <text x={PAD.left - 5} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {v}
            </text>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="stroke-muted/30" strokeDasharray="3,3" />
          </g>
        );
      })}

      {/* Stolper */}
      {data.map((d, i) => {
        const x = PAD.left + i * (barW + 1);
        const h = (d.count / maxCount) * chartH;
        const y = PAD.top + chartH - h;

        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={1.5}
              className="fill-primary/70 hover:fill-primary transition-colors"
            >
              <title>{`${d.date}: ${d.count} aktive`}</title>
            </rect>
            {/* Vis dato for hver 7. dag */}
            {i % 7 === 0 && (
              <text
                x={x + barW / 2}
                y={H - 5}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {d.date.slice(5)} {/* MM-DD */}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Modulbruk (horisontal bar chart)
// ---------------------------------------------------------------------------

function ModuleUsageChart({ data }: { data: { module: string; visits: number }[] }) {
  if (data.length === 0) return null;
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.module} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-32 shrink-0 text-right">{d.module}</span>
          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${(d.visits / maxVisits) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right">{d.visits}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function SchoolAdminStatistikkPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    loadStats();
  }, [tenantId, tenantLoading]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetchApi<StatsData>("/school-admin/stats");
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("[SchoolAdminStats]", err);
    } finally {
      setLoading(false);
    }
  }

  if (tenantLoading || loading || !stats) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const engagementRate = stats.totalStudents > 0
    ? Math.round((stats.active7d / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Statistikk
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aktivitet og bruk av plattformen
        </p>
      </div>

      {/* KPI-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Elever totalt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active7d}</p>
                <p className="text-xs text-muted-foreground">
                  Aktive siste 7 dager ({engagementRate}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active30d}</p>
                <p className="text-xs text-muted-foreground">Aktive siste 30 dager</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2.5">
                <UserCheck className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onboardingComplete}</p>
                <p className="text-xs text-muted-foreground">Onboarding fullført</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daglig aktivitet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daglig aktivitet</CardTitle>
            <CardDescription>Unike aktive brukere per dag, siste 30 dager</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={stats.dailyActive} />
          </CardContent>
        </Card>

        {/* Modulbruk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mest brukte moduler</CardTitle>
            <CardDescription>Antall elever som har brukt hver modul</CardDescription>
          </CardHeader>
          <CardContent>
            <ModuleUsageChart data={stats.moduleUsage} />
          </CardContent>
        </Card>

        {/* Rådgiver-aktivitet */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Rådgiver-aktivitet</CardTitle>
            <CardDescription>{stats.totalCounselors} rådgivere registrert</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.counselorActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen rådgivere registrert ennå
              </p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Rådgiver</th>
                      <th className="text-left px-4 py-2 font-medium">Siste aktivitet</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.counselorActivity.map((c) => {
                      const lastActive = c.lastActive ? new Date(c.lastActive) : null;
                      const isRecent = lastActive && (Date.now() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000;

                      return (
                        <tr key={c.uid} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{c.displayName}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {lastActive ? lastActive.toLocaleDateString("nb-NO") : "Aldri"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={isRecent ? "text-green-600 bg-green-500/10" : "text-muted-foreground"}>
                              {isRecent ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
