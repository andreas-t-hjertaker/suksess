"use client";

/**
 * Delbare profilkort — Instagram Stories-format (1080×1920)
 * Genererer PNG fra HTML via html2canvas (lazy-loaded).
 * Issue #80
 */

import { useRef, useState, useCallback } from "react";
import { RadarChart } from "./radar-chart";
import type {
  BigFiveScores,
  RiasecScores,
} from "@/types/domain";

// ─── Typer ──────────────────────────────────────────────────────────────────

export type ShareCardVariant = "riasec" | "bigfive" | "career" | "progress";

type BaseCardProps = {
  profileKey: "creative" | "social" | "analytic" | "structured";
  format?: "stories" | "feed";
};

type RiasecCardProps = BaseCardProps & {
  variant: "riasec";
  riasec: RiasecScores;
};

type BigFiveCardProps = BaseCardProps & {
  variant: "bigfive";
  bigFive: BigFiveScores;
  clusterName: string;
  description: string;
};

type CareerCardProps = BaseCardProps & {
  variant: "career";
  riasecCode: string;
  careers: Array<{ name: string; matchPercent: number; sector: string }>;
};

type ProgressCardProps = BaseCardProps & {
  variant: "progress";
  level: number;
  xp: number;
  streak: number;
  badge?: string;
};

export type ShareCardProps =
  | RiasecCardProps
  | BigFiveCardProps
  | CareerCardProps
  | ProgressCardProps;

// ─── Fargepaletter per profil ───────────────────────────────────────────────

const GRADIENTS: Record<string, { from: string; via: string; to: string }> = {
  creative: { from: "#7c3aed", via: "#a855f7", to: "#ec4899" },
  social: { from: "#059669", via: "#14b8a6", to: "#06b6d4" },
  analytic: { from: "#2563eb", via: "#6366f1", to: "#8b5cf6" },
  structured: { from: "#475569", via: "#6366f1", to: "#3b82f6" },
};

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistisk",
  I: "Undersøkende",
  A: "Kunstnerisk",
  S: "Sosial",
  E: "Enterprising",
  C: "Konvensjonell",
};

const RIASEC_COLORS: Record<string, string> = {
  R: "#10b981",
  I: "#3b82f6",
  A: "#8b5cf6",
  S: "#ec4899",
  E: "#f59e0b",
  C: "#14b8a6",
};

// ─── Hjelpefunksjoner ───────────────────────────────────────────────────────

function getRiasecCode(scores: RiasecScores, top = 3): string {
  const entries = Object.entries(scores) as [string, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([key]) => key.charAt(0).toUpperCase())
    .join("");
}

function getTopBigFive(scores: BigFiveScores, top = 2) {
  const labels: Record<string, string> = {
    openness: "Åpenhet",
    conscientiousness: "Planmessighet",
    extraversion: "Ekstroversjon",
    agreeableness: "Medmenneskelighet",
    neuroticism: "Nevrotisisme",
  };
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([key, val]) => ({ label: labels[key] ?? key, value: val }));
}

// ─── Kortkomponenter ────────────────────────────────────────────────────────

