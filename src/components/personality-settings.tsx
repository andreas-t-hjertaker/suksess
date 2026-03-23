"use client";

/**
 * PersonalitySettings — lar brukeren se og overstyre sin automatiske UI-profil.
 * Vises i innstillinger-siden.
 */

import { usePersonality } from "@/components/personality-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  AnimationIntensity,
  LayoutDensity,
  InfoDensity,
  ToneOfVoice,
} from "@/lib/personality/engine";
import { Sparkles, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ANIMATION_OPTIONS: { value: AnimationIntensity; label: string }[] = [
  { value: "none", label: "Ingen" },
  { value: "subtle", label: "Subtil" },
  { value: "moderate", label: "Moderat" },
  { value: "rich", label: "Rik" },
];

const LAYOUT_OPTIONS: { value: LayoutDensity; label: string }[] = [
  { value: "compact", label: "Kompakt" },
  { value: "comfortable", label: "Komfortabel" },
  { value: "spacious", label: "Luftig" },
];

const INFO_DENSITY_OPTIONS: { value: InfoDensity; label: string }[] = [
  { value: "minimal", label: "Enkel" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detaljert" },
];

const TONE_OPTIONS: { value: ToneOfVoice; label: string }[] = [
  { value: "formal", label: "Formell" },
  { value: "friendly", label: "Vennlig" },
  { value: "direct", label: "Direkte" },
  { value: "encouraging", label: "Oppmuntrende" },
];

export function PersonalitySettings() {
  const { config, profile, overrideConfig, resetOverride } = usePersonality();

  if (!profile) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Personalisert UI</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={resetOverride} className="h-7 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            Tilbakestill
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {config.profileName}
          </span>
          <span className="text-xs text-muted-foreground">{config.profileDescription}</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Animasjoner</p>
          <div className="flex gap-2">
            {ANIMATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => overrideConfig({ animationIntensity: opt.value })}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  config.animationIntensity === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Layout-tetthet</p>
          <div className="flex gap-2">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => overrideConfig({ layoutDensity: opt.value })}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  config.layoutDensity === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Informasjonstetthet</p>
          <div className="flex gap-2">
            {INFO_DENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => overrideConfig({ infoDensity: opt.value })}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  config.infoDensity === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Tone-of-voice (AI-veileder)</p>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => overrideConfig({ toneOfVoice: opt.value })}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors text-left",
                  config.toneOfVoice === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            UI-en tilpasses automatisk basert på din Big Five-profil. Du kan overstyre enkeltvalg manuelt — endringer lagres lokalt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Navigasjon: {config.navigationStyle === "exploratory" ? "Utforskende" : "Lineær"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {config.profileName}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
