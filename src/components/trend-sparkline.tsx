/**
 * TrendSparkline — SVG sparkline for poenggrense-trender (#107).
 *
 * Brukes i søknadscoach og studier-anbefalinger for å vise
 * historisk utvikling av opptakspoeng.
 */

export type TrendEntry = {
  year: number;
  required: number;
  top: number;
};

export function TrendSparkline({
  data,
  width = 120,
  height = 32,
}: {
  data: TrendEntry[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const W = width;
  const H = height;
  const PAD = 4;

  const allReq = data.map((d) => d.required);
  const minV = Math.min(...allReq) - 1;
  const maxV = Math.max(...allReq) + 1;

  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) =>
    H - PAD - ((v - minV) / (maxV - minV)) * (H - PAD * 2);

  const last = data[data.length - 1];
  const first = data[0];
  const rising = last.required > first.required;

  return (
    <svg
      width={W}
      height={H}
      className="shrink-0"
      role="img"
      aria-label={`Poenggrense-trend: ${rising ? "stigende" : "synkende/stabil"}`}
    >
      <polyline
        points={data.map((d, i) => `${x(i)},${y(d.required)}`).join(" ")}
        fill="none"
        stroke={rising ? "rgb(34,197,94)" : "rgb(239,68,68)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(data.length - 1)}
        cy={y(last.required)}
        r={2.5}
        fill={rising ? "rgb(34,197,94)" : "rgb(239,68,68)"}
      />
    </svg>
  );
}
