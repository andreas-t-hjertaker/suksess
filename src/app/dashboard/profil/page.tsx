"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { BIG_FIVE_META, RIASEC_META, STRENGTH_DESCRIPTIONS } from "@/lib/personality/riasec-meta";
import { RadarChart } from "@/components/radar-chart";
import { RiasecHexagon } from "@/components/riasec-hexagon";
import { ScoreBar } from "@/components/score-bar";
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
import { ErrorState } from "@/components/error-state";
import { showToast } from "@/lib/toast";
import { usePersonality } from "@/components/personality-provider";
import { ShareCard } from "@/components/share-card";
import type { UserProfile } from "@/types/domain";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function ProfilPage() {
  const { firebaseUser, user } = useAuth();
  const { config } = usePersonality();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState<"stories" | "feed">("stories");

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToUserProfile(
      firebaseUser.uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      (err) => {
        console.error("[Profil] Feil ved lasting av profil:", err);
        setLoadError("Kunne ikke laste profilen din. Prøv igjen senere.");
        setLoading(false);
      }
    );
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

  if (loadError) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Ingen profil ennå</h2>
        <p className="text-muted-foreground max-w-sm">
          Fullfør personlighetstesten i onboarding for å se din profil.
        </p>
        <Link href="/onboarding">
          <Button>Start personlighetstest</Button>
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
              <><Check className="h-4 w-4 text-green-500 dark:text-green-400" />Kopiert!</>
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
          <div className="flex gap-2 mb-6" role="group" aria-label="Velg delingsformat">
            <Button
              variant={shareFormat === "stories" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareFormat("stories")}
              aria-pressed={shareFormat === "stories"}
            >
              Stories (9:16)
            </Button>
            <Button
              variant={shareFormat === "feed" ? "default" : "outline"}
              size="sm"
              onClick={() => setShareFormat("feed")}
              aria-pressed={shareFormat === "feed"}
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
