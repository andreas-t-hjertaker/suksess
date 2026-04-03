"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { RadarChart } from "@/components/radar-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  Brain,
  Compass,
  Star,
  Sparkles,
  Share2,
  Check,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";
import { usePersonality } from "@/components/personality-provider";
import { ShareCard } from "@/components/share-card";
import type { UserProfile } from "@/types/domain";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Statiske beskrivelser
// ---------------------------------------------------------------------------

const BIG_FIVE_META: Record<
  string,
  { label: string; high: string; low: string; color: string }
> = {
  openness: {
    label: "Åpenhet",
    high: "Kreativ, nysgjerrig og åpen for nye ideer",
    low: "Praktisk, jordnær og foretrekker rutine",
    color: "text-violet-500",
  },
  conscientiousness: {
    label: "Planmessighet",
    high: "Organisert, pålitelig og målrettet",
    low: "Fleksibel, spontan og impulsiv",
    color: "text-blue-500",
  },
  extraversion: {
    label: "Utadvendthet",
    high: "Sosial, energisk og snakkesalig",
    low: "Reservert, rolig og selvforsynt",
    color: "text-amber-500",
  },
  agreeableness: {
    label: "Medmenneskelighet",
    high: "Samarbeidsvillig, varm og tillitsfull",
    low: "Direkte, kritisk og konkurranseinnstilt",
    color: "text-green-500",
  },
  neuroticism: {
    label: "Emosjonell stabilitet",
    high: "Rolig og stressmotstandsdyktig",
    low: "Sensitiv og lett for å bekymre seg",
    color: "text-rose-500",
    // NB: neuroticism vises invertert (høy score = lav neurotisisme = god stabilitet)
  },
};

const RIASEC_META: Record<
  string,
  { label: string; description: string; careers: string[]; color: string }
