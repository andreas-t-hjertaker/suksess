"use client";

/**
 * Rådgiver-dashboard — aggregerte, anonymiserte elevdata for skoler (Issue #67)
 *
 * Nye funksjoner vs v1:
 * - Trafikklys: identifiser «non-explorers» (ikke logget inn siste 21 dager)
 * - Periodefilter: uke / måned / semester / skoleår
 * - CSV-eksport av aggregert (anonymisert) klasserapport
 * - Rådgivernotater per kohort (lagret i Firestore counselorNotes/)
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile, BigFiveScores, RiasecScores } from "@/types/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CAREER_NODES, calcFitScore } from "@/lib/karriere/data";
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
  StickyNote,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type PeriodKey = "uke" | "maned" | "semester" | "skolear";

type AggregateStats = {
  totalProfiles: number;
  bigFiveAvg: BigFiveScores;
  riasecAvg: RiasecScores;
  riasecTopFreq: Record<keyof RiasecScores, number>;
  topCareers: { id: string; title: string; sector: string; avgScore: number }[];
  strengthFreq: Record<string, number>;
  /** Antall elever uten aktivitet siste N dager */
  nonExplorers: number;
  /** Antall elever som aldri fullførte onboarding */
  neverOnboarded: number;
};

// ---------------------------------------------------------------------------
// Periode-hjelper
// ---------------------------------------------------------------------------

const PERIOD_LABELS: Record<PeriodKey, string> = {
  uke: "Siste uke",
  maned: "Siste måned",
  semester: "Siste semester",
  skolear: "Skoleåret",
};

function periodCutoff(period: PeriodKey): Date {
  const now = new Date();
  switch (period) {
    case "uke":     return new Date(now.getTime() - 7  * 86400_000);
    case "maned":   return new Date(now.getTime() - 30 * 86400_000);
    case "semester":return new Date(now.getTime() - 120 * 86400_000);
    case "skolear": return new Date(now.getTime() - 365 * 86400_000);
  }
}

// ---------------------------------------------------------------------------
// Statistikkberegning
// ---------------------------------------------------------------------------

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

function computeStats(profiles: UserProfile[], period: PeriodKey): AggregateStats {
  const cutoff = periodCutoff(period);
  const n = profiles.length;

  const zeroRiasec: RiasecScores = {
    realistic: 0, investigative: 0, artistic: 0,
    social: 0, enterprising: 0, conventional: 0,
  };
  const zeroBigFive: BigFiveScores = {
    openness: 0, conscientiousness: 0, extraversion: 0,
    agreeableness: 0, neuroticism: 0,
  };

  if (n === 0) {
    return {
      totalProfiles: 0, bigFiveAvg: zeroBigFive, riasecAvg: zeroRiasec,
      riasecTopFreq: { realistic: 0, investigative: 0, artistic: 0, social: 0, enterprising: 0, conventional: 0 },
      topCareers: [], strengthFreq: {}, nonExplorers: 0, neverOnboarded: 0,
    };
  }

  const bigFiveKeys: (keyof BigFiveScores)[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];
  const riasecKeys: (keyof RiasecScores)[] = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"];

  const bigFiveAvg = Object.fromEntries(
    bigFiveKeys.map((k) => [k, avg(profiles.map((p) => p.bigFive?.[k] ?? 50))])
  ) as BigFiveScores;

  const riasecAvg = Object.fromEntries(
    riasecKeys.map((k) => [k, avg(profiles.map((p) => p.riasec?.[k] ?? 50))])
  ) as RiasecScores;

  const riasecTopFreq = Object.fromEntries(riasecKeys.map((k) => [k, 0])) as Record<keyof RiasecScores, number>;
  for (const p of profiles) {
    if (!p.riasec) continue;
    const top = riasecKeys.reduce((best, k) => (p.riasec[k] > p.riasec[best] ? k : best), riasecKeys[0]);
    riasecTopFreq[top]++;
  }

  const careerScores = CAREER_NODES.map((career) => {
    const scores = profiles.filter((p) => p.riasec).map((p) => calcFitScore(career, p.riasec));
    return { id: career.id, title: career.title, sector: career.sector, avgScore: avg(scores) };
  }).sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);

  const strengthFreq: Record<string, number> = {};
  for (const p of profiles) {
    for (const s of p.strengths ?? []) {
      strengthFreq[s] = (strengthFreq[s] ?? 0) + 1;
    }
  }

  // Non-explorers: ikke oppdatert i perioden
  const nonExplorers = profiles.filter((p) => {
    const last = p.lastUpdated?.toDate?.() ?? null;
    return !last || last < cutoff;
  }).length;

  const neverOnboarded = profiles.filter((p) => !p.riasec || !p.bigFive).length;

  return { totalProfiles: n, bigFiveAvg, riasecAvg, riasecTopFreq, topCareers: careerScores, strengthFreq, nonExplorers, neverOnboarded };
}

