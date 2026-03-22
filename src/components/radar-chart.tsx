"use client";

/**
 * SVG-basert radardiagram (spider chart) for Big Five og RIASEC.
 * Ingen ekstern avhengighet — ren SVG + React.
 */

type Axis = {
  label: string;
  value: number; // 0–100
  color?: string;
};

type RadarChartProps = {
  axes: Axis[];
  size?: number;
  className?: string;
};

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleIndex: number,
  total: number
): [number, number] {
  // Start øverst (-π/2) og gå med klokken
  const angle = (2 * Math.PI * angleIndex) / total - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function RadarChart({ axes, size = 260, className }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.38;
  const labelR = size * 0.48;
  const levels = 4;
  const n = axes.length;

  // Grid-polygoner
  const gridPolygons = Array.from({ length: levels }, (_, lvl) => {
    const r = (outerR * (lvl + 1)) / levels;
    const points = Array.from({ length: n }, (__, i) => {
      const [x, y] = polarToCartesian(cx, cy, r, i, n);
      return `${x},${y}`;
    }).join(" ");
    return points;
  });

  // Akselinjer
  const axisLines = Array.from({ length: n }, (_, i) => {
    const [x, y] = polarToCartesian(cx, cy, outerR, i, n);
    return { x, y };
  });

  // Datapunkter
  const dataPoints = axes.map((axis, i) => {
    const r = (axis.value / 100) * outerR;
    return polarToCartesian(cx, cy, r, i, n);
  });
  const polygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");

  // Etiketter
  const labels = axes.map((axis, i) => {
    const [x, y] = polarToCartesian(cx, cy, labelR, i, n);
    return { x, y, label: axis.label, value: axis.value };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Radardiagram for personlighetsprofil"
    >
      {/* Grid */}
      {gridPolygons.map((points, lvl) => (
        <polygon
          key={lvl}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Akselinjer */}
      {axisLines.map(({ x, y }, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />
      ))}

      {/* Datafelt */}
      <polygon
        points={polygonPoints}
        fill="hsl(var(--primary))"
        fillOpacity={0.25}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Datapunkter */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="hsl(var(--primary))" />
      ))}

      {/* Etiketter */}
      {labels.map(({ x, y, label, value }, i) => {
        const dx = x - cx;
        const dy = y - cy;
        const anchor =
          Math.abs(dx) < 5 ? "middle" : dx > 0 ? "start" : "end";
        const offsetX = dx < -2 ? -6 : dx > 2 ? 6 : 0;
        const offsetY = dy < -2 ? -6 : dy > 2 ? 14 : 0;
        return (
          <g key={i}>
            <text
              x={x + offsetX}
              y={y + offsetY}
              textAnchor={anchor}
              fontSize={size * 0.045}
              fontWeight="600"
              fill="currentColor"
              fillOpacity={0.85}
            >
              {label}
            </text>
            <text
              x={x + offsetX}
              y={y + offsetY + size * 0.045}
              textAnchor={anchor}
              fontSize={size * 0.038}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
