"use client";

import { useEffect, useRef } from "react";

/**
 * Swiss confetti: ink, red and green bars and squares. No gradients, no emoji.
 * Fires once when `fire` becomes true. Respects reduced motion.
 */
export function Confetti({ fire, count = 120, duration = 2600 }: { fire: boolean; count?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const palette = ["--ink", "--accent", "--good", "--accent", "--ink-3"].map((v) => css.getPropertyValue(v).trim() || "#111");
    const parts = Array.from({ length: count }, (_, i) => {
      const bar = Math.random() < 0.45;
      const dir = i % 2 === 0 ? -1 : 1;
      return {
        x: w / 2 + dir * Math.random() * w * 0.12,
        y: h * 0.62,
        vx: dir * (Math.random() * 6 + 2) * (Math.random() < 0.2 ? -1 : 1),
        vy: -(Math.random() * 10 + 8),
        w: bar ? 3 : 6 + Math.random() * 6,
        h: bar ? 12 + Math.random() * 10 : 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: palette[i % palette.length],
        drift: (Math.random() - 0.5) * 0.12,
      };
    });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      const p = Math.min(1, t / duration);
      ctx.clearRect(0, 0, w, h);
      for (const q of parts) {
        q.vy += 0.3;
        q.vx = q.vx * 0.985 + q.drift;
        q.x += q.vx;
        q.y += q.vy;
        q.rot += q.vr;
        ctx.save();
        ctx.globalAlpha = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = q.color;
        ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, count, duration]);

  if (!fire) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] w-full h-full" />;
}
