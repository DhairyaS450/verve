import clsx from "clsx";

export interface TrendPoint {
  x: string; // date label
  y: number;
}

/**
 * Swiss line chart. One series, hairline grid, optional target band.
 * Pure SVG, no library.
 */
export function TrendChart({
  points,
  band,
  lowerIsBetter,
  unit,
  className,
  height = 180,
  max,
}: {
  points: TrendPoint[];
  band?: [number, number];
  lowerIsBetter?: boolean;
  unit?: string;
  className?: string;
  height?: number;
  max?: number;
}) {
  const W = 600;
  const H = height;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const ys = points.map((p) => p.y);
  const yMax = Math.max(max ?? 0, ...ys, band?.[1] ?? 0, 1) * 1.15;
  const yMin = 0;
  const sx = (i: number) => (points.length <= 1 ? padL + (W - padL - padR) / 2 : padL + (i / (points.length - 1)) * (W - padL - padR));
  const sy = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const ticks = [0, yMax / 2, yMax].map((v) => Math.round(v * 10) / 10);
  const last = points[points.length - 1];
  const first = points[0];
  const improved = last && first && points.length > 1 ? (lowerIsBetter ? last.y < first.y : last.y > first.y) : null;

  return (
    <div className={clsx("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="trend chart">
        {band && (
          <rect x={padL} y={sy(band[1])} width={W - padL - padR} height={Math.max(1, sy(band[0]) - sy(band[1]))} fill="var(--good-soft)" />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-body)">
              {t}
            </text>
          </g>
        ))}
        {points.length > 1 && <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={sx(i)} cy={sy(p.y)} r={i === points.length - 1 ? 4.5 : 3} fill={i === points.length - 1 ? "var(--accent)" : "var(--ink)"} />
            {(i === 0 || i === points.length - 1 || points.length <= 6) && (
              <text x={sx(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-body)">
                {p.x}
              </text>
            )}
          </g>
        ))}
      </svg>
      {last && (
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-[12px] text-ink-3">{band ? `Target ${band[0]}–${band[1]}${unit ? " " + unit : ""}` : ""}</span>
          <span className={clsx("num text-[13px] font-medium", improved === null ? "text-ink-2" : improved ? "text-good" : "text-accent")}>
            Latest {Math.round(last.y * 10) / 10}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
