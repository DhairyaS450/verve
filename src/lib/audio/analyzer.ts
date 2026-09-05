"use client";

import type { AudioMetrics } from "../types";
import { mean, percentile } from "../format";

interface Frame {
  t: number;
  rms: number;
  f0: number | null;
}

const MIN_F0 = 65;
const MAX_F0 = 450;
const SILENCE_DB = -48;
const PAUSE_SEC = 0.5;

/**
 * Deterministic, in-browser voice metrics. Runs alongside MediaRecorder.
 * Pitch via normalized autocorrelation; volume via RMS; pauses via gating.
 */
export class LiveAudioAnalyzer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private timer: number | null = null;
  private frames: Frame[] = [];
  private startAt = 0;
  private stopped = false;
  public level = 0;

  constructor(private stream: MediaStream) {}

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.startAt = performance.now();
    this.frames = [];
    this.stopped = false;
    const tick = () => {
      if (this.stopped || !this.analyser || !this.buf || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      const rms = rmsOf(this.buf);
      this.level = Math.min(1, rms * 6);
      const db = 20 * Math.log10(rms + 1e-9);
      let f0: number | null = null;
      if (db > SILENCE_DB) f0 = autocorrelate(this.buf, this.ctx.sampleRate);
      this.frames.push({ t: (performance.now() - this.startAt) / 1000, rms, f0 });
    };
    this.timer = window.setInterval(tick, 50);
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  /** Time-domain snapshot for waveform rendering. */
  waveform(out: Float32Array<ArrayBuffer>) {
    this.analyser?.getFloatTimeDomainData(out);
  }

  stop(): AudioMetrics {
    this.stopped = true;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    const frames = this.frames;
    const metrics = computeMetrics(frames);
    try {
      this.ctx?.close();
    } catch {}
    this.ctx = null;
    this.analyser = null;
    return metrics;
  }
}

function rmsOf(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/** Normalized autocorrelation pitch detector with parabolic interpolation. */
export function autocorrelate(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  const minLag = Math.floor(sampleRate / MAX_F0);
  const maxLag = Math.min(n - 2, Math.ceil(sampleRate / MIN_F0));
  // Remove DC
  let m = 0;
  for (let i = 0; i < n; i++) m += buf[i];
  m /= n;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = buf[i] - m;
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += x[i] * x[i];
  if (e0 < 1e-6) return null;

  let bestLag = -1;
  let bestVal = 0;
  const corr = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    let ea = 0;
    let eb = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = x[i];
      const b = x[i + lag];
      s += a * b;
      ea += a * a;
      eb += b * b;
    }
    const v = s / (Math.sqrt(ea * eb) + 1e-9);
    corr[lag] = v;
    if (v > bestVal) {
      bestVal = v;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestVal < 0.82) return null;
  // Prefer the first strong peak (avoid octave errors toward low lags)
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (corr[lag] > bestVal * 0.9 && corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag;
      bestVal = corr[lag];
      break;
    }
  }
  const y1 = corr[bestLag - 1] ?? bestVal;
  const y2 = bestVal;
  const y3 = corr[bestLag + 1] ?? bestVal;
  const denom = y1 - 2 * y2 + y3;
  const shift = denom !== 0 ? (0.5 * (y1 - y3)) / denom : 0;
  const lag = bestLag + shift;
  const f0 = sampleRate / lag;
  if (f0 < MIN_F0 || f0 > MAX_F0) return null;
  return f0;
}

export function computeMetrics(frames: Frame[]): AudioMetrics {
  const durationSec = frames.length ? frames[frames.length - 1].t : 0;
  const speech = frames.map((f) => 20 * Math.log10(f.rms + 1e-9) > SILENCE_DB);
  const first = speech.indexOf(true);
  const last = speech.lastIndexOf(true);
  let pauses: number[] = [];
  if (first >= 0 && last > first) {
    let run = 0;
    for (let i = first; i <= last; i++) {
      if (!speech[i]) run++;
      else {
        if (run > 0) {
          const secs = run * 0.05;
          if (secs >= PAUSE_SEC) pauses.push(secs);
        }
        run = 0;
      }
    }
  }
  const speechFrames = frames.filter((_, i) => speech[i]);
  const speakingRatio = frames.length ? speechFrames.length / frames.length : 0;
  const f0s = frames.map((f) => f.f0).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
  const p10 = percentile(f0s, 0.1);
  const p90 = percentile(f0s, 0.9);
  const med = percentile(f0s, 0.5);
  const spread = f0s.length > 10 && p10 > 0 ? 12 * Math.log2(p90 / p10) : 0;
  const dbs = speechFrames.map((f) => 20 * Math.log10(f.rms + 1e-9)).sort((a, b) => a - b);
  const volumeMeanDb = dbs.length ? mean(dbs) : -60;
  const volumeRangeDb = dbs.length ? percentile(dbs, 0.9) - percentile(dbs, 0.1) : 0;
  // Variety: pitch spread 2st → 10, 12st → 100; volume range contributes up to +15.
  const pitchScore = Math.max(0, Math.min(100, ((spread - 2) / 10) * 100));
  const volScore = Math.max(0, Math.min(15, (volumeRangeDb / 12) * 15));
  const varietyScore = Math.round(Math.max(0, Math.min(100, pitchScore * 0.85 + volScore)));
  pauses = pauses.filter((p) => p < 15);
  const envelope = downsample(frames.map((f) => Math.min(1, f.rms * 6)), 160);
  return {
    durationSec: Math.round(durationSec * 10) / 10,
    speakingRatio: Math.round(speakingRatio * 100) / 100,
    pauseCount: pauses.length,
    longestPauseSec: pauses.length ? Math.round(Math.max(...pauses) * 10) / 10 : 0,
    meanPauseSec: pauses.length ? Math.round(mean(pauses) * 100) / 100 : 0,
    pitchMedianHz: Math.round(med),
    pitchSpreadSemitones: Math.round(spread * 10) / 10,
    varietyScore,
    volumeMeanDb: Math.round(volumeMeanDb * 10) / 10,
    volumeRangeDb: Math.round(volumeRangeDb * 10) / 10,
    monotone: f0s.length > 10 && spread < 3.5,
    envelope,
  };
}

function downsample(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr.map((v) => Math.round(v * 1000) / 1000);
  const out: number[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(i * step);
    const e = Math.max(s + 1, Math.floor((i + 1) * step));
    let mx = 0;
    for (let j = s; j < e; j++) mx = Math.max(mx, arr[j]);
    out.push(Math.round(mx * 1000) / 1000);
  }
  return out;
}
