"use client";

import clsx from "clsx";
import { mmss } from "@/lib/format";

/** Big tabular clock with a hairline progress track. */
export function Timer({
  seconds,
  total,
  label,
  className,
  accent,
  countUp,
}: {
  seconds: number;
  total: number;
  label?: string;
  className?: string;
  accent?: boolean;
  countUp?: boolean;
}) {
  const frac = total > 0 ? Math.min(1, Math.max(0, seconds / total)) : 0;
  const shown = countUp ? seconds : Math.max(0, total - seconds);
  return (
    <div className={clsx("w-full", className)}>
      <div className="flex items-end justify-between">
        {label ? <span className="label">{label}</span> : <span />}
        <span className={clsx("metric text-[44px] md:text-[56px]", accent ? "text-accent" : "text-ink")}>{mmss(shown)}</span>
      </div>
      <div className="h-[2px] bg-paper-3 mt-3">
        <div className={clsx("h-full transition-[width] duration-200 ease-linear", accent ? "bg-accent" : "bg-ink")} style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  );
}
