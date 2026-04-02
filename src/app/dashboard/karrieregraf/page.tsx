"use client";

/**
 * Karrierestiutforsker med branching-graf (issue #12)
 * SVG-basert interaktiv karrieregraf med fit-score fargekodet etter profil.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useXp } from "@/hooks/use-xp";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { CAREER_NODES, calcFitScore } from "@/lib/karriere/data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import {
  TrendingUp,
  GraduationCap,
  DollarSign,
  ChevronRight,
  Info,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { UserProfile } from "@/types/domain";
import type { CareerNode } from "@/lib/karriere/data";

// ---------------------------------------------------------------------------
// Graf-konstruksjon
// ---------------------------------------------------------------------------

const RIASEC_LABELS: Record<string, string> = {
  realistic: "Realistisk (R)",
  investigative: "Undersøkende (I)",
  artistic: "Artistisk (A)",
  social: "Sosial (S)",
  enterprising: "Entreprenørisk (E)",
  conventional: "Konvensjonell (C)",
};

const RIASEC_COLORS: Record<string, string> = {
  realistic: "#10b981",
  investigative: "#3b82f6",
  artistic: "#8b5cf6",
  social: "#ec4899",
  enterprising: "#f59e0b",
  conventional: "#14b8a6",
};

const SECTOR_ORDER = [
  "Teknologi",
  "Helse",
  "Økonomi",
  "Pedagogikk",
  "Kreativitet",
  "Jus/stat",
  "Naturvitenskap",
  "Håndverk",
  "Samfunn",
];

// ---------------------------------------------------------------------------
// Fit-score → farge
// ---------------------------------------------------------------------------

function fitColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function fitBg(score: number): string {
  if (score >= 70) return "#dcfce7";
  if (score >= 40) return "#fef9c3";
  return "#fee2e2";
}

// ---------------------------------------------------------------------------
// SVG Branching Graf (radial tree)
// ---------------------------------------------------------------------------

type GrafNode = {
  id: string;
  label: string;
  type: "root" | "sector" | "career";
  x: number;
  y: number;
  score?: number;
  career?: CareerNode;
  color?: string;
};

type GrafEdge = {
  from: string;
  to: string;
};

function buildGraph(
  careers: CareerNode[],
  riasecScores: UserProfile["riasec"] | null
): { nodes: GrafNode[]; edges: GrafEdge[] } {
  const nodes: GrafNode[] = [];
  const edges: GrafEdge[] = [];

  const W = 900;
  const H = 680;
  const cx = W / 2;
  const cy = H / 2;

  // Root
  nodes.push({ id: "root", label: "Din profil", type: "root", x: cx, y: cy });

  // Grupper karrierer etter sektor
  const bySector: Record<string, CareerNode[]> = {};
  for (const c of careers) {
    if (!bySector[c.sector]) bySector[c.sector] = [];
    bySector[c.sector].push(c);
  }

  const sectors = Object.keys(bySector).sort(
    (a, b) => SECTOR_ORDER.indexOf(a) - SECTOR_ORDER.indexOf(b)
  );

  const sectorCount = sectors.length;
  const sectorR = 200;
  const careerR = 320;

  sectors.forEach((sector, si) => {
    const angle = (2 * Math.PI * si) / sectorCount - Math.PI / 2;
    const sx = cx + sectorR * Math.cos(angle);
    const sy = cy + sectorR * Math.sin(angle);

    nodes.push({
      id: `sector-${sector}`,
      label: sector,
      type: "sector",
      x: sx,
      y: sy,
      color: RIASEC_COLORS[Object.keys(RIASEC_LABELS)[si % 6]] ?? "#6b7280",
    });
    edges.push({ from: "root", to: `sector-${sector}` });

    const sectorCareers = bySector[sector].slice(0, 4);
    sectorCareers.forEach((career, ci) => {
      const spread = 0.5;
      const careerAngle = angle + spread * ((ci / (sectorCareers.length - 1 || 1)) - 0.5);
      const crx = cx + careerR * Math.cos(careerAngle);
      const cry = cy + careerR * Math.sin(careerAngle);

      const score = riasecScores ? calcFitScore(career, riasecScores) : 50;

      nodes.push({
        id: career.id,
        label: career.title,
        type: "career",
        x: crx,
        y: cry,
        score,
        career,
      });
      edges.push({ from: `sector-${sector}`, to: career.id });
    });
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KarriereGrafPage() {
  const { user } = useAuth();
  const { earnXp } = useXp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<"alle" | "topp" | "god">("alle");

  const selectCareer = useCallback((career: CareerNode | null) => {
    if (career) earnXp("career_path_viewed");
    setSelectedCareer(career);
  }, [earnXp]);

  useEffect(() => {
    if (!user) return;
    setProfileError(null);
    try {
      const unsub = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setProfileLoading(false);
      });
      return unsub;
    } catch (err) {
      setProfileError(err instanceof Error ? err : new Error("Kunne ikke laste profil"));
      setProfileLoading(false);
    }
  }, [user]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  const filteredCareers = useMemo(() => {
    if (!profile?.riasec) return CAREER_NODES;
    const scored = CAREER_NODES.map((c) => ({
      ...c,
      score: calcFitScore(c, profile.riasec),
    }));
    if (filter === "topp") return scored.filter((c) => c.score >= 70);
    if (filter === "god") return scored.filter((c) => c.score >= 40);
    return scored;
  }, [profile, filter]);

  const { nodes, edges } = useMemo(
    () => buildGraph(filteredCareers, profile?.riasec ?? null),
    [filteredCareers, profile]
  );

  const W = 900;
  const H = 680;

  if (profileLoading) {
    return <PageSkeleton variant="grid" cards={4} />;
  }

  if (profileError) {
    return <ErrorState message={profileError.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Karrieregraf</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Utforsk karriereveier visuelt. Fargekodet etter match med din RIASEC-profil
          {riasecCode ? ` (${riasecCode})` : ""}.
        </p>
      </div>

      {/* Kontroller */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["alle", "god", "topp"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f === "alle" ? "Alle karrierer" : f === "god" ? "≥ 40% match" : "≥ 70% match (topp)"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} aria-label="Zoom inn">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} aria-label="Zoom ut">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => setZoom(1)} aria-label="Nullstill zoom">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Forklaring */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground items-center">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Farger: </span>
        {[
          { color: "#22c55e", label: "Sterk match (≥70%)" },
          { color: "#eab308", label: "God match (40–70%)" },
          { color: "#ef4444", label: "Svak match (<40%)" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: l.color }} aria-hidden="true" />
            {l.label}
          </span>
        ))}
        <span className="ml-2">Klikk på en karriere for detaljer.</span>
      </div>

      {/* SVG Graf */}
      <div className="w-full overflow-auto rounded-xl border bg-muted/20" style={{ maxHeight: "70vh" }}>
        <svg
          width={W * zoom}
          height={H * zoom}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block" }}
          role="img"
          aria-label="Karrieregraf med branching-vis"
        >
          {/* Kanter */}
          {edges.map((e) => {
            const from = nodes.find((n) => n.id === e.from);
            const to = nodes.find((n) => n.id === e.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${e.from}-${e.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e5e7eb"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Noder */}
          {nodes.map((node) => {
            if (node.type === "root") {
              return (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={36} fill="#7c3aed" />
                  <text x={node.x} y={node.y - 4} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
                    Din
                  </text>
                  <text x={node.x} y={node.y + 8} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
                    profil
                  </text>
                </g>
              );
            }

            if (node.type === "sector") {
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={26}
                    fill={node.color ?? "#6b7280"}
                    opacity={0.85}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize={8}
                    fill="white"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                </g>
              );
            }

            // Career node
            const score = node.score ?? 50;
            const color = fitColor(score);
            const bg = fitBg(score);
            const career = node.career!;

            return (
              <g
                key={node.id}
                onClick={() => selectCareer(career)}
                className="cursor-pointer"
                role="button"
                aria-label={`${node.label} — ${score}% match`}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && selectCareer(career)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={20}
                  fill={bg}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={node.x}
                  y={node.y - 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#1f2937"
                >
                  {node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 8}
                  textAnchor="middle"
                  fontSize={7}
                  fill={color}
                  fontWeight="bold"
                >
                  {score}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detalj-panel */}
      <Sheet open={!!selectedCareer} onOpenChange={(open) => !open && selectCareer(null)}>
        <SheetContent>
          {selectedCareer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCareer.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {profile?.riasec && (
                  <div className="rounded-xl p-3 text-center" style={{
                    backgroundColor: fitBg(calcFitScore(selectedCareer, profile.riasec)),
                  }}>
                    <p className="text-2xl font-bold" style={{ color: fitColor(calcFitScore(selectedCareer, profile.riasec)) }}>
                      {calcFitScore(selectedCareer, profile.riasec)}%
                    </p>
                    <p className="text-xs text-muted-foreground">match med din profil</p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">{selectedCareer.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" aria-hidden="true" />
                    <span>Medianlønn: <strong>{(selectedCareer.medianSalary / 1000).toFixed(0)} 000 kr/år</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-blue-500" aria-hidden="true" />
                    <span>Utdanning: <strong>{selectedCareer.educationLevel}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
                    <span>Etterspørsel: <Badge variant="outline" className="text-xs">{selectedCareer.demand}</Badge></span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Utdanningsveier</p>
                  <ul className="space-y-1">
                    {selectedCareer.educationPaths.map((p) => (
                      <li key={p} className="flex items-start gap-1.5 text-sm">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedCareer.advancesTo && selectedCareer.advancesTo.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Videreutvikling</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCareer.advancesTo.map((id) => {
                        const next = CAREER_NODES.find((c) => c.id === id);
                        return next ? (
                          <Badge key={id} variant="secondary" className="text-xs cursor-pointer" onClick={() => selectCareer(next)}>
                            {next.title}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
