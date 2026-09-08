"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPlan, getSkillStates, listSessions, newSessionId, patchSession, savePlan, saveSession } from "@/lib/db";
import { buildPlan, planBlocks, planIsCurrent } from "@/lib/planner";
import { buildMaterial, type SessionMaterial } from "@/lib/material";
import { LiveAudioAnalyzer } from "@/lib/audio/analyzer";
import { Recorder, getSessionStream, stopStream } from "@/lib/recorder";
import { DriveNotConnected, ensureFolder, getAccessToken } from "@/lib/drive";
import { analyzeSession, uploadRecording } from "@/lib/analysis-client";
import type { AudioMetrics, PlanDoc, SessionDoc, SkillState, UserProfile } from "@/lib/types";
import { DRILL_MAP } from "@/content/drills";
import { SKILL_MAP } from "@/content/skills";
import { FRAMEWORK_MAP } from "@/content/frameworks";
import type { Drill, Framework } from "@/content/types";
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

interface Block {
  drill: Drill;
  focusSkillId: string;
  reason: string;
  framework?: Framework;
}

interface Run {
  session: SessionDoc;
  stage: "uploading" | "analyzing" | "done" | "failed";
  uploadPct: number;
  error?: string;
  xp?: number;
  blob: Blob;
  mimeType: string;
  durationSec: number;
  audio: AudioMetrics;
}

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

  const [phase, setPhaseState] = useState<Phase>("loading");
  const phaseRef = useRef<Phase>("loading");
  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDoc | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bi, setBi] = useState(0);
  const [materials, setMaterials] = useState<SessionMaterial[]>([]);
  const [warmupMaterial, setWarmupMaterial] = useState<SessionMaterial | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const sessionsRef = useRef<SessionDoc[]>([]);
  const skillsRef = useRef<Record<string, SkillState>>({});
  const profileRef = useRef<UserProfile | null>(null);

  const [runs, setRuns] = useState<Run[]>([]);
  const runsRef = useRef<Run[]>([]);
  const pipelines = useRef<Promise<void>[]>([]);

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
  const [veroLine, setVeroLine] = useState(VERO.analyzing[0]);
  const [notes, setNotes] = useState("");
  const [latestProfile, setLatestProfile] = useState<UserProfile | null>(null);

  const warmup: Drill | undefined = plan && kind === "daily" ? DRILL_MAP[plan.warmupId] : undefined;
  const block = blocks[bi];
  const drill = block?.drill;
  const framework = block?.framework;
  const focus = block ? SKILL_MAP[block.focusSkillId] : undefined;
  const material = materials[bi];
  const previous = useMemo(() => sessions.find((s) => s.status === "analyzed" && s.ai) ?? null, [sessions]);
  const multi = blocks.length > 1;

  useEffect(() => {
    if (profile && !profileRef.current) profileRef.current = profile;
  }, [profile]);

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
          if (planIsCurrent(existing, profile)) p = existing;
          else {
            p = buildPlan({ profile, skills: sk, sessions: ss, date: today });
            await savePlan(profile.uid, p);
          }
        }
        if (!alive) return;
        const pb = kind === "daily" ? planBlocks(p) : [{ drillId: p.drillId, focusSkillId: p.focusSkillId, reason: p.reason }];
        const blks: Block[] = pb.map((b) => {
          const d = DRILL_MAP[b.drillId];
          return { drill: d, focusSkillId: b.focusSkillId, reason: b.reason, framework: d.frameworkId ? FRAMEWORK_MAP[d.frameworkId] : undefined };
        });
        let rp = ss.slice(0, 20).map((s) => s.prompt ?? "").filter(Boolean);
        const mats: SessionMaterial[] = [];
        for (const b of blks) {
          const m = buildMaterial(b.drill, rp);
          mats.push(m);
          if (m.prompt) rp = [...rp, m.prompt];
        }
        setRecentPrompts(rp);
        setSessions(ss);
        sessionsRef.current = ss;
        skillsRef.current = sk;
        profileRef.current = profile;
        setPlan(p);
        setBlocks(blks);
        setMaterials(mats);
        const w = kind === "daily" ? DRILL_MAP[p.warmupId] : undefined;
        setWarmupMaterial(w ? buildMaterial(w) : null);
        go("setup");
      } catch (e) {
        console.error(e);
        setError("Could not load today's plan.");
        go("error");
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
      go(warmup ? "warmup" : "brief");
    } catch (e) {
      console.error(e);
      setError("Camera or microphone was blocked. Allow access and try again.");
      go("error");
    }
  };

  // ---------------------------------------------------------------- pipeline (per block)
  const updateRun = useCallback((i: number, patch: Partial<Run>) => {
    const next = [...runsRef.current];
    next[i] = { ...next[i], ...patch };
    runsRef.current = next;
    setRuns(next);
    if (phaseRef.current === "review" && next.length > 0 && next.every((r) => r.stage === "done")) go("feedback");
  }, [go]);

  const startPipeline = useCallback(
    (i: number, run: Run, skipUpload = false) => {
      const p = (async () => {
        const prof = profileRef.current;
        if (!prof) return;
        try {
          let withRec: SessionDoc = run.session;
          if (!skipUpload || !run.session.recording) {
            updateRun(i, { stage: "uploading", uploadPct: 0, error: undefined });
            await patchSession(prof.uid, run.session.id, { audio: run.audio, endedBy: run.session.endedBy, status: "uploading" });
            const recording = await uploadRecording({
              profile: prof,
              session: run.session,
              blob: run.blob,
              mimeType: run.mimeType,
              durationSec: run.durationSec,
              onProgress: (f) => updateRun(i, { uploadPct: f }),
            });
            withRec = { ...run.session, audio: run.audio, recording };
          }
          updateRun(i, { session: withRec, stage: "analyzing", error: undefined });
          // Earlier blocks must finish first so this one sees them as history.
          if (i > 0) await pipelines.current[i - 1]?.catch(() => {});
          const earlier = runsRef.current
            .slice(0, i)
            .filter((r) => r.stage === "done")
            .map((r) => r.session);
          const history = [...earlier, ...sessionsRef.current];
          const { analysis, xp, profile: updated, coach, skillUpdates } = await analyzeSession({
            profile: profileRef.current ?? prof,
            session: withRec,
            skills: skillsRef.current,
            sessions: history,
            audio: run.audio,
          });
          profileRef.current = updated;
          setLatestProfile(updated);
          skillsRef.current = { ...skillsRef.current, ...skillUpdates };
          updateRun(i, { session: { ...withRec, ai: analysis, status: "analyzed", xp, coach }, stage: "done", xp });
        } catch (e) {
          console.error(e);
          const msg = e instanceof DriveNotConnected ? "Google Drive is not connected." : (e as Error).message;
          updateRun(i, { stage: "failed", error: msg });
          throw e;
        }
      })();
      pipelines.current[i] = p.catch(() => {});
    },
    [updateRun],
  );

  // ---------------------------------------------------------------- recording
  const startRecording = useCallback(() => {
    if (!drill || !profile || !plan || !block) return;
    go("record");
    setElapsed(0);
    setRecording(false);
    let n = 3;
    setCountdown(n);
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setCountdown(null);
        const s = streamRef.current;
        if (!s) return;
        const rec = new Recorder(s);
        const an = new LiveAudioAnalyzer(s);
        recorderRef.current = rec;
        recAnalyzerRef.current = an;
        setRecAnalyzer(an);
        an.start();
        rec.start();
        setRecording(true);
        endedByRef.current = "user";
        const doc: SessionDoc = {
          id: newSessionId(),
          uid: profile.uid,
          createdAt: Date.now(),
          date: localDateStr(),
          kind,
          warmupId: bi === 0 ? warmup?.id : undefined,
          blockIndex: bi + 1,
          blockCount: blocks.length,
          drillId: drill.id,
          drillName: drill.name,
          skillIds: drill.skillIds,
          focusSkillId: block.focusSkillId,
          frameworkId: drill.frameworkId,
          prompt: material?.prompt,
          promptExtra: material?.promptExtra,
          status: "recording",
        };
        const run: Run = { session: doc, stage: "uploading", uploadPct: 0, blob: new Blob(), mimeType: "", durationSec: 0, audio: { durationSec: 0, speakingRatio: 0, pauseCount: 0, longestPauseSec: 0, meanPauseSec: 0, pitchMedianHz: 0, pitchSpreadSemitones: 0, varietyScore: 0, volumeMeanDb: 0, volumeRangeDb: 0, monotone: false, envelope: [] } };
        const next = [...runsRef.current];
        next[bi] = run;
        runsRef.current = next;
        setRuns(next);
        saveSession(profile.uid, doc).catch(console.error);
      } else setCountdown(n);
    }, 1000);
  }, [drill, profile, plan, block, kind, warmup, material, bi, blocks.length, go]);

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
      const i = bi;
      const existing = runsRef.current[i];
      if (!existing) return;
      const run: Run = { ...existing, blob, mimeType, durationSec, audio, session: { ...existing.session, endedBy: endedByRef.current } };
      const next = [...runsRef.current];
      next[i] = run;
      runsRef.current = next;
      setRuns(next);
      startPipeline(i, run);
      if (i + 1 < blocks.length) {
        setBi(i + 1);
        setElapsed(0);
        setWheelDone(false);
        setTickerDone(false);
        setRespins(0);
        setWheelKey((k) => k + 1);
        go("brief");
      } else {
        stopStream(streamRef.current);
        streamRef.current = null;
        setStream(null);
        try {
          displayAnalyzer?.stop();
        } catch {}
        setDisplayAnalyzer(null);
        go("review");
        if (runsRef.current.length > 0 && runsRef.current.every((r) => r.stage === "done")) go("feedback");
      }
    } catch (e) {
      console.error(e);
      setError("Recording failed. Try again.");
      go("error");
    }
  }, [profile, displayAnalyzer, bi, blocks.length, startPipeline, go]);

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

  // Recording clock + hard stop after the grace period
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

  const retry = (i: number) => {
    const run = runsRef.current[i];
    if (!run) return;
    startPipeline(i, run, Boolean(run.session.recording));
  };

  const saveNotes = async () => {
    if (!profile || !notes.trim()) return;
    await Promise.all(runsRef.current.map((r) => patchSession(profile.uid, r.session.id, { notes: notes.trim() }).catch(() => {})));
  };

  const finish = async () => {
    await saveNotes();
    router.replace("/today");
  };

  const exit = () => {
    stopStream(streamRef.current);
    router.replace(kind === "baseline" ? "/onboarding" : "/today");
  };

  const canRespin = Boolean(drill && material?.prompt && RESPIN_KINDS.has(drill.material.kind));
  const respin = () => {
    if (!drill || !material || respins >= RESPINS) return;
    const exclude = [...recentPrompts, material.prompt ?? ""].filter(Boolean);
    setRecentPrompts(exclude);
    const m = buildMaterial(drill, exclude);
    setMaterials((ms) => ms.map((x, i) => (i === bi ? m : x)));
    setWheelDone(false);
    setWheelKey((k) => k + 1);
    setRespins((r) => r + 1);
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

  const stepNames = [...(warmup ? ["Warmup"] : []), ...blocks.map((_, i) => (multi ? `Drill ${i + 1}` : "Drill")), "Review"];
  const stepIndex = () => {
    const base = warmup ? 1 : 0;
    if (phase === "warmup") return 0;
    if (phase === "brief" || phase === "prep" || phase === "record") return base + bi;
    return base + blocks.length;
  };
  const stepBar = () => {
    const idx = stepIndex();
    return (
      <ol className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${stepNames.length}, 1fr)` }}>
        {stepNames.map((s, i) => (
          <li key={s} className={clsx("h-[2px]", i <= idx ? "bg-ink" : "bg-paper-3")} aria-label={s} />
        ))}
      </ol>
    );
  };

  /** Status of earlier blocks while the next one is being recorded. */
  const backgroundStatus = () => {
    const earlier = runs.slice(0, bi).map((r, i) => ({ r, i })).filter((x) => x.r && x.r.durationSec > 0);
    if (!earlier.length || phase === "review" || phase === "feedback") return null;
    return (
      <ul className="mt-3 space-y-1">
        {earlier.map(({ r, i }) => (
          <li key={i} className="flex items-center gap-2 text-[12px] text-ink-2">
            <VeroMark size={14} className={clsx(r.stage === "done" ? "text-good" : r.stage === "failed" ? "text-accent" : "text-ink-3 blink")} />
            Drill {i + 1} · {r.stage === "uploading" ? `saving ${Math.round(r.uploadPct * 100)}%` : r.stage === "analyzing" ? "Vero is watching" : r.stage === "done" ? "reviewed" : "needs a retry"}
          </li>
        ))}
      </ul>
    );
  };

  if (phase === "loading" || !profile || !plan || !drill || !block) {
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
    const total = (warmup?.minutes ?? 0) + blocks.reduce((a, b) => a + b.drill.minutes, 0);
    const rows: { label: string; title: string; minutes: string; sub?: string }[] = [
      ...(warmup ? [{ label: "Warmup", title: warmup.name, minutes: `${warmup.minutes} min` }] : []),
      ...blocks.map((b, i) => ({
        label: multi ? `Drill ${i + 1} · ${SKILL_MAP[b.focusSkillId]?.name ?? ""}` : "Drill",
        title: b.drill.name,
        minutes: `${b.drill.minutes} min`,
        sub: multi && i > 0 ? b.reason : undefined,
      })),
      { label: "Review", title: "Vero reviews the tape", minutes: "~1 min" },
    ];
    return (
      <div className="max-w-[640px] pb-12">
        {header(kind === "baseline" ? "Baseline" : kind === "free" ? "Free practice" : "Today's session")}
        <h1 className="font-display font-medium text-[40px] md:text-[64px] leading-[0.98] tracking-[-0.035em] mt-6 rise">{SKILL_MAP[blocks[0].focusSkillId]?.name ?? drill.name}</h1>
        <VeroLine className="mt-5 rise-1" muted>
          {kind === "baseline" ? VERO.firstTime : blocks[0].drill.intro}
        </VeroLine>
        <ol className="mt-8 border-t border-ink rise-2">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-3 border-b border-line">
              <span className="num text-[12px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="label block">{r.label}</span>
                <span className="font-display text-[18px] block leading-tight mt-0.5">{r.title}</span>
                {r.sub && <span className="text-[12px] text-ink-2 block mt-0.5">{r.sub}</span>}
              </span>
              <span className="num text-[13px] text-ink-2">{r.minutes}</span>
            </li>
          ))}
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
  if (phase === "warmup" && warmup && warmupMaterial) {
    const total = warmup.minutes * 60;
    const wm = warmupMaterial;
    const ticker = wm.items;
    return (
      <div className="max-w-[720px] pb-12">
        {header("Warmup")}
        {stepBar()}
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
              go("brief");
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
        {header(multi ? `Drill ${bi + 1} of ${blocks.length}` : "Drill")}
        {stepBar()}
        {backgroundStatus()}
        <div className="mt-6">
          <p className="label">
            {drill.name}
            {focus && <span className="text-ink-3"> · {focus.name}</span>}
          </p>
          <VeroLine className="mt-3" muted>
            {multi && bi > 0 ? block.reason : drill.intro}
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
                go("prep");
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
        {stepBar()}
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
        {focus && <p className="px-5 md:px-0 mt-3 text-[13px] text-ink-2">{focus.cue}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------- REVIEW (upload + reflect + analysis)
  if (phase === "review") {
    const failed = runs.filter((r) => r.stage === "failed");
    return (
      <div className="max-w-[640px] pb-12">
        {header("Review")}
        {stepBar()}
        <div className="mt-8">
          <div className="flex items-center gap-5">
            <Vero pose="notes" size={112} className="shrink-0 -ml-2" />
            <p className="font-display text-[22px] md:text-[26px] leading-tight">{runs.some((r) => r.stage === "uploading") ? pick(VERO.uploading) : veroLine}</p>
          </div>
          <ul className="mt-5 space-y-3">
            {runs.map((r, i) => (
              <li key={i}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="label">
                    {multi ? `Drill ${i + 1} · ` : ""}
                    {r.session.drillName}
                  </span>
                  <span className={clsx("num", r.stage === "failed" ? "text-accent" : "text-ink-3")}>
                    {r.stage === "uploading" ? `Saving to Drive · ${Math.round(r.uploadPct * 100)}%` : r.stage === "analyzing" ? "Vero is reviewing" : r.stage === "done" ? "Reviewed" : "Stopped"}
                  </span>
                </div>
                <div className="mt-2 h-[2px] bg-paper-3">
                  <div className={clsx("h-full transition-[width] duration-300", r.stage === "uploading" ? "bg-ink" : r.stage === "failed" ? "bg-accent" : "bg-accent")} style={{ width: r.stage === "uploading" ? `${Math.round(r.uploadPct * 100)}%` : "100%" }} />
                </div>
                {r.stage === "failed" && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[14px]">{r.error}</p>
                    {r.error?.includes("Drive") ? (
                      <a href={`/api/auth/google?next=${encodeURIComponent("/today")}`} className="btn btn-sm self-start">
                        Reconnect Google Drive
                      </a>
                    ) : r.error?.includes("Gemini") ? (
                      <Link href="/settings#gemini" className="btn btn-sm self-start">
                        Open Settings
                      </Link>
                    ) : (
                      <button type="button" className="btn btn-sm self-start" onClick={() => retry(i)}>
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {failed.length > 0 && (
            <button type="button" className="btn-ghost btn-block mt-6" onClick={finish}>
              Skip for now
            </button>
          )}
          {failed.length === 0 && <p className="mt-3 text-[12px] text-ink-3 num">Usually under a minute per drill.</p>}
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
  if (phase === "feedback" && runs.length > 0 && runs.every((r) => r.stage === "done" && r.session.ai)) {
    const totalXp = runs.reduce((a, r) => a + (r.xp ?? 0), 0);
    const streak = liveStreak((latestProfile ?? profile).streak, localDateStr());
    const improvedAny = runs.some((r, i) => {
      const prevAi = i === 0 ? previous?.ai : runs[i - 1].session.ai;
      const ai = r.session.ai!;
      return !prevAi || ai.scores.overall >= prevAi.scores.overall || ai.fillers.perMin < prevAi.fillers.perMin;
    });
    const celebrate = kind === "baseline" || improvedAny;
    const last = runs[runs.length - 1].session.ai!;
    return (
      <div className="max-w-[720px] pb-16">
        <Confetti fire={celebrate} />
        {header("Vero's verdict")}
        {stepBar()}
        <div className="mt-6 grid grid-cols-[112px_1fr] md:grid-cols-[150px_1fr] gap-4 md:gap-6 items-center rise">
          <Vero pose={celebrate ? "cheer" : "perched"} size={150} className="w-[112px] h-[112px] md:w-[150px] md:h-[150px]" />
          <div>
            <p className="label">{kind === "baseline" ? "Baseline set" : multi ? `${runs.length} drills reviewed` : celebrate ? "Session complete" : "Logged"}</p>
            <p className="font-display text-[22px] md:text-[28px] leading-tight tracking-[-0.02em] mt-2">{last.oneLiner}</p>
          </div>
        </div>
        {runs.map((r, i) => {
          const prevSession = i === 0 ? previous : runs[i - 1].session;
          const earlier = [...runs.slice(0, i).map((x) => x.session), ...sessions];
          const isLast = i === runs.length - 1;
          return (
            <div key={r.session.id} className={clsx(multi && "mt-10 hairline-strong pt-6")}>
              {multi && (
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="font-display text-[22px] font-medium">Drill {i + 1} · {SKILL_MAP[r.session.focusSkillId ?? ""]?.name ?? ""}</h2>
                  <span className="label">{r.session.drillName}</span>
                </div>
              )}
              <FeedbackView
                session={r.session}
                previous={prevSession}
                previousSessions={earlier}
                average={averageScores(earlier)}
                xpEarned={isLast ? totalXp : undefined}
                streak={isLast ? streak : undefined}
                hideLine={!multi}
                className="mt-6"
              />
            </div>
          );
        })}
        <div className="mt-10 flex flex-col gap-3">
          <button type="button" className="btn-accent btn-block min-h-[60px]" onClick={finish}>
            {kind === "baseline" ? "Start training" : "Done"}
          </button>
          <button
            type="button"
            className="btn-ghost btn-block"
            onClick={async () => {
              await saveNotes();
              router.push(`/session/${runs[runs.length - 1].session.id}`);
            }}
          >
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
