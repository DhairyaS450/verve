"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPlan, getSkillStates, listSessions, newSessionId, patchSession, savePlan, saveSession } from "@/lib/db";
import { buildPlan } from "@/lib/planner";
import { buildMaterial, type SessionMaterial } from "@/lib/material";
import { LiveAudioAnalyzer } from "@/lib/audio/analyzer";
import { Recorder, getSessionStream, stopStream } from "@/lib/recorder";
import { DriveNotConnected, ensureFolder, getAccessToken } from "@/lib/drive";
import { analyzeSession, uploadRecording } from "@/lib/analysis-client";
import type { AudioMetrics, PlanDoc, SessionDoc, SkillState } from "@/lib/types";
import { DRILL_MAP } from "@/content/drills";
import { SKILL_MAP } from "@/content/skills";
import { FRAMEWORK_MAP } from "@/content/frameworks";
import type { Drill } from "@/content/types";
import { VERO, pick } from "@/content/vero";
import { VeroLine, VeroMark } from "@/components/VeroMark";
import { Vero } from "@/components/Vero";
import { Confetti } from "@/components/Confetti";
import { getGeminiKeyStatus } from "@/lib/keys";
import { averageScores } from "@/lib/coach";
import { Timer } from "@/components/Timer";
import { Waveform } from "@/components/Waveform";
import { CameraStage } from "@/components/CameraStage";
import { TopicWheel } from "@/components/TopicWheel";
import { FrameworkStrip } from "@/components/FrameworkStrip";
import { BigLine, PassageBlock, Ticker, TwisterList } from "@/components/WarmupMaterial";
import { FeedbackView } from "@/components/FeedbackView";
import { Notes } from "@/components/Transcript";
import { localDateStr, mmss } from "@/lib/format";
import { liveStreak } from "@/lib/xp";

type Phase = "loading" | "setup" | "warmup" | "brief" | "prep" | "record" | "review" | "feedback" | "error";
type Kind = "daily" | "free" | "baseline";

const CHIPS = ["Rambled", "Too fast", "Too many ums", "Lost the structure", "Strong ending", "Good energy", "Flat voice", "Nailed the point"];
/** Seconds past the drill's time to finish a sentence before the hard stop. */
const GRACE = 5;
const RESPINS = 2;
const RESPIN_KINDS = new Set(["topic", "object", "question", "story-prompt", "expert", "statements"]);

