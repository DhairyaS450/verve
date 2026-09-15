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

// ---------------------------------------------------------------------------
// Device choice. A headset mic that isn't plugged in is the classic silent-tape bug.
// ---------------------------------------------------------------------------
export interface DevicePrefs {
  audioId?: string;
  videoId?: string;
}

const PREFS_KEY = "verve.devices";

export function loadDevicePrefs(): DevicePrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as DevicePrefs;
  } catch {
    return {};
  }
}

export function saveDevicePrefs(p: DevicePrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
}

export interface DeviceLists {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
}

/** Labels are only populated once a stream has been granted. */
export async function listDevices(): Promise<DeviceLists> {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return { audio: all.filter((d) => d.kind === "audioinput"), video: all.filter((d) => d.kind === "videoinput") };
  } catch {
    return { audio: [], video: [] };
  }
}

export function activeDeviceIds(stream: MediaStream | null): DevicePrefs {
  if (!stream) return {};
  return {
    audioId: stream.getAudioTracks()[0]?.getSettings().deviceId,
    videoId: stream.getVideoTracks()[0]?.getSettings().deviceId,
  };
}

export async function getSessionStream(prefs: DevicePrefs = {}): Promise<{ stream: MediaStream; hasVideo: boolean }> {
  const video: MediaTrackConstraints = { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } };
  const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
  if (prefs.videoId) video.deviceId = { exact: prefs.videoId };
  if (prefs.audioId) audio.deviceId = { exact: prefs.audioId };
  const attempts: Array<{ video: MediaTrackConstraints | false; audio: MediaTrackConstraints }> = [
    { video, audio },
    // A remembered device may be unplugged: fall back to defaults.
    { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } },
    { video: false, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } },
  ];
  let lastErr: unknown;
  for (const a of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: a.video, audio: a.audio });
      return { stream, hasVideo: stream.getVideoTracks().length > 0 };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
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

  /** Throw the take away without producing a blob. */
  discard() {
    const rec = this.rec;
    this.rec = null;
    this.chunks = [];
    try {
      if (rec && rec.state !== "inactive") {
        rec.ondataavailable = null;
        rec.onstop = null;
        rec.stop();
      }
    } catch {}
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}
