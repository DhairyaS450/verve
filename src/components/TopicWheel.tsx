"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * "Spin" a topic: rapid ticker that decelerates and lands on `final`.
 * Swiss: no wheel graphic. A vertical ticker of type.
 */
export function TopicWheel({ candidates, final, onDone, className }: { candidates: string[]; final: string; onDone?: () => void; className?: string }) {
  const [current, setCurrent] = useState(candidates[0] ?? final);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let delay = 40;
    let alive = true;
    const step = () => {
      if (!alive) return;
      i++;
      setCurrent(candidates[i % Math.max(1, candidates.length)] ?? final);
      delay *= 1.13;
      if (delay > 420) {
        setCurrent(final);
        setDone(true);
        onDone?.();
        return;
      }
      setTimeout(step, delay);
    };
    const t = setTimeout(step, delay);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final]);

  return (
    <div className={clsx("select-none", className)}>
      <div className="label">Your topic</div>
      <div
        className={clsx(
          "font-display font-medium tracking-[-0.03em] leading-[1.02] mt-3 min-h-[2.1em] text-[34px] md:text-[56px] transition-colors",
          done ? "text-ink" : "text-ink-3",
        )}
        aria-live="polite"
      >
        {current}
      </div>
    </div>
  );
}