// ---------------------------------------------------------------------------
// CSV-eksport
// ---------------------------------------------------------------------------

function exportCsv(stats: AggregateStats, period: PeriodKey) {
  const lines: string[] = [];
  lines.push(`"Suksess rådgiverrapport — ${PERIOD_LABELS[period]}"`);
  lines.push(`"Generert","${new Date().toLocaleDateString("nb-NO")}"`);
  lines.push(`"Antall elevprofiler","${stats.totalProfiles}"`);
  lines.push(`"Non-explorers","${stats.nonExplorers}"`);
  lines.push(`"Aldri onboardet","${stats.neverOnboarded}"`);
  lines.push("");
  lines.push('"Big Five gjennomsnitt (0-100)"');
  lines.push('"Åpenhet","Planmessighet","Utadvendthet","Medmenneskelighet","Nevrotisisme"');
  lines.push([
    stats.bigFiveAvg.openness,
    stats.bigFiveAvg.conscientiousness,
    stats.bigFiveAvg.extraversion,
    stats.bigFiveAvg.agreeableness,
    stats.bigFiveAvg.neuroticism,
  ].join(","));
  lines.push("");
  lines.push('"RIASEC gjennomsnitt (0-100)"');
  lines.push('"R","I","A","S","E","C"');
  lines.push([
    stats.riasecAvg.realistic,
    stats.riasecAvg.investigative,
    stats.riasecAvg.artistic,
    stats.riasecAvg.social,
    stats.riasecAvg.enterprising,
    stats.riasecAvg.conventional,
  ].join(","));
  lines.push("");
  lines.push('"Topp karrierematcher"');
  lines.push('"Karriere","Sektor","Gjennomsnittlig match %"');
  for (const c of stats.topCareers) {
    lines.push(`"${c.title}","${c.sector}","${c.avgScore}"`);
  }

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rådgiverrapport_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-komponenter
// ---------------------------------------------------------------------------

const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "Realistisk (R)",
  investigative: "Undersøkende (I)",
  artistic: "Artistisk (A)",
  social: "Sosial (S)",
  enterprising: "Entreprenant (E)",
  conventional: "Konvensjonell (C)",
};

const BIG_FIVE_LABELS: Record<keyof BigFiveScores, string> = {
  openness: "Åpenhet",
  conscientiousness: "Planmessighet",
  extraversion: "Utadvendthet",
  agreeableness: "Medmenneskelighet",
  neuroticism: "Nevrotisisme",
};

