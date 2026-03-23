"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Star,
  Brain,
  Compass,
  Zap,
} from "lucide-react";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type ShareableCardProps = {
  profile: UserProfile;
  displayName?: string | null;
  totalXp?: number;
  level?: string;
  photoURL?: string | null;
};

// ---------------------------------------------------------------------------
// RIASEC-kartlegging
// ---------------------------------------------------------------------------

const RIASEC_COLORS: Record<string, string> = {
  R: "bg-orange-500",
  I: "bg-blue-500",
  A: "bg-pink-500",
  S: "bg-green-500",
  E: "bg-yellow-500",
  C: "bg-indigo-500",
};

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistisk",
  I: "Undersøkende",
  A: "Artistisk",
  S: "Sosial",
  E: "Entrepenørisk",
  C: "Konvensjonell",
};

const RIASEC_EMOJIS: Record<string, string> = {
  R: "🔧",
  I: "🔬",
  A: "🎨",
  S: "🤝",
  E: "🚀",
  C: "📊",
};

// ---------------------------------------------------------------------------
// Profilkort-canvas (Stories 9:16-format)
// ---------------------------------------------------------------------------

function ProfileCardVisual({
  profile,
  displayName,
  totalXp,
  level,
  innerRef,
}: ShareableCardProps & { innerRef: React.RefObject<HTMLDivElement | null> }) {
  const riasecCode = profile.riasec
    ? Object.entries(profile.riasec)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([k]) => k.charAt(0).toUpperCase())
        .join("")
    : null;

  const topRiasecChars = riasecCode?.split("") ?? [];

  const bigFiveEntries = profile.bigFive
    ? [
        { label: "Åpenhet", key: "openness", value: profile.bigFive.openness },
        { label: "Planmessig", key: "cons", value: profile.bigFive.conscientiousness },
        { label: "Utadvendt", key: "extra", value: profile.bigFive.extraversion },
        { label: "Medmenn.", key: "agree", value: profile.bigFive.agreeableness },
        { label: "Stabil", key: "neuro", value: 100 - profile.bigFive.neuroticism },
      ]
    : [];

  const topStrengths = profile.strengths?.slice(0, 3) ?? [];

  // Primær RIASEC-karakter for gradient
  const primaryChar = topRiasecChars[0] ?? "I";
  const gradientClass: Record<string, string> = {
    R: "from-orange-600 via-amber-500 to-yellow-400",
    I: "from-blue-700 via-blue-500 to-cyan-400",
    A: "from-pink-700 via-pink-500 to-rose-400",
    S: "from-green-700 via-green-500 to-teal-400",
    E: "from-yellow-600 via-amber-500 to-orange-400",
    C: "from-indigo-700 via-indigo-500 to-blue-400",
  };

  return (
    <div
      ref={innerRef}
      className={cn(
        // 9:16-format — Stories
        "relative flex flex-col overflow-hidden rounded-3xl",
        "w-[270px] h-[480px]",
        "bg-gradient-to-br",
        gradientClass[primaryChar] ?? "from-primary via-violet-500 to-blue-500",
        "select-none"
      )}
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      {/* Bakgrunnsdekorasjon */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
        <div className="absolute top-1/2 right-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Innhold */}
      <div className="relative flex flex-col h-full p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
              <Star className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold tracking-wide opacity-90">Suksess</span>
          </div>
          {totalXp !== undefined && (
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
              <Zap className="h-3 w-3" />
              {totalXp} XP
            </div>
          )}
        </div>

        {/* Navn */}
        <div className="mb-4">
          <p className="text-lg font-bold leading-tight truncate">
            {displayName ?? "Ukjent bruker"}
          </p>
          {level && (
            <p className="text-xs opacity-75 capitalize mt-0.5">{level}</p>
          )}
        </div>

        {/* RIASEC-kode */}
        {riasecCode && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-2 font-semibold">
              RIASEC-profil
            </p>
            <div className="flex gap-2">
              {topRiasecChars.map((char, i) => (
                <div
                  key={char}
                  className={cn(
                    "flex flex-col items-center rounded-xl p-2.5 text-center",
                    i === 0 ? "bg-white/25" : "bg-white/12"
                  )}
                  style={{ minWidth: 56 }}
                >
                  <span className="text-xl mb-0.5">{RIASEC_EMOJIS[char]}</span>
                  <span className="text-sm font-extrabold">{char}</span>
                  <span className="text-[9px] opacity-80 leading-tight">{RIASEC_LABELS[char]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Big Five bars */}
        {bigFiveEntries.length > 0 && (
          <div className="mb-4 flex-1">
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-2 font-semibold">
              Big Five
            </p>
            <div className="space-y-1.5">
              {bigFiveEntries.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] opacity-80">{d.label}</span>
                    <span className="text-[10px] font-bold">{Math.round(d.value)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80"
                      style={{ width: `${d.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Styrker */}
        {topStrengths.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-2 font-semibold">
              Topp-styrker
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topStrengths.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold capitalize"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-white/20">
          <p className="text-[10px] opacity-60 text-center">
            suksess.no · Din karriereveileder
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deling-modal
// ---------------------------------------------------------------------------

export function ShareableProfileCard(props: ShareableCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        typeof window !== "undefined" ? window.location.origin + "/dashboard/profil" : ""
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Min karriereprofil på Suksess",
        text: `Sjekk ut karriereprofilen min! RIASEC-kode og Big Five-resultater på Suksess.`,
        url: window.location.origin + "/dashboard/profil",
      });
    } catch {
      // bruker avbrøt
    }
  }, [handleCopyLink]);

  return (
    <>
      {/* Trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Del profil
      </Button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-background rounded-2xl border shadow-2xl p-6 flex flex-col items-center gap-6 max-w-sm w-full animate-in slide-in-from-bottom-4 duration-300">
            {/* Lukk */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Lukk"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-base font-semibold">Del din karriereprofil</h2>

            {/* Profilkort-preview */}
            <ProfileCardVisual {...props} innerRef={cardRef} />

            {/* Del-handlinger */}
            <div className="flex flex-col gap-2 w-full">
              <Button className="w-full gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Del profilkort
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
                {copied ? (
                  <><Check className="h-4 w-4 text-green-500" />Lenke kopiert!</>
                ) : (
                  <><Copy className="h-4 w-4" />Kopier lenke</>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Del karriereprofilen din med venner og fremtidige arbeidsgivere
            </p>
          </div>
        </div>
      )}
    </>
  );
}
