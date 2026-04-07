/**
 * Aggregerte statistikk-beregninger og CSV-eksport for rådgiver-dashboard.
 * Ekstrahert fra admin/radgivere (#169).
 */

import type { UserProfile, BigFiveScores, RiasecScores } from "@/types/domain";
import type { DropoutRiskLevel } from "@/lib/risk/dropout-risk";
import { CAREER_NODES, calcFitScore } from "@/lib/karriere/data";
import { todayISO } from "@/lib/utils/time";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type TrafficLight = "green" | "yellow" | "red";

export type AggregateStats = {
  totalProfiles: number;
  bigFiveAvg: BigFiveScores;
  riasecAvg: RiasecScores;
  riasecTopFreq: Record<keyof RiasecScores, number>;
  topCareers: { id: string; title: string; sector: string; avgScore: number }[];
  strengthFreq: Record<string, number>;
};

// ---------------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------------

export const RIASEC_LABELS: Record<keyof RiasecScores, string> = {
  realistic: "Realistisk (R)",
  investigative: "Undersøkende (I)",
  artistic: "Artistisk (A)",
  social: "Sosial (S)",
  enterprising: "Entreprenant (E)",
  conventional: "Konvensjonell (C)",
};

export const BIG_FIVE_LABELS: Record<keyof BigFiveScores, string> = {
  openness: "Åpenhet",
  conscientiousness: "Planmessighet",
  extraversion: "Utadvendthet",
  agreeableness: "Medmenneskelighet",
  neuroticism: "Nevrotisisme",
};

export const TRAFFIC_CONFIG = {
  green: { label: "Aktiv", desc: "Innlogget siste 2 uker, test fullført", color: "text-green-600 dark:text-green-400" },
  yellow: { label: "Passiv", desc: "Lav aktivitet eller ufullstendig profil", color: "text-amber-600 dark:text-amber-400" },
  red: { label: "Inaktiv", desc: "Ikke innlogget 4+ uker eller høy risiko", color: "text-red-600 dark:text-red-400" },
} as const;

// ---------------------------------------------------------------------------
// Trafikklys
// ---------------------------------------------------------------------------

export function classifyActivity(
  lastLogin: Date | null,
  testCompleted: boolean,
  riskLevel: DropoutRiskLevel | null
): TrafficLight {
  const now = Date.now();
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const fourWeeks = 28 * 24 * 60 * 60 * 1000;

  if (!lastLogin || now - lastLogin.getTime() > fourWeeks) return "red";
  if (riskLevel === "high") return "red";
  if (!testCompleted || now - lastLogin.getTime() > twoWeeks || riskLevel === "medium") return "yellow";
  return "green";
}

// ---------------------------------------------------------------------------
// Beregninger
// ---------------------------------------------------------------------------

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

export function computeStats(profiles: UserProfile[]): AggregateStats {
  const n = profiles.length;
  if (n === 0) {
    const zeroRiasec: RiasecScores = {
      realistic: 0, investigative: 0, artistic: 0,
      social: 0, enterprising: 0, conventional: 0,
    };
    const zeroBigFive: BigFiveScores = {
      openness: 0, conscientiousness: 0, extraversion: 0,
      agreeableness: 0, neuroticism: 0,
    };
    return {
      totalProfiles: 0,
      bigFiveAvg: zeroBigFive,
      riasecAvg: zeroRiasec,
      riasecTopFreq: { realistic: 0, investigative: 0, artistic: 0, social: 0, enterprising: 0, conventional: 0 },
      topCareers: [],
      strengthFreq: {},
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
    return {
      id: career.id,
      title: career.title,
      sector: career.sector,
      avgScore: avg(scores),
    };
  }).sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);

  const strengthFreq: Record<string, number> = {};
  for (const p of profiles) {
    for (const s of p.strengths ?? []) {
      strengthFreq[s] = (strengthFreq[s] ?? 0) + 1;
    }
  }

  return { totalProfiles: n, bigFiveAvg, riasecAvg, riasecTopFreq, topCareers: careerScores, strengthFreq };
}

// ---------------------------------------------------------------------------
// CSV-eksport
// ---------------------------------------------------------------------------

export function exportToCsv(stats: AggregateStats, trafficCounts: Record<TrafficLight, number>) {
  const rows = [
    ["Metrikk", "Verdi"],
    ["Antall profiler", String(stats.totalProfiles)],
    ["Aktive (grønn)", String(trafficCounts.green)],
    ["Passive (gul)", String(trafficCounts.yellow)],
    ["Inaktive (rød)", String(trafficCounts.red)],
    [""],
    ["Big Five dimensjon", "Gjennomsnitt"],
    ["Åpenhet", String(stats.bigFiveAvg.openness)],
    ["Planmessighet", String(stats.bigFiveAvg.conscientiousness)],
    ["Utadvendthet", String(stats.bigFiveAvg.extraversion)],
    ["Medmenneskelighet", String(stats.bigFiveAvg.agreeableness)],
    ["Nevrotisisme", String(stats.bigFiveAvg.neuroticism)],
    [""],
    ["RIASEC dimensjon", "Gjennomsnitt", "Antall dominerende"],
    ...Object.entries(stats.riasecAvg).map(([k, v]) => [
      RIASEC_LABELS[k as keyof RiasecScores] ?? k,
      String(v),
      String(stats.riasecTopFreq[k as keyof RiasecScores] ?? 0),
    ]),
    [""],
    ["Topp karrierer", "Fit-score"],
    ...stats.topCareers.map((c) => [c.title, `${c.avgScore}%`]),
  ];

  const csv = rows.map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `radgiver-rapport-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
