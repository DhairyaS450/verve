"use client";

const CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
];

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of CANDIDATES) if (MediaRecorder.isTypeSupported(c)) return c;
  return "";
}

export function fileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export async function getSessionStream(): Promise<{ stream: MediaStream; hasVideo: boolean }> {
  const video = { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } };
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    return { stream, hasVideo: true };
  } catch {
    // Fall back to audio-only so coaching still works.
    const stream = await navigator.mediaDevices.getUserMedia({ audio });
    return { stream, hasVideo: false };
  }
}

export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  public readonly mimeType: string;

  constructor(private stream: MediaStream, mimeType?: string) {
    this.mimeType = mimeType ?? pickMimeType();
  }

  start() {
    this.chunks = [];
    const hasVideo = this.stream.getVideoTracks().length > 0;
    const opts: MediaRecorderOptions = {
      videoBitsPerSecond: 900_000,
      audioBitsPerSecond: 96_000,
    };
    let mime = this.mimeType;
    if (!hasVideo) mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
    if (mime) opts.mimeType = mime;
    this.rec = new MediaRecorder(this.stream, opts);
    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.startedAt = performance.now();
    this.rec.start(1000);
  }

  get elapsed(): number {
    return this.startedAt ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  stop(): Promise<{ blob: Blob; mimeType: string; durationSec: number }> {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      if (!rec) return reject(new Error("not recording"));
      const durationSec = this.elapsed;
      rec.onstop = () => {
        const type = rec.mimeType || this.mimeType || "video/webm";
        const blob = new Blob(this.chunks, { type: type.split(";")[0] });
        resolve({ blob, mimeType: type.split(";")[0], durationSec });
      };
      rec.onerror = () => reject(new Error("recorder error"));
      if (rec.state !== "inactive") rec.stop();
      else rec.onstop?.(new Event("stop"));
    });
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}
