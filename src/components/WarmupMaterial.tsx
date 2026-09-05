"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Passage } from "@/content/types";

export function PassageBlock({ passage, large, className }: { passage: Passage; large?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="label">{passage.title}</span>
        <span className="text-[11px] text-ink-3 truncate">{passage.source}</span>
      </div>
      <p className={clsx("mt-3 font-display leading-[1.35] tracking-[-0.01em]", large ? "text-[22px] md:text-[28px]" : "text-[18px] md:text-[21px]")}>{passage.text}</p>
    </div>
  );
}

export function TwisterList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ol className={clsx("space-y-3", className)}>
      {items.map((t, i) => (
        <li key={t} className="flex gap-4 border-t border-line pt-3">
          <span className="num text-[12px] text-ink-3 mt-1">{String(i + 1).padStart(2, "0")}</span>
          <span className="font-display text-[20px] md:text-[24px] leading-snug">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function BigLine({ text, className }: { text: string; className?: string }) {
  return <p className={clsx("font-display text-[30px] md:text-[44px] leading-[1.05] tracking-[-0.02em]", className)}>{text}</p>;
}

/** Shows one item at a time on an interval; calls onDone after the last. */
export function Ticker({
  items,
  intervalSec,
  label,
  prefix,
  onDone,
  running,
  className,
}: {
  items: string[];
  intervalSec: number;
  label?: string;
  prefix?: string;
  onDone?: () => void;
  running: boolean;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    let finished = false;
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000;
      const i = Math.floor(elapsed / intervalSec);
      if (i >= items.length) {
        if (!finished) {
          finished = true;
          setIdx(items.length - 1);
          setTick(1);
          onDone?.();
        }
        return;
      }
      setIdx(i);
      setTick((elapsed - i * intervalSec) / intervalSec);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, items, intervalSec]);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="label">{label ?? "Now"}</span>
        <span className="num text-[12px] text-ink-3">
          {Math.min(idx + 1, items.length)} / {items.length}
        </span>
      </div>
      <p className="font-display text-[34px] md:text-[56px] leading-[1.02] tracking-[-0.03em] mt-3 min-h-[1.1em]">
        {prefix && <span className="text-ink-3">{prefix} </span>}
        {items[idx]}
      </p>
      <div className="h-[2px] bg-paper-3 mt-4">
        <div className="h-full bg-ink" style={{ width: `${Math.round(tick * 100)}%` }} />
      </div>
    </div>
  );
}
