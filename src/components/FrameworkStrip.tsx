import clsx from "clsx";
import type { Framework } from "@/content/types";

/** Compact horizontal framework: numbered steps on a hairline. */
export function FrameworkStrip({ framework, compact, active, className }: { framework: Framework; compact?: boolean; active?: number; className?: string }) {
  return (
    <div className={clsx("w-full", className)}>
      <div className="flex items-baseline justify-between">
        <span className="label">Framework</span>
        <span className="font-display text-[15px]">{framework.name}</span>
      </div>
      <ol className={clsx("mt-3 grid gap-x-4 gap-y-3", compact ? "grid-flow-col auto-cols-fr" : "grid-cols-1 md:grid-flow-col md:auto-cols-fr")}>
        {framework.steps.map((s, i) => (
          <li key={s.label} className={clsx("border-t pt-2", active === i ? "border-ink" : "border-line")}>
            <div className="flex items-baseline gap-2">
              <span className="num text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className={clsx("font-display text-[15px] leading-tight", active !== undefined && active !== i ? "text-ink-2" : "text-ink")}>{s.label}</span>
            </div>
            {!compact && <p className="text-[13px] text-ink-2 mt-1 leading-snug">{s.hint}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