> = {
  realistic: {
    label: "Realistisk",
    description: "Praktisk, teknisk og konkret",
    careers: ["Ingeniør", "Elektriker", "Pilot", "Idrettstrener"],
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  investigative: {
    label: "Undersøkende",
    description: "Analytisk, vitenskapelig og intellektuell",
    careers: ["Forsker", "Lege", "Analytiker", "Matematiker"],
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  artistic: {
    label: "Artistisk",
    description: "Kreativ, ekspressiv og intuitiv",
    careers: ["Designer", "Forfatter", "Musiker", "Arkitekt"],
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  social: {
    label: "Sosial",
    description: "Hjelpende, pedagogisk og empatisk",
    careers: ["Lærer", "Sykepleier", "Psykolog", "Sosialarbeider"],
    color: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  },
  enterprising: {
    label: "Entrepren\u00f8risk",
    description: "Ledende, ambisiøs og overbevisende",
    careers: ["Leder", "Advokat", "Selger", "Gründer"],
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  conventional: {
    label: "Konvensjonell",
    description: "Strukturert, detaljorientert og systematisk",
    careers: ["Regnskapsfører", "Bibliotekar", "IT-drifter", "Revisor"],
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
};

const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  kreativitet: "Du tenker utenfor boksen og finner kreative løsninger.",
  nysgjerrighet: "Du elsker å lære og utforske nye emner i dybden.",
  lederskap: "Du inspirerer og motiverer andre til å nå sitt beste.",
  empati: "Du forstår og føler med andre på en dyp måte.",
  utholdenhet: "Du gir ikke opp og fullfører det du starter.",
  humor: "Du bringer glede og letter stemningen i enhver situasjon.",
  rettferdighet: "Du kjemper for det som er rett og rettferdig.",
};

// ---------------------------------------------------------------------------
// RIASEC Hexagon (SVG)
// ---------------------------------------------------------------------------

function RiasecHexagon({
  scores,
}: {
  scores: Record<string, number>;
}) {
  const keys = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"];
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.38;
  const labelR = size * 0.47;

  function pt(idx: number, r: number): [number, number] {
    const angle = (2 * Math.PI * idx) / 6 - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = keys.map((k, i) => pt(i, (scores[k] / 100) * outerR));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="RIASEC hexagondiagram"
      role="img"
    >
      {gridLevels.map((f) => (
        <polygon
          key={f}
          points={keys
            .map((_, i) => {
              const [x, y] = pt(i, outerR * f);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={1}
        />
      ))}
      {keys.map((_, i) => {
        const [x, y] = pt(i, outerR);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={dataPoints.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="hsl(var(--primary))"
        fillOpacity={0.22}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="hsl(var(--primary))" />
      ))}
      {keys.map((k, i) => {
        const [x, y] = pt(i, labelR);
        const dx = x - cx;
        const anchor = Math.abs(dx) < 4 ? "middle" : dx > 0 ? "start" : "end";
        return (
          <text
            key={k}
            x={x}
            y={y + 4}
            textAnchor={anchor}
            fontSize={9}
            fontWeight="600"
            fill="currentColor"
            fillOpacity={0.8}
          >
            {RIASEC_META[k].label}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Horisontal score-bar
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", color)}>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function ProfilPage() {
  const { firebaseUser, user } = useAuth();
  const { config } = usePersonality();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState<"stories" | "feed">("stories");

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToUserProfile(firebaseUser.uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  async function handleShare() {
    const url = `${window.location.origin}/profil/${firebaseUser?.uid}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast.success("Profillenke kopiert!");
    } catch {
      showToast.error("Kunne ikke kopiere lenke");
    }
  }

  if (loading) {
    return <PageSkeleton variant="grid" cards={4} />;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Ingen profil ennå</h2>
        <p className="text-muted-foreground max-w-sm">
          Fullfør personlighetstesten i onboarding for å se din profil.
        </p>
        <Link href="/dashboard">
          <Button>Gå til dashboard</Button>
        </Link>
      </div>
    );
  }

  const riasecCode = getRiasecCode(profile.riasec);
  // Topp 2 RIASEC-typer
  const topRiasec = Object.entries(profile.riasec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Big Five-aks for radar (neuroticism vises invertert)
  const bigFiveAxes = [
    { label: "Åpenhet", value: profile.bigFive.openness },
    { label: "Planmessig", value: profile.bigFive.conscientiousness },
    { label: "Utadvendt", value: profile.bigFive.extraversion },
    { label: "Medmennesk.", value: profile.bigFive.agreeableness },
    { label: "Emosj. stab.", value: 100 - profile.bigFive.neuroticism },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {user?.displayName ? `${user.displayName}s profil` : "Din profil"}
          </h1>
          <p className="text-muted-foreground">
            Din personlighetsprofil basert på Big Five og RIASEC
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            {copied ? (
              <><Check className="h-4 w-4 text-green-500" />Kopiert!</>
            ) : (
              <><Share2 className="h-4 w-4" />Del profil</>
            )}
          </Button>
        </div>
      </div>

      {/* RIASEC-kode fremhevet */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
              Din RIASEC-kode
            </p>
            <p className="text-5xl font-bold tracking-widest text-primary">{riasecCode}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              {topRiasec.map(([key]) => (
                <span
                  key={key}
                  className={cn("rounded-full px-3 py-1 text-sm font-medium", RIASEC_META[key].color)}
                >
                  {RIASEC_META[key].label} — {RIASEC_META[key].description}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Karrierer som passer:{" "}
              {topRiasec
                .flatMap(([key]) => RIASEC_META[key].careers.slice(0, 2))
                .join(", ")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diagrammer */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Big Five (OCEAN)</CardTitle>
            </div>
            <CardDescription>Personlighetsdimensjoner normalisert til 0–100</CardDescription>
          </CardHeader>
          <CardContent>
            <RadarChart axes={bigFiveAxes} size={220} className="mx-auto mb-4" />
            <div className="space-y-3">
              {Object.entries(profile.bigFive).map(([key, raw]) => {
                const meta = BIG_FIVE_META[key];
                const value = key === "neuroticism" ? 100 - raw : raw;
                const desc = value >= 60 ? meta.high : value <= 40 ? meta.low : `Balansert — ${meta.high.toLowerCase()}`;
                return (
                  <ScoreBar
                    key={key}
                    label={meta.label}
                    value={value}
                    description={desc}
                    color={meta.color}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">RIASEC-interesseprofil</CardTitle>
            </div>
            <CardDescription>Interessekoder etter Holland-modellen</CardDescription>
          </CardHeader>
          <CardContent>
            <RiasecHexagon scores={profile.riasec} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(profile.riasec)
                .sort((a, b) => b[1] - a[1])
                .map(([key, value]) => (
                  <div
                    key={key}
                    className={cn("rounded-lg p-2.5 text-xs", RIASEC_META[key].color.replace("700", "600"))}
                  >
                    <div className="font-semibold">{RIASEC_META[key].label}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="opacity-75">{RIASEC_META[key].description}</span>
                      <span className="font-bold">{value}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Styrker */}
      {profile.strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Dine topp-styrker</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {profile.strengths.map((s) => (
                <div
                  key={s}
                  className="rounded-xl border bg-muted/30 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold capitalize">{s}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {STRENGTH_DESCRIPTIONS[s] ?? ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Karriere-anbefalinger */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Karrierer som passer deg</CardTitle>
          </div>
          <CardDescription>
            Basert på din RIASEC-kode <strong>{riasecCode}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topRiasec
              .flatMap(([key]) => RIASEC_META[key].careers)
              .map((career) => (
                <Badge key={career} variant="secondary" className="text-sm py-1 px-3">
                  {career}
                </Badge>
              ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Disse karrierene er basert på din RIASEC-kode. Bruk
              karakterkalkulatoren og AI-veilederen for mer personlig rådgivning.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delbare profilkort (#80) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Del profilen din</CardTitle>
          </div>
          <CardDescription>
            Last ned som bilde og del på sosiale medier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={shareFormat === "stories" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareFormat("stories")}
            >
              Stories (9:16)
            </Button>
            <Button
              variant={shareFormat === "feed" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareFormat("feed")}
            >
              Feed (1:1)
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">RIASEC-kode</p>
              <ShareCard
                variant="riasec"
                riasec={profile.riasec}
                profileKey={config?.profileKey ?? "structured"}
                format={shareFormat}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Big Five</p>
              <ShareCard
                variant="bigfive"
                bigFive={profile.bigFive}
                clusterName={config?.profileName ?? "Strukturert"}
                description={config?.profileDescription ?? ""}
                profileKey={config?.profileKey ?? "structured"}
                format={shareFormat}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Karrierematch</p>
              <ShareCard
                variant="career"
                riasecCode={riasecCode}
                careers={topRiasec.slice(0, 3).map(([key, value]) => ({
                  name: RIASEC_META[key].careers[0],
                  matchPercent: value,
                  sector: RIASEC_META[key].description,
                }))}
                profileKey={config?.profileKey ?? "structured"}
                format={shareFormat}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
