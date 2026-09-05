"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { LiveAudioAnalyzer } from "@/lib/audio/analyzer";

/** Live bar waveform. Ink on paper, no decoration. */
export function Waveform({ analyzer, className, height = 56, color }: { analyzer: LiveAudioAnalyzer | null; className?: string; height?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hist = useRef<number[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    const buf = new Float32Array(2048) as Float32Array<ArrayBuffer>;
    const BARS = 64;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let level = 0;
      if (analyzer) {
        analyzer.waveform(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        level = Math.min(1, Math.sqrt(s / buf.length) * 7);
      }
      const arr = hist.current;
      arr.push(level);
      if (arr.length > BARS) arr.shift();
      const gap = 2;
      const bw = (w - gap * (BARS - 1)) / BARS;
      const c = color ?? getComputedStyle(canvas).color;
      ctx.fillStyle = c;
      for (let i = 0; i < BARS; i++) {
        const v = arr[arr.length - BARS + i] ?? 0;
        const bh = Math.max(2, v * h);
        const x = i * (bw + gap);
        ctx.fillRect(x, (h - bh) / 2, bw, bh);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyzer, color]);

  return <canvas ref={ref} className={clsx("w-full text-ink", className)} style={{ height }} aria-hidden="true" />;
}

/** Static envelope (from stored metrics) for review pages. */
export function Envelope({ data, className, height = 48, progress }: { data: number[]; className?: string; height?: number; progress?: number }) {
  const n = data.length || 1;
  return (
    <div className={clsx("relative w-full flex items-center gap-[1px]", className)} style={{ height }} aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          className={clsx("flex-1", progress !== undefined && i / n <= progress ? "bg-accent" : "bg-ink-3")}
          style={{ height: `${Math.max(4, v * 100)}%` }}
        />
      ))}
    </div>
  );
}