function PracticeFlow() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const kind = (params.get("kind") ?? "daily") as Kind;
  const forceDrill = params.get("drill") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [material, setMaterial] = useState<SessionMaterial | null>(null);
  const [warmupMaterial, setWarmupMaterial] = useState<SessionMaterial | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const [displayAnalyzer, setDisplayAnalyzer] = useState<LiveAudioAnalyzer | null>(null);
  const recAnalyzerRef = useRef<LiveAudioAnalyzer | null>(null);
  const [recAnalyzer, setRecAnalyzer] = useState<LiveAudioAnalyzer | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [drive, setDrive] = useState<"checking" | "ready" | "missing" | "error">("checking");
  const [gemini, setGemini] = useState<"checking" | "ready" | "missing">("checking");
  const [respins, setRespins] = useState(0);
  const [wheelKey, setWheelKey] = useState(0);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const endedByRef = useRef<"timer" | "user">("user");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [wheelDone, setWheelDone] = useState(false);
  const [tickerDone, setTickerDone] = useState(false);

  const sessionRef = useRef<SessionDoc | null>(null);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [stage, setStage] = useState<"uploading" | "analyzing" | "done" | "failed">("uploading");
  const [veroLine, setVeroLine] = useState(VERO.analyzing[0]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ xp: number; streak: number } | null>(null);
  const blobRef = useRef<{ blob: Blob; mimeType: string; durationSec: number; audio: AudioMetrics } | null>(null);

  const warmup: Drill | undefined = plan && kind === "daily" ? DRILL_MAP[plan.warmupId] : undefined;
  const drill: Drill | undefined = plan ? DRILL_MAP[plan.drillId] : undefined;
  const framework = drill?.frameworkId ? FRAMEWORK_MAP[drill.frameworkId] : undefined;
  const focus = plan ? SKILL_MAP[plan.focusSkillId] : undefined;
  const previous = useMemo(() => sessions.find((s) => s.status === "analyzed" && s.ai) ?? null, [sessions]);

  // ---------------------------------------------------------------- load
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      try {
        const today = localDateStr();
        const [ss, sk] = await Promise.all([listSessions(profile.uid, 40), getSkillStates(profile.uid)]);
        let p: PlanDoc;
        if (kind === "baseline") {
          p = { date: today, warmupId: "", drillId: "m-baseline", focusSkillId: "wheel-60", reason: VERO.firstTime, generatedAt: Date.now(), completed: false };
        } else if (kind === "free" && forceDrill && DRILL_MAP[forceDrill]) {
          p = buildPlan({ profile, skills: sk, sessions: ss, date: today, forceDrillId: forceDrill });
        } else {
          const existing = await getPlan(profile.uid, today);
          p = existing && DRILL_MAP[existing.drillId] ? existing : buildPlan({ profile, skills: sk, sessions: ss, date: today });
          if (!existing) await savePlan(profile.uid, p);
        }
        if (!alive) return;
        const d = DRILL_MAP[p.drillId];
        const rp = ss.slice(0, 20).map((s) => s.prompt ?? "").filter(Boolean);
        setRecentPrompts(rp);
        setSessions(ss);
        setSkills(sk);
        setPlan(p);
        setMaterial(buildMaterial(d, rp));
        const w = kind === "daily" ? DRILL_MAP[p.warmupId] : undefined;
        setWarmupMaterial(w ? buildMaterial(w) : null);
        setPhase("setup");
      } catch (e) {
        console.error(e);
        setError("Could not load today's plan.");
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, kind, forceDrill]);

  // Drive readiness check (non-blocking)
  useEffect(() => {
    if (!profile || phase !== "setup") return;
    let alive = true;
    (async () => {
      try {
        const token = await getAccessToken(profile.uid);
        await ensureFolder(profile.uid, token, profile.driveFolderId);
        if (alive) setDrive("ready");
      } catch (e) {
        if (!alive) return;
        setDrive(e instanceof DriveNotConnected ? "missing" : "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile, phase]);

  // Gemini key check: own key, or the shared key if this account is allowed to use it.
  useEffect(() => {
    if (!profile || phase !== "setup") return;
    let alive = true;
    getGeminiKeyStatus(profile.uid)
      .then((s) => alive && setGemini(s.hasOwnKey || s.sharedAllowed ? "ready" : "missing"))
      .catch(() => alive && setGemini("ready"));
    return () => {
      alive = false;
    };
  }, [profile, phase]);

  // Cleanup media on unmount
  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      try {
        displayAnalyzer?.stop();
      } catch {}
      wakeLockRef.current?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotating Vero lines while analyzing
  useEffect(() => {
    if (phase !== "review") return;
    const t = setInterval(() => setVeroLine(pick(VERO.analyzing)), 2600);
    return () => clearInterval(t);
  }, [phase]);

  // ---------------------------------------------------------------- media
  const begin = async () => {
    try {
      const { stream: s, hasVideo: hv } = await getSessionStream();
      streamRef.current = s;
      setStream(s);
      setHasVideo(hv);
      const a = new LiveAudioAnalyzer(s);
      a.start();
      setDisplayAnalyzer(a);
      try {
        wakeLockRef.current = await navigator.wakeLock?.request("screen");
      } catch {}
      setElapsed(0);
      setPhase(warmup ? "warmup" : "brief");
    } catch (e) {
      console.error(e);
      setError("Camera or microphone was blocked. Allow access and try again.");
      setPhase("error");
    }
  };

  // ---------------------------------------------------------------- pipeline
  const runPipeline = async (rec: { blob: Blob; mimeType: string; durationSec: number; audio: AudioMetrics }) => {
    const base = sessionRef.current;
    if (!base || !profile) return;
    const s: SessionDoc = { ...base, endedBy: endedByRef.current };
    sessionRef.current = s;
    setStage("uploading");
    setUploadPct(0);
    try {
      await patchSession(profile.uid, s.id, { audio: rec.audio, endedBy: s.endedBy, status: "uploading" });
      const recording = await uploadRecording({ profile, session: s, blob: rec.blob, mimeType: rec.mimeType, durationSec: rec.durationSec, onProgress: setUploadPct });
      const withRec = { ...s, audio: rec.audio, recording };
      sessionRef.current = withRec;
      setSession(withRec);
      setStage("analyzing");
      const { analysis, xp, profile: updated, coach } = await analyzeSession({ profile, session: withRec, skills, sessions, audio: rec.audio });
      const done = { ...withRec, ai: analysis, status: "analyzed" as const, xp, coach };
      sessionRef.current = done;
      setSession(done);
      setResult({ xp, streak: liveStreak(updated.streak, localDateStr()) });
      setStage("done");
      setPhase("feedback");
    } catch (e) {
      console.error(e);
      const msg = e instanceof DriveNotConnected ? "Google Drive is not connected." : (e as Error).message;
      setError(msg);
      setStage("failed");
    }
  };

  const startRecording = useCallback(() => {
    if (!drill || !profile || !plan) return;
    setPhase("record");
    setElapsed(0);
    setRecording(false);
    let n = 3;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setCountdown(null);
        const stream = streamRef.current;
        if (!stream) return;
        const rec = new Recorder(stream);
        const an = new LiveAudioAnalyzer(stream);
        recorderRef.current = rec;
        recAnalyzerRef.current = an;
        setRecAnalyzer(an);
        an.start();
        rec.start();
        setRecording(true);
        const s: SessionDoc = {
          id: newSessionId(),
          uid: profile.uid,
          createdAt: Date.now(),
          date: localDateStr(),
          kind,
          warmupId: warmup?.id,
          drillId: drill.id,
          drillName: drill.name,
          skillIds: drill.skillIds,
          focusSkillId: plan.focusSkillId,
          frameworkId: drill.frameworkId,
          prompt: material?.prompt,
          promptExtra: material?.promptExtra,
          status: "recording",
        };
        sessionRef.current = s;
        setSession(s);
        saveSession(profile.uid, s).catch(console.error);
      } else setCountdown(n);
    }, 1000);
  }, [drill, profile, plan, kind, warmup, material]);

  const stopRecording = useCallback(async () => {
    const rec = recorderRef.current;
    const an = recAnalyzerRef.current;
    if (!rec || !an || !profile) return;
    recorderRef.current = null;
    recAnalyzerRef.current = null;
    setRecAnalyzer(null);
    setRecording(false);
    try {
      const { blob, mimeType, durationSec } = await rec.stop();
      const audio = an.stop();
      blobRef.current = { blob, mimeType, durationSec, audio };
      stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
      try {
        displayAnalyzer?.stop();
      } catch {}
      setDisplayAnalyzer(null);
      setPhase("review");
      runPipeline({ blob, mimeType, durationSec, audio });
    } catch (e) {
      console.error(e);
      setError("Recording failed. Try again.");
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, displayAnalyzer]);

  // Elapsed ticker for warmup and prep; prep auto-advances into recording.
  useEffect(() => {
    if (phase !== "warmup" && phase !== "prep") return;
    const start = performance.now();
    const t = setInterval(() => {
      const e = (performance.now() - start) / 1000;
      setElapsed(e);
      if (phase === "prep" && drill && e >= (drill.prepSeconds ?? 0)) startRecording();
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Recording clock + auto-stop
  useEffect(() => {
    if (phase !== "record" || !recording || !drill) return;
    const t = setInterval(() => {
      const e = recorderRef.current?.elapsed ?? 0;
      setElapsed(e);
      if (e >= (drill.speakSeconds ?? 60) + GRACE) {
        endedByRef.current = "timer";
        stopRecording();
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recording]);

  const retry = () => {
    if (!blobRef.current) return;
    setError(null);
    if (sessionRef.current?.recording) {
      // Upload succeeded; only re-run analysis.
      (async () => {
        const s = sessionRef.current!;
        setStage("analyzing");
        try {
          const { analysis, xp, profile: updated, coach } = await analyzeSession({ profile: profile!, session: s, skills, sessions, audio: blobRef.current!.audio });
          const done = { ...s, ai: analysis, status: "analyzed" as const, xp, coach };
          sessionRef.current = done;
          setSession(done);
          setResult({ xp, streak: liveStreak(updated.streak, localDateStr()) });
          setStage("done");
          setPhase("feedback");
        } catch (e) {
          setError((e as Error).message);
          setStage("failed");
        }
      })();
    } else runPipeline(blobRef.current);
  };

  const saveNotes = async () => {
    const s = sessionRef.current;
    if (!s || !profile || !notes.trim()) return;
    await patchSession(profile.uid, s.id, { notes: notes.trim() }).catch(() => {});
  };

  const finish = async () => {
    await saveNotes();
    router.replace("/today");
  };

  const canRespin = Boolean(drill && material?.prompt && RESPIN_KINDS.has(drill.material.kind));
  const respin = () => {
    if (!drill || !material || respins >= RESPINS) return;
    const exclude = [...recentPrompts, material.prompt ?? ""].filter(Boolean);
    setRecentPrompts(exclude);
    setMaterial(buildMaterial(drill, exclude));
    setWheelDone(false);
    setWheelKey((k) => k + 1);
    setRespins((r) => r + 1);
  };

  const exit = () => {
    stopStream(streamRef.current);
    router.replace(kind === "baseline" ? "/onboarding" : "/today");
  };

  // ---------------------------------------------------------------- render helpers
  const header = (label: string, right?: React.ReactNode) => (
    <div className="flex items-center justify-between h-[44px]">
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {right}
        {phase !== "feedback" && (
          <button type="button" onClick={exit} aria-label="Exit" className="w-[44px] h-[44px] -mr-3 flex items-center justify-center text-ink-2 hover:text-ink">
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );

  const stepBar = (idx: number) => {
    const steps = warmup ? ["Warmup", "Drill", "Review"] : ["Drill", "Review"];
    return (
      <ol className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((s, i) => (
          <li key={s} className={clsx("h-[2px]", i <= idx ? "bg-ink" : "bg-paper-3")} aria-label={s} />
        ))}
      </ol>
    );
  };

  if (phase === "loading" || !profile || !plan || !drill) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center text-ink-3">
        <VeroMark size={22} className="blink" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-[560px] pt-4">
        {header("Practice")}
        <h1 className="font-display text-[34px] leading-tight mt-8">Something got in the way.</h1>
        <p className="mt-3 text-ink-2">{error}</p>
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn" onClick={() => location.reload()}>
            Try again
          </button>
          <button type="button" className="btn-ghost" onClick={exit}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- SETUP
  if (phase === "setup") {
    const total = (warmup?.minutes ?? 0) + drill.minutes;
    return (
      <div className="max-w-[640px] pb-12">
        {header(kind === "baseline" ? "Baseline" : kind === "free" ? "Free practice" : "Today's session")}
        <h1 className="font-display font-medium text-[40px] md:text-[64px] leading-[0.98] tracking-[-0.035em] mt-6 rise">
          {focus?.name ?? drill.name}
        </h1>
        <VeroLine className="mt-5 rise-1" muted>
          {kind === "baseline" ? VERO.firstTime : drill.intro}
        </VeroLine>
        <ol className="mt-8 border-t border-ink rise-2">
          {warmup && (
            <li className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3 border-b border-line">
              <span className="num text-[12px] text-ink-3">01</span>
              <span className="font-display text-[18px]">{warmup.name}</span>
              <span className="num text-[13px] text-ink-2">{warmup.minutes} min</span>
            </li>
          )}
          <li className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3 border-b border-line">
            <span className="num text-[12px] text-ink-3">{warmup ? "02" : "01"}</span>
            <span className="font-display text-[18px]">{drill.name}</span>
            <span className="num text-[13px] text-ink-2">{drill.minutes} min</span>
          </li>
          <li className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3 border-b border-line">
            <span className="num text-[12px] text-ink-3">{warmup ? "03" : "02"}</span>
            <span className="font-display text-[18px]">Vero reviews the tape</span>
            <span className="num text-[13px] text-ink-2">~1 min</span>
          </li>
        </ol>
        <div className="mt-8 space-y-3 rise-3">
          {drive === "missing" && (
            <a href={`/api/auth/google?next=${encodeURIComponent(`/practice?kind=${kind}${forceDrill ? `&drill=${forceDrill}` : ""}`)}`} className="btn-ghost btn-block">
              Connect Google Drive first
            </a>
          )}
          {gemini === "missing" && (
            <Link href="/settings#gemini" className="btn-ghost btn-block">
              Add your Gemini API key first
            </Link>
          )}
          <button type="button" className="btn-accent btn-block min-h-[64px] text-[16px]" onClick={begin} disabled={drive === "missing" || gemini === "missing"}>
            Begin · {total} min
          </button>
          <p className="text-[12px] text-ink-3">
            {gemini === "missing" && "Vero reviews tapes with Gemini. Add your own key in Settings, then come back. "}
            {drive === "checking" && "Checking your Drive…"}
            {drive === "ready" && "Camera and mic will be requested once. Recordings save to your Drive."}
            {drive === "error" && "Drive check failed. You can still practice; upload may fail."}
            {drive === "missing" && "Verve saves recordings to a Verve folder in your Google Drive."}
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- WARMUP
  if (phase === "warmup" && warmup && material && warmupMaterial) {
    const total = warmup.minutes * 60;
    const wm = warmupMaterial;
    const ticker = wm.items;
    return (
      <div className="max-w-[720px] pb-12">
        {header("Warmup")}
        {stepBar(0)}
        <div className="mt-6 flex items-baseline justify-between">
          <h1 className="font-display font-medium text-[32px] md:text-[48px] leading-[1] tracking-[-0.03em]">{warmup.name}</h1>
        </div>
        <ol className="mt-4 space-y-1.5">
          {warmup.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px]">
              <span className="num text-[11px] text-ink-3 mt-[5px]">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 hairline pt-5">
          {ticker ? (
            <Ticker items={ticker} intervalSec={wm.itemInterval ?? 5} running={phase === "warmup"} prefix={wm.itemPrefix} onDone={() => setTickerDone(true)} label={wm.itemPrefix !== undefined ? "Say it" : "Now"} />
          ) : wm.passage ? (
            <PassageBlock passage={wm.passage} large />
          ) : wm.twisters ? (
            <TwisterList items={wm.twisters} />
          ) : wm.line ? (
            <BigLine text={wm.line} />
          ) : null}
        </div>
        <div className="mt-8">
          <Waveform analyzer={displayAnalyzer} height={40} />
          {!ticker && <Timer seconds={elapsed} total={total} className="mt-4" countUp />}
        </div>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              setElapsed(0);
              setPhase("brief");
            }}
          >
            {ticker && !tickerDone ? "Skip" : "Done · next"}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- BRIEF
  if (phase === "brief" && material) {
    const hasPrep = (drill.prepSeconds ?? 0) > 5;
    return (
      <div className="max-w-[720px] pb-12">
        {header("Drill")}
        {stepBar(warmup ? 1 : 0)}
        <div className="mt-6">
          <p className="label">{drill.name}</p>
          <VeroLine className="mt-3" muted>
            {drill.intro}
          </VeroLine>
        </div>
        <div className="mt-8 hairline-strong pt-6">
          {material.candidates && material.prompt ? (
            <TopicWheel key={wheelKey} candidates={material.candidates} final={material.prompt} onDone={() => setWheelDone(true)} />
          ) : (
            <PromptBlock key={wheelKey} material={material} />
          )}
        </div>
        {canRespin && (
          <button
            type="button"
            className="mt-3 label-ink min-h-[44px] flex items-center gap-2 disabled:opacity-40"
            disabled={respins >= RESPINS || (Boolean(material.candidates) && !wheelDone)}
            onClick={respin}
          >
            {respins >= RESPINS ? "No more spins" : "New topic"}
            {respins < RESPINS && <span className="text-ink-3">· {RESPINS - respins} left</span>}
          </button>
        )}
        <ol className="mt-6 space-y-1.5">
          {drill.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] text-ink-2">
              <span className="num text-[11px] text-ink-3 mt-[5px]">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {framework && <FrameworkStrip framework={framework} className="mt-8" />}
        <div className="mt-8 flex flex-col gap-3">
          {hasPrep ? (
            <button
              type="button"
              className="btn btn-block min-h-[60px]"
              disabled={Boolean(material.candidates) && !wheelDone}
              onClick={() => {
                setElapsed(0);
                setPhase("prep");
              }}
            >
              Prep · {mmss(drill.prepSeconds ?? 0)}
            </button>
          ) : null}
          <button type="button" className={clsx(hasPrep ? "btn-ghost" : "btn-accent", "btn-block min-h-[60px]")} disabled={Boolean(material.candidates) && !wheelDone} onClick={startRecording}>
            {hasPrep ? "Skip prep · record" : "Record"}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- PREP
  if (phase === "prep" && material) {
    return (
      <div className="max-w-[720px] pb-12">
        {header("Prep")}
        {stepBar(warmup ? 1 : 0)}
        <div className="mt-6">
          <PromptBlock material={material} showParagraph />
        </div>
        {framework && <FrameworkStrip framework={framework} className="mt-8" />}
        <Timer seconds={elapsed} total={drill.prepSeconds ?? 0} label="Think" className="mt-10" />
        <button type="button" className="btn-accent btn-block mt-8 min-h-[60px]" onClick={startRecording}>
          I&apos;m ready · record
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- RECORD
  if (phase === "record" && material) {
    const speak = drill.speakSeconds ?? 60;
    const minSpeak = drill.minSpeakSeconds ?? 15;
    const canStop = elapsed >= minSpeak;
    const segIdx = material.promptExtra && material.segmentSec ? Math.min(material.promptExtra.length - 1, Math.floor(elapsed / material.segmentSec)) : -1;
    return (
      <div className="max-w-[720px] pb-10 -mx-5 md:mx-0">
        <div className="px-5 md:px-0">{header("Recording", <span className={clsx("label", recording ? "text-accent" : "")}>{recording ? "Live" : ""}</span>)}</div>
        <div className="px-5 md:px-0 mt-2">
          {segIdx >= 0 && material.promptExtra ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="label">{material.prompt}</span>
                <span className="num text-[12px] text-ink-3">
                  {segIdx + 1} / {material.promptExtra.length}
                </span>
              </div>
              <p className="font-display text-[22px] md:text-[30px] leading-tight tracking-[-0.02em] mt-1">{material.promptExtra[segIdx]}</p>
            </div>
          ) : material.passage ? (
            <PassageBlock passage={material.passage} />
          ) : (
            <p className="font-display text-[22px] md:text-[30px] leading-tight tracking-[-0.02em]">{material.prompt}</p>
          )}
          {framework && <FrameworkStrip framework={framework} compact className="mt-3" />}
        </div>
        <CameraStage stream={stream} hasVideo={hasVideo} analyzer={recAnalyzer ?? displayAnalyzer} recording={recording} elapsed={elapsed} total={speak} grace={GRACE} countdown={countdown} className="mt-4" />
        <div className="px-5 md:px-0 mt-4 flex items-center gap-4">
          <button
            type="button"
            className="btn-accent flex-1 min-h-[60px]"
            disabled={!recording || !canStop}
            onClick={() => {
              endedByRef.current = "user";
              stopRecording();
            }}
          >
            {recording ? (canStop ? (elapsed > speak ? "Done" : "Stop") : `Keep going · ${mmss(minSpeak - elapsed)}`) : "Starting"}
          </button>
        </div>
        <p className="px-5 md:px-0 mt-2 text-[12px] text-ink-3">Stop whenever you land the last sentence. {GRACE}s of grace after the clock.</p>
        {focus && <p className="px-5 md:px-0 mt-4 text-[13px] text-ink-2">{focus.cue}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------- REVIEW (upload + reflect + analysis)
  if (phase === "review") {
    return (
      <div className="max-w-[640px] pb-12">
        {header("Review")}
        {stepBar(warmup ? 2 : 1)}
        <div className="mt-8">
          {stage === "failed" ? (
            <>
              <p className="label text-accent">Stopped</p>
              <h1 className="font-display text-[30px] leading-tight mt-2">{error}</h1>
              <div className="mt-6 flex flex-col gap-3">
                {error?.includes("Drive") ? (
                  <a href={`/api/auth/google?next=${encodeURIComponent("/today")}`} className="btn btn-block">
                    Reconnect Google Drive
                  </a>
                ) : error?.includes("Gemini") ? (
                  <Link href="/settings#gemini" className="btn btn-block">
                    Open Settings
                  </Link>
                ) : (
                  <button type="button" className="btn btn-block" onClick={retry}>
                    Retry
                  </button>
                )}
                <button type="button" className="btn-ghost btn-block" onClick={finish}>
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <Vero pose="notes" size={112} className="shrink-0 -ml-2" />
                <p className="font-display text-[22px] md:text-[26px] leading-tight">{stage === "uploading" ? pick(VERO.uploading) : veroLine}</p>
              </div>
              <div className="mt-4 h-[2px] bg-paper-3">
                <div className={clsx("h-full transition-[width] duration-300", stage === "uploading" ? "bg-ink" : "bg-accent")} style={{ width: stage === "uploading" ? `${Math.round(uploadPct * 100)}%` : "100%" }} />
              </div>
              <p className="mt-2 text-[12px] text-ink-3 num">{stage === "uploading" ? `Saving to Drive · ${Math.round(uploadPct * 100)}%` : "Vero is reviewing. Usually under a minute."}</p>
            </>
          )}
        </div>
        <div className="mt-12 hairline-strong pt-6">
          <p className="label">While you wait</p>
          <h2 className="font-display text-[26px] leading-tight mt-2">How did that feel?</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className={clsx("min-h-[40px] px-3 border text-[13px]", notes.includes(c) ? "bg-ink text-paper border-ink" : "border-line hover:border-ink")}
                onClick={() => setNotes((n) => (n.includes(c) ? n.replace(c, "").replace(/\s*,\s*,/g, ",").trim() : n ? `${n}, ${c}` : c))}
              >
                {c}
              </button>
            ))}
          </div>
          <Notes value={notes} onChange={setNotes} className="mt-4" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- FEEDBACK
  if (phase === "feedback" && session?.ai) {
    const prevAi = previous?.ai;
    const improved = !prevAi || session.ai.scores.overall >= prevAi.scores.overall || session.ai.fillers.perMin < prevAi.fillers.perMin;
    const celebrate = kind === "baseline" || improved;
    return (
      <div className="max-w-[720px] pb-16">
        <Confetti fire={celebrate} />
        {header("Vero's verdict")}
        {stepBar(warmup ? 2 : 1)}
        <div className="mt-6 grid grid-cols-[112px_1fr] md:grid-cols-[150px_1fr] gap-4 md:gap-6 items-center rise">
          <Vero pose={celebrate ? "cheer" : "perched"} size={150} className="w-[112px] h-[112px] md:w-[150px] md:h-[150px]" />
          <div>
            <p className="label">{kind === "baseline" ? "Baseline set" : celebrate ? "Session complete" : "Logged"}</p>
            <p className="font-display text-[22px] md:text-[28px] leading-tight tracking-[-0.02em] mt-2">{session.ai.oneLiner}</p>
          </div>
        </div>
        <FeedbackView session={session} previous={previous} previousSessions={sessions} average={averageScores(sessions)} xpEarned={result?.xp} streak={result?.streak} hideLine className="mt-8" />
        <div className="mt-10 flex flex-col gap-3">
          <button type="button" className="btn-accent btn-block min-h-[60px]" onClick={finish}>
            {kind === "baseline" ? "Start training" : "Done"}
          </button>
          <button type="button" className="btn-ghost btn-block" onClick={async () => { await saveNotes(); router.push(`/session/${session.id}`); }}>
            Watch the tape
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function PromptBlock({ material, showParagraph }: { material: SessionMaterial; showParagraph?: boolean }) {
  return (
    <div>
      <p className="label">Your prompt</p>
      <p className="font-display font-medium text-[30px] md:text-[48px] leading-[1.02] tracking-[-0.03em] mt-3">{material.prompt}</p>
      {material.promptExtra && material.promptExtra.length > 0 && material.segmentSec && (
        <ol className="mt-4 space-y-1.5">
          {material.promptExtra.map((p, i) => (
            <li key={p} className="flex gap-3 text-[15px]">
              <span className="num text-[11px] text-ink-3 mt-[5px]">{String(i + 1).padStart(2, "0")}</span>
              <span>{p}</span>
              <span className="ml-auto num text-[11px] text-ink-3 mt-[5px]">{material.segmentSec}s</span>
            </li>
          ))}
        </ol>
      )}
      {showParagraph && material.paragraph && <p className="mt-5 text-[17px] leading-relaxed">{material.paragraph}</p>}
      {material.passage && <PassageBlock passage={material.passage} className="mt-5" />}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeFlow />
    </Suspense>
  );
}