function ScoreBar({ label, value, color = "bg-primary" }: {
  label: string; value: number; color?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${label}: ${value}`} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/** Trafikklys-kort for ikke-aktive elever */
function TrafikklysKort({ stats }: { stats: AggregateStats }) {
  const total = stats.totalProfiles;
  if (total === 0) return null;

  const activeCount = total - stats.nonExplorers;
  const activePct = Math.round((activeCount / total) * 100);

  const riskLevel =
    activePct >= 80 ? "green" :
    activePct >= 50 ? "yellow" :
    "red";

  const riskConfig = {
    green:  { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950", label: "Bra engasjement" },
    yellow: { icon: Clock,        color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950", label: "Moderat aktivitet" },
    red:    { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950", label: "Lav aktivitet" },
  }[riskLevel];

  const Icon = riskConfig.icon;

  return (
    <Card className={cn("border-0", riskConfig.bg)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn("h-4 w-4", riskConfig.color)} aria-hidden="true" />
          <span className={riskConfig.color}>{riskConfig.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end gap-1">
          <span className={cn("text-3xl font-bold", riskConfig.color)}>{activePct}%</span>
          <span className="text-xs text-muted-foreground mb-1">aktive i perioden</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {stats.nonExplorers} av {total} elever er ikke aktive i valgt periode.
          {stats.neverOnboarded > 0 && ` ${stats.neverOnboarded} har aldri fullført onboarding.`}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rådgivernotat-seksjon
// ---------------------------------------------------------------------------

function RadgiverNotat({ userId }: { userId: string | undefined }) {
  const [notat, setNotat] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "counselorNotes", userId))
      .then((snap) => { if (snap.exists()) setNotat(snap.data().notat ?? ""); })
      .catch(() => {});
  }, [userId]);

  async function saveNotat(text: string) {
    if (!userId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "counselorNotes", userId), {
        notat: text, updatedAt: serverTimestamp(), counselorId: userId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleChange(val: string) {
    setNotat(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNotat(val), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />
          Rådgivernotat
        </CardTitle>
        <CardDescription>Konfidensielt — kun synlig for deg som rådgiver</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notat}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Notater om kohorten, tiltak, oppfølgingspunkter…"
          rows={4}
          aria-label="Rådgivernotat"
        />
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          {saved && <span className="text-green-600">Lagret</span>}
          <span>{notat.length} tegn</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hovedside
// ---------------------------------------------------------------------------

export default function RadgivereAdminPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("maned");

  async function fetchProfiles() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "profiles"));
      setProfiles(snap.docs.map((d) => d.data() as UserProfile));
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) fetchProfiles(); }, [user]);

  const stats = useMemo(() => computeStats(profiles, period), [profiles, period]);

  const riasecKeys: (keyof RiasecScores)[] = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"];
  const bigFiveKeys: (keyof BigFiveScores)[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];
  const maxRiasecFreq = Math.max(...Object.values(stats.riasecTopFreq), 1);
  const topStrengths = Object.entries(stats.strengthFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skoler & rådgivere</h1>
          <p className="text-muted-foreground mt-1">Aggregerte, anonymiserte elevdata.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Periodefilter */}
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-44" aria-label="Velg periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
                <SelectItem key={k} value={k}>{PERIOD_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* CSV-eksport */}
          <Button
            variant="outline" size="sm"
            onClick={() => exportCsv(stats, period)}
            disabled={stats.totalProfiles === 0}
            aria-label="Eksporter rapport som CSV"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Eksporter CSV
          </Button>

          <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Oppdater
          </Button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">
          Data vises aggregert og anonymisert (GDPR). Individuelle profiler vises kun etter eksplisitt elevsamtykke.
        </p>
      </div>

      {/* Trafikklys */}
      {!loading && stats.totalProfiles > 0 && (
        <TrafikklysKort stats={stats} />
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Elevprofiler", icon: Users, value: loading ? null : stats.totalProfiles, sub: "Fullført onboarding" },
          { label: "Ikke aktive", icon: AlertTriangle, value: loading ? null : stats.nonExplorers, sub: `I ${PERIOD_LABELS[period].toLowerCase()}` },
          { label: "Vanligste RIASEC", icon: Compass, value: loading ? null : (stats.totalProfiles === 0 ? "—" : riasecKeys.reduce((b, k) => stats.riasecTopFreq[k] > stats.riasecTopFreq[b] ? k : b, riasecKeys[0]).charAt(0).toUpperCase()), sub: "Dominerende kode" },
          { label: "Topp karrierematch", icon: TrendingUp, value: loading ? null : (stats.topCareers[0]?.title ?? "—"), sub: "Høyest gjennomsnittlig match" },
        ].map(({ label, icon: Icon, value, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              {value === null ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-2xl font-bold leading-tight">{value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">{[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4 w-full" />)}</CardContent>
            </Card>
          ))}
        </div>
      ) : stats.totalProfiles === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
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
                <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
                Big Five — gjennomsnittsscorer
              </CardTitle>
              <CardDescription>Normalisert 0–100, {stats.totalProfiles} elever</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bigFiveKeys.map((k) => (
                <ScoreBar key={k} label={BIG_FIVE_LABELS[k]} value={stats.bigFiveAvg[k]} color="bg-violet-500" />
              ))}
            </CardContent>
          </Card>

          {/* RIASEC */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                RIASEC — gjennomsnittsscorer
              </CardTitle>
              <CardDescription>Normalisert 0–100, interesseprofil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {riasecKeys.map((k) => (
                <ScoreBar key={k} label={RIASEC_LABELS[k]} value={stats.riasecAvg[k]} color="bg-blue-500" />
              ))}
            </CardContent>
          </Card>

          {/* RIASEC-fordeling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" aria-hidden="true" />
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
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-500 transition-all duration-700"
                        style={{ width: `${(count / maxRiasecFreq) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Topp karrierer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                Topp karrierematcher for kohorten
              </CardTitle>
              <CardDescription>Gjennomsnittlig fit-score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topCareers.slice(0, 8).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{c.title}</span>
                        <span className={cn("text-xs font-bold shrink-0 ml-2",
                          c.avgScore >= 70 ? "text-green-600 dark:text-green-400" :
                          c.avgScore >= 45 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>{c.avgScore}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all",
                          c.avgScore >= 70 ? "bg-green-500" : c.avgScore >= 45 ? "bg-amber-500" : "bg-muted-foreground/40"
                        )} style={{ width: `${c.avgScore}%` }} />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{c.sector}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Styrker */}
          {topStrengths.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Vanligste styrker i kohorten</CardTitle>
                <CardDescription>VIA-inspirerte styrker rangert etter frekvens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {topStrengths.map(([strength, count]) => (
                    <div key={strength} className="flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1">
                      <span className="text-sm font-medium capitalize">{strength}</span>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rådgivernotat */}
      <RadgiverNotat userId={user?.uid} />

      {lastFetched && (
        <p className="text-xs text-muted-foreground text-right">
          Sist oppdatert: {lastFetched.toLocaleTimeString("nb-NO")}
        </p>
      )}
    </div>
  );
}
