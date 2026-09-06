"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSession, getSkillStates, listSessions, patchSession } from "@/lib/db";
import type { SessionDoc, SkillState } from "@/lib/types";
import { DriveVideo } from "@/components/DriveVideo";
import { FeedbackView } from "@/components/FeedbackView";
import { Notes, Transcript } from "@/components/Transcript";
import { VeroMark } from "@/components/VeroMark";
import { analyzeSession } from "@/lib/analysis-client";
import { relativeDay } from "@/lib/format";
import { DRILL_MAP } from "@/content/drills";
import { averageScores } from "@/lib/coach";

export default function SessionPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [previous, setPrevious] = useState<SessionDoc | null>(null);
  const [earlier, setEarlier] = useState<SessionDoc[]>([]);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!profile || !id) return;
    let alive = true;
    (async () => {
      const [s, all, sk] = await Promise.all([getSession(profile.uid, id), listSessions(profile.uid, 60), getSkillStates(profile.uid)]);
      if (!alive) return;
      if (!s) {
        setMissing(true);
        return;
      }
      setSession(s);
      setNotes(s.notes ?? "");
      setSessions(all);
      setSkills(sk);
      const idx = all.findIndex((x) => x.id === s.id);
      const before = idx >= 0 ? all.slice(idx + 1) : all.filter((x) => x.createdAt < s.createdAt);
      setEarlier(before);
      setPrevious(before.find((x) => x.status === "analyzed" && x.ai) ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [profile, id]);

  const save = async () => {
    if (!profile || !session) return;
    setSaving(true);
    await patchSession(profile.uid, session.id, { notes: notes.trim() }).catch(() => {});
    setSaving(false);
  };

  const retry = async () => {
    if (!profile || !session?.recording) return;
    setBusy(true);
    setError(null);
    try {
      const { analysis, xp, coach } = await analyzeSession({ profile, session, skills, sessions });
      setSession({ ...session, ai: analysis, status: "analyzed", xp, coach });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <div className="pt-4">
        <p className="label">Session</p>
        <h1 className="font-display text-[30px] mt-3">Not found.</h1>
        <button type="button" className="btn-ghost mt-6" onClick={() => router.back()}>
          Back
        </button>
      </div>
    );
  }
  if (!profile || !session) {
    return (
      <div className="min-h-[50dvh] flex items-center justify-center text-ink-3">
        <VeroMark size={22} className="blink" />
      </div>
    );
  }

  const drill = DRILL_MAP[session.drillId];

  return (
    <div className="pb-16 md:grid md:grid-cols-[1fr_1fr] md:gap-12">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="label">
            {relativeDay(session.date)} · {session.kind}
          </p>
          <Link href="/progress" className="label-ink min-h-[44px] flex items-center">
            History
          </Link>
        </div>
        <h1 className="font-display font-medium text-[32px] md:text-[44px] leading-[1] tracking-[-0.03em] mt-2">{session.drillName}</h1>
        {session.prompt && <p className="mt-2 text-[15px] text-ink-2">{session.prompt}</p>}
        {session.promptExtra && session.promptExtra.length > 0 && (
          <ol className="mt-2 text-[13px] text-ink-3 space-y-0.5">
            {session.promptExtra.map((p, i) => (
              <li key={p}>
                {i + 1}. {p}
              </li>
            ))}
          </ol>
        )}
        {session.recording ? (
          <DriveVideo
            uid={profile.uid}
            fileId={session.recording.driveFileId}
            mimeType={session.recording.mimeType}
            moments={session.ai?.moments}
            envelope={session.audio?.envelope}
            webViewLink={session.recording.webViewLink}
            className="mt-5"
          />
        ) : (
          <p className="mt-5 text-[14px] text-ink-3">No recording was saved for this session.</p>
        )}
        {session.audio && (
          <dl className="mt-5 grid grid-cols-3 gap-3 hairline pt-4">
            <Stat label="Pauses" v={String(session.audio.pauseCount)} hint={`longest ${session.audio.longestPauseSec}s`} />
            <Stat label="Pitch range" v={`${session.audio.pitchSpreadSemitones}`} hint="semitones" />
            <Stat label="Variety" v={`${session.audio.varietyScore}`} hint="/ 100" />
          </dl>
        )}
        <Notes value={notes} onChange={setNotes} onSave={save} saving={saving} className="mt-8" />
      </div>

      <div className="mt-12 md:mt-0">
        {session.ai ? (
          <>
            <FeedbackView session={session} previous={previous} previousSessions={earlier} average={averageScores(earlier)} xpEarned={session.xp} />
            <Transcript text={session.ai.transcript} className="mt-10" />
          </>
        ) : (
          <div className="hairline-strong pt-5">
            <p className="label">{session.status === "failed" ? "Analysis failed" : "Not analyzed"}</p>
            <p className="mt-2 text-[14px] text-ink-2">{session.error ?? "The tape was saved but Vero never reviewed it."}</p>
            {error && <p className="mt-2 text-[13px] text-accent">{error}</p>}
            {session.recording && (
              <button type="button" className="btn mt-5" onClick={retry} disabled={busy}>
                {busy ? "Reviewing" : "Ask Vero to review"}
              </button>
            )}
          </div>
        )}
        {drill && (
          <Link href={`/practice?kind=free&drill=${drill.id}`} className="btn-ghost btn-block mt-8">
            Do this drill again
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v, hint }: { label: string; v: string; hint?: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="metric text-[30px] mt-1">{v}</dd>
      {hint && <dd className="text-[11px] text-ink-3 mt-0.5">{hint}</dd>}
    </div>
  );
}
