"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { fetchFileBlob, getAccessToken, DriveNotConnected } from "@/lib/drive";
import type { Moment } from "@/lib/types";
import { mmss } from "@/lib/format";
import { Envelope } from "./Waveform";

/** Plays a recording straight from the user's Drive. Moments are seekable. */
export function DriveVideo({
  uid,
  fileId,
  mimeType,
  moments,
  envelope,
  webViewLink,
  className,
}: {
  uid: string;
  fileId: string;
  mimeType: string;
  moments?: Moment[];
  envelope?: number[];
  webViewLink?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const isAudio = mimeType.startsWith("audio/");

  useEffect(() => {
    let alive = true;
    let objUrl: string | null = null;
    (async () => {
      try {
        const token = await getAccessToken(uid);
        const blob = await fetchFileBlob(token, fileId, (f) => alive && setProgress(f));
        objUrl = URL.createObjectURL(blob);
        if (alive) setUrl(objUrl);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof DriveNotConnected ? "Reconnect Google Drive to watch this." : "Could not load the recording.");
      }
    })();
    return () => {
      alive = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [uid, fileId]);

  const seek = (s: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = s;
    v.play().catch(() => {});
  };

  return (
    <div className={clsx("w-full", className)}>
      <div className={clsx("relative bg-ink text-paper w-full", isAudio ? "h-[96px]" : "aspect-[3/4] md:aspect-video")}>
        {url ? (
          isAudio ? (
            <audio ref={ref as unknown as React.RefObject<HTMLAudioElement>} src={url} controls className="absolute inset-x-3 bottom-3 w-[calc(100%-24px)]" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)} />
          ) : (
            <video
              ref={ref}
              src={url}
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {error ? (
              <>
                <span className="text-[13px] text-paper/80">{error}</span>
                {webViewLink && (
                  <a href={webViewLink} target="_blank" rel="noreferrer" className="label text-paper/70 underline">
                    Open in Drive
                  </a>
                )}
              </>
            ) : (
              <>
                <span className="label text-paper/70">Loading from Drive</span>
                <div className="w-[160px] h-[2px] bg-paper/20">
                  <div className="h-full bg-paper" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {envelope && envelope.length > 0 && (
        <div className="mt-2">
          <Envelope data={envelope} height={36} progress={dur > 0 ? t / dur : undefined} />
        </div>
      )}
      {moments && moments.length > 0 && (
        <ol className="mt-4 divide-y divide-line border-t border-line">
          {moments.map((m, i) => (
            <li key={i}>
              <button type="button" onClick={() => seek(m.t)} className="w-full text-left grid grid-cols-[52px_14px_1fr] items-center gap-3 py-3 min-h-[44px] hover:bg-paper-2 -mx-2 px-2">
                <span className="num text-[13px] text-ink-2">{mmss(m.t)}</span>
                <span className={clsx("w-[8px] h-[8px] rounded-full", m.kind === "good" ? "bg-good" : "bg-accent")} />
                <span className="text-[14px]">{m.note}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
