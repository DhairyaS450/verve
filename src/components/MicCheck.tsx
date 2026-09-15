"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { LiveAudioAnalyzer } from "@/lib/audio/analyzer";
import type { DeviceLists, DevicePrefs } from "@/lib/recorder";
import { Waveform } from "./Waveform";
import { VeroLine } from "./VeroMark";

type Status = "listening" | "ok" | "silent";

const NEED_SECONDS = 0.6;
const PATIENCE = 6;

/**
 * Says nothing until it hears you. A dead headset mic never gets past this screen.
 */
export function MicCheck({
  analyzer,
  devices,
  prefs,
  hasVideo,
  onDevice,
  onContinue,
  className,
}: {
  analyzer: LiveAudioAnalyzer | null;
  devices: DeviceLists;
  prefs: DevicePrefs;
  hasVideo: boolean;
  onDevice: (p: DevicePrefs) => void;
  onContinue: () => void;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("listening");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!analyzer) return;
    analyzer.resetCounters();
    const start = performance.now();
    const t = setInterval(() => {
      setLevel(analyzer.level);
      const s = analyzer.speechSeconds;
      setHeard(s);
      if (s >= NEED_SECONDS) setStatus("ok");
      else if ((performance.now() - start) / 1000 > PATIENCE) setStatus("silent");
      else setStatus("listening");
    }, 100);
    return () => clearInterval(t);
  }, [analyzer, attempt]);

  const micLabel = devices.audio.find((d) => d.deviceId === prefs.audioId)?.label || devices.audio[0]?.label || "your microphone";

  return (
    <div className={className}>
      <p className="label">Mic check</p>
      <h1 className={clsx("font-display font-medium text-[34px] md:text-[52px] leading-[1] tracking-[-0.035em] mt-3", status === "silent" && "text-accent", status === "ok" && "text-good")}>
        {status === "ok" ? "Mic works." : status === "silent" ? "No sound from your microphone." : "Say one sentence."}
      </h1>
      <p className="mt-3 text-[14px] text-ink-2">
        {status === "ok"
          ? `Heard ${heard.toFixed(1)}s of voice on ${micLabel}.`
          : status === "silent"
            ? `Nothing heard on ${micLabel} in ${PATIENCE} seconds. Pick another mic below, or check it's unmuted.`
            : `Listening on ${micLabel}.`}
      </p>

      <div className="mt-6">
        <Waveform analyzer={analyzer} height={48} />
        <div className="mt-2 h-[6px] bg-paper-3">
          <div className={clsx("h-full transition-[width] duration-100", status === "silent" ? "bg-accent" : "bg-ink")} style={{ width: `${Math.round(Math.min(1, level * 1.4) * 100)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-3 num">
          <span>Level</span>
          <span>{heard >= NEED_SECONDS ? "voice detected" : `${Math.min(NEED_SECONDS, heard).toFixed(1)} / ${NEED_SECONDS}s of voice`}</span>
        </div>
      </div>

      {(devices.audio.length > 1 || status === "silent") && (
        <label className="block mt-6">
          <span className="label-ink">Microphone</span>
          <select className="field mt-1 bg-transparent" value={prefs.audioId ?? ""} onChange={(e) => onDevice({ ...prefs, audioId: e.target.value || undefined })}>
            <option value="">System default</option>
            {devices.audio.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Microphone ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {devices.video.length > 1 && (
        <label className="block mt-4">
          <span className="label-ink">Camera</span>
          <select className="field mt-1 bg-transparent" value={prefs.videoId ?? ""} onChange={(e) => onDevice({ ...prefs, videoId: e.target.value || undefined })}>
            <option value="">System default</option>
            {devices.video.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {!hasVideo && <p className="mt-4 text-[12px] text-warn">No camera. Vero will coach from audio only.</p>}

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" className="btn-accent btn-block min-h-[60px]" disabled={status !== "ok"} onClick={onContinue}>
          {status === "ok" ? "Continue" : "Waiting for your voice"}
        </button>
        {status === "silent" && (
          <>
            <button
              type="button"
              className="btn-ghost btn-block"
              onClick={() => {
                analyzer?.resetCounters();
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </button>
            <button type="button" className="text-[12px] text-ink-3 underline underline-offset-4 min-h-[44px]" onClick={onContinue}>
              Continue anyway. A silent tape will be rejected before Vero sees it.
            </button>
          </>
        )}
      </div>
      <VeroLine muted className="mt-8">
        {status === "silent" ? "Headset mics unplug quietly. Check the little mute switch." : "I only score what I can hear."}
      </VeroLine>
    </div>
  );
}
