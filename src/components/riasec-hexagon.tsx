"use client";

/**
 * RIASEC hexagondiagram (SVG) — viser 6 interessekoder som radar-polygon.
 * Ekstrahert fra profil-side (#169).
 */

import { RIASEC_META } from "@/lib/personality/riasec-meta";

export function RiasecHexagon({
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
