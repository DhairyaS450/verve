"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { Waveform } from "./Waveform";
import type { LiveAudioAnalyzer } from "@/lib/audio/analyzer";
import { mmss } from "@/lib/format";

/**
 * The recording surface. Mirrored preview, red dot, tabular clock, waveform.
 * Everything else on the screen gets out of the way.
 */
export function CameraStage({
  stream,
  hasVideo,
  analyzer,
  recording,
  elapsed,
  total,
  countdown,
  className,
}: {
  stream: MediaStream | null;
  hasVideo: boolean;
  analyzer: LiveAudioAnalyzer | null;
  recording: boolean;
  elapsed: number;
  total: number;
  countdown?: number | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && hasVideo) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
    return () => {
      if (v) v.srcObject = null;
    };
  }, [stream, hasVideo]);

  const remaining = Math.max(0, total - elapsed);
  const frac = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <div className={clsx("relative w-full bg-ink text-paper overflow-hidden aspect-[3/4] md:aspect-video", className)}>
      {hasVideo ? (
        <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="label text-paper/70">Audio only</span>
        </div>
      )}
      {/* Lens target: the dot you should look at */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <div className="w-[6px] h-[6px] rounded-full bg-paper/80" />
        <span className="text-[9px] tracking-[0.12em] uppercase text-paper/60">Lens</span>
      </div>
      {/* Clock + status */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className={clsx("w-[10px] h-[10px] rounded-full", recording ? "bg-accent blink" : "bg-paper/40")} />
        <span className="num font-display text-[20px] leading-none">{mmss(remaining)}</span>
      </div>
      {countdown !== null && countdown !== undefined && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
          <span className="metric text-[140px] text-paper">{countdown}</span>
        </div>
      )}
      {/* Waveform + progress */}
      <div className="absolute bottom-0 inset-x-0">
        <div className="px-3 pb-2 text-paper/80">
          <Waveform analyzer={analyzer} height={36} color="rgba(243,241,236,0.85)" />
        </div>
        <div className="h-[3px] bg-paper/20">
          <div className={clsx("h-full", recording ? "bg-accent" : "bg-paper/50")} style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
