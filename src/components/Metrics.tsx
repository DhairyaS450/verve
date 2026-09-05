import clsx from "clsx";
import type { Scores } from "@/lib/types";
import { fmt1 } from "@/lib/format";

/** Big number + label + optional delta vs last. lowerIsBetter flips the color logic. */
export function Metric({
  value,
  unit,
  label,
  delta,
  lowerIsBetter,
  size = "md",
  className,
  hint,
}: {
  value: string;
  unit?: string;
  label: string;
  delta?: number | null;
  lowerIsBetter?: boolean;
  size?: "md" | "lg" | "xl";
  className?: string;
  hint?: string;
}) {
  const good = delta === undefined || delta === null || delta === 0 ? null : lowerIsBetter ? delta < 0 : delta > 0;
  const sizes = { md: "text-[40px]", lg: "text-[56px] md:text-[72px]", xl: "text-[72px] md:text-[112px]" };
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="label">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={clsx("metric", sizes[size])}>{value}</span>
        {unit && <span className="text-[13px] text-ink-2">{unit}</span>}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={clsx("mt-1 text-[13px] num font-medium", good === null ? "text-ink-3" : good ? "text-good" : "text-accent")}>
          {delta > 0 ? "+" : delta < 0 ? "−" : ""}
          {Number.isInteger(delta) ? Math.abs(delta) : fmt1(Math.abs(delta))} <span className="text-ink-3 font-normal">vs last</span>
        </div>
      )}
      {hint && <div className="mt-1 text-[12px] text-ink-3">{hint}</div>}
    </div>
  );
}

const SCORE_LABELS: { key: keyof Scores; label: string }[] = [
  { key: "clarity", label: "Clarity" },
  { key: "structure", label: "Structure" },
  { key: "vocalVariety", label: "Vocal variety" },
  { key: "energy", label: "Energy" },
  { key: "presence", label: "Presence" },
  { key: "engagement", label: "Engagement" },
];

export function ScoreBars({ scores, previous, className }: { scores: Scores; previous?: Scores | null; className?: string }) {
  return (
    <div className={clsx("space-y-3", className)}>
      {SCORE_LABELS.map(({ key, label }) => {
        const v = scores[key];
        const p = previous?.[key];
        const d = p !== undefined && p !== null ? Math.round((v - p) * 10) / 10 : null;
        return (
          <div key={key} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
            <span className="text-[13px] text-ink-2">{label}</span>
            <div className="h-[6px] bg-paper-3 relative">
              <div className="h-full bg-ink" style={{ width: `${(v / 10) * 100}%` }} />
              {p !== undefined && p !== null && <div className="absolute top-[-3px] w-[2px] h-[12px] bg-ink-3" style={{ left: `calc(${(p / 10) * 100}% - 1px)` }} />}
            </div>
            <span className="num text-[13px] w-[64px] text-right">
              <span className="font-semibold">{fmt1(v)}</span>
              {d !== null && d !== 0 && <span className={clsx("ml-1", d > 0 ? "text-good" : "text-accent")}>{d > 0 ? "+" : "−"}{fmt1(Math.abs(d))}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function paceHint(wpm: number): string {
  if (wpm < 110) return "Dragging. Aim 120–160.";
  if (wpm > 175) return "Rushed. Aim 120–160.";
  if (wpm > 160) return "Slightly fast.";
  return "In the zone.";
}

export function fillerHint(perMin: number): string {
  if (perMin <= 1) return "Elite.";
  if (perMin <= 4) return "Good. Under 1 is elite.";
  if (perMin <= 7) return "Average. Aim under 4.";
  return "Hurting credibility.";
}