function CardShell({
  profileKey,
  format = "stories",
  children,
}: {
  profileKey: string;
  format: "stories" | "feed";
  children: React.ReactNode;
}) {
  const grad = GRADIENTS[profileKey] ?? GRADIENTS.structured;
  const isStories = format === "stories";

  return (
    <div
      style={{
        width: isStories ? 1080 : 1080,
        height: isStories ? 1920 : 1080,
        background: `linear-gradient(135deg, ${grad.from}, ${grad.via}, ${grad.to})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dekorativ bakgrunnseffekt */}
      <div
        style={{
          position: "absolute",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }}
      />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          S
        </div>
        <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Suksess
        </span>
      </div>

      {/* Innhold */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 1 }}>
        {children}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            display: "inline-block",
            padding: "16px 40px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Finn din profil på suksess.no
        </div>
      </div>
    </div>
  );
}

function RiasecCard({ riasec, profileKey, format = "stories" }: RiasecCardProps) {
  const code = getRiasecCode(riasec);
  const riasecAxes = [
    { label: "R", value: riasec.realistic },
    { label: "I", value: riasec.investigative },
    { label: "A", value: riasec.artistic },
    { label: "S", value: riasec.social },
    { label: "E", value: riasec.enterprising },
    { label: "C", value: riasec.conventional },
  ];

  return (
    <CardShell profileKey={profileKey} format={format}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 28, opacity: 0.8, marginBottom: 24 }}>Min RIASEC-kode</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 48 }}>
          {code.split("").map((letter, i) => (
            <div
              key={i}
              style={{
                width: 140,
                height: 140,
                borderRadius: 28,
                background: RIASEC_COLORS[letter] ?? "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <span style={{ fontSize: 64, fontWeight: 800 }}>{letter}</span>
              <span style={{ fontSize: 16, opacity: 0.9 }}>
                {RIASEC_LABELS[letter]}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RadarChart axes={riasecAxes} size={400} />
        </div>
      </div>
    </CardShell>
  );
}

function BigFiveCard({
  bigFive,
  clusterName,
  description,
  profileKey,
  format = "stories",
}: BigFiveCardProps) {
  const topTwo = getTopBigFive(bigFive);
  const axes = [
    { label: "Åpenhet", value: bigFive.openness },
    { label: "Planm.", value: bigFive.conscientiousness },
    { label: "Ekstra.", value: bigFive.extraversion },
    { label: "Medm.", value: bigFive.agreeableness },
    { label: "Stabil.", value: 100 - bigFive.neuroticism },
  ];

  return (
    <CardShell profileKey={profileKey} format={format}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 28, opacity: 0.8, marginBottom: 16 }}>Min personlighetsprofil</p>
        <div
          style={{
            display: "inline-block",
            padding: "12px 32px",
            borderRadius: 100,
            background: "rgba(255,255,255,0.2)",
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          {clusterName}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <RadarChart axes={axes} size={380} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
          {topTwo.map((t) => (
            <div
              key={t.label}
              style={{
                padding: "16px 24px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.15)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 800 }}>{t.value}%</div>
              <div style={{ fontSize: 20, opacity: 0.8 }}>{t.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 24, opacity: 0.8, maxWidth: 700, margin: "0 auto" }}>
          {description}
        </p>
      </div>
    </CardShell>
  );
}

function CareerCard({
  riasecCode,
  careers,
  profileKey,
  format = "stories",
}: CareerCardProps) {
  return (
    <CardShell profileKey={profileKey} format={format}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 28, opacity: 0.8, marginBottom: 16 }}>
          Min topp karrierematch
        </p>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: "0.1em",
            marginBottom: 48,
          }}
        >
          {riasecCode}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {careers.slice(0, 3).map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "24px 32px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.15)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 20, opacity: 0.7 }}>{c.sector}</div>
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  background: "rgba(255,255,255,0.2)",
                  padding: "8px 20px",
                  borderRadius: 12,
                }}
              >
                {c.matchPercent}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function ProgressCard({
  level,
  xp,
  streak,
  badge,
  profileKey,
  format = "stories",
}: ProgressCardProps) {
  return (
    <CardShell profileKey={profileKey} format={format}>
      <div style={{ textAlign: "center" }}>
        {badge && (
          <div style={{ fontSize: 96, marginBottom: 24 }}>{badge}</div>
        )}
        <p style={{ fontSize: 28, opacity: 0.8, marginBottom: 40 }}>
          Min fremgang
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 40 }}>
          <div
            style={{
              padding: "32px 40px",
              borderRadius: 28,
              background: "rgba(255,255,255,0.15)",
              textAlign: "center",
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 800 }}>{level}</div>
            <div style={{ fontSize: 20, opacity: 0.7 }}>Level</div>
          </div>
          <div
            style={{
              padding: "32px 40px",
              borderRadius: 28,
              background: "rgba(255,255,255,0.15)",
              textAlign: "center",
              minWidth: 160,
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 800 }}>
              {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp}
            </div>
            <div style={{ fontSize: 20, opacity: 0.7 }}>XP</div>
          </div>
        </div>
        {streak > 0 && (
          <div
            style={{
              display: "inline-block",
              padding: "20px 48px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.2)",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {streak} dager p&aring; rad!
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ─── Render-switch ──────────────────────────────────────────────────────────

function ShareCardContent(props: ShareCardProps) {
  switch (props.variant) {
    case "riasec":
      return <RiasecCard {...props} />;
    case "bigfive":
      return <BigFiveCard {...props} />;
    case "career":
      return <CareerCard {...props} />;
    case "progress":
      return <ProgressCard {...props} />;
  }
}

// ─── Hoved-komponent med eksport/deling ─────────────────────────────────────

export function ShareCard(props: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const format = props.format ?? "stories";

  const exportCard = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        width: 1080,
        height: format === "stories" ? 1920 : 1080,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `suksess-${props.variant}.png`, {
          type: "image/png",
        });

        // Web Share API for mobil
        if (
          typeof navigator !== "undefined" &&
          navigator.canShare?.({ files: [file] })
        ) {
          try {
            await navigator.share({
              files: [file],
              title: "Min Suksess-profil",
              text: "Se min personlighetsprofil fra Suksess!",
            });
            return;
          } catch {
            // Bruker avbrøt — fall gjennom til nedlasting
          }
        }

        // Fallback: last ned PNG
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `suksess-${props.variant}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, format, props.variant]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Forhåndsvisning (nedskalert) */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl"
        style={{
          width: format === "stories" ? 270 : 320,
          height: format === "stories" ? 480 : 320,
        }}
      >
        <div
          style={{
            transform: `scale(${format === "stories" ? 270 / 1080 : 320 / 1080})`,
            transformOrigin: "top left",
          }}
        >
          <div ref={cardRef}>
            <ShareCardContent {...props} />
          </div>
        </div>
      </div>

      {/* Del-knapp */}
      <button
        onClick={exportCard}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        aria-label={`Del ${props.variant}-kort`}
      >
        {isExporting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Genererer...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Del profil
          </>
        )}
      </button>
    </div>
  );
}
