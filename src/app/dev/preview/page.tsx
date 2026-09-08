"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import type { SessionDoc, SkillState } from "@/lib/types";
import { FeedbackView } from "@/components/FeedbackView";
import { CameraStage } from "@/components/CameraStage";
import { TrendChart } from "@/components/TrendChart";
import { SkillTree } from "@/components/SkillTree";
import { TopicWheel } from "@/components/TopicWheel";
import { FrameworkStrip } from "@/components/FrameworkStrip";
import { FRAMEWORK_MAP } from "@/content/frameworks";
import { VeroLine } from "@/components/VeroMark";
import { Transcript } from "@/components/Transcript";
import { SessionList } from "@/components/SessionList";
import { Vero } from "@/components/Vero";
import { Flame } from "@/components/Flame";
import { Confetti } from "@/components/Confetti";
import { averageScores, decideFocus } from "@/lib/coach";
import { buildPlan, planBlocks, planMinutes } from "@/lib/planner";
import { DRILL_MAP } from "@/content/drills";
import { SKILL_MAP } from "@/content/skills";
import type { RubricResult, UserProfile } from "@/lib/types";
import { CASES } from "@/content/cases";
import { FORMATS, rubricFor } from "@/content/roleplay";
import { CaseBrief, JudgeQuestion, PiChecklist, PrepPad, RubricView } from "@/components/Roleplay";

const MOCK_AI: NonNullable<SessionDoc["ai"]> = {
  transcript: "So, um, traffic cones are, like, one of those things you never think about. Um, first, they mark danger. Second, they, uh, guide traffic. And third, you know, they're just orange. The reason I'm telling you this is...",
  wordCount: 145,
  wpm: 138,
  fillers: { total: 7, perMin: 6.2, top: [{ word: "um", count: 4 }, { word: "like", count: 2 }, { word: "you know", count: 1 }] },
  scores: { clarity: 6.5, structure: 5, vocalVariety: 4, energy: 6, presence: 6, engagement: 5.5, overall: 5.6 },
  topFix: { skillId: "fillers", title: "Replace um with silence", why: "Seven fillers in 68 seconds, mostly at sentence starts.", how: "Close your mouth, inhale, then start the sentence." },
  win: { title: "Clear three-part structure", detail: "You numbered your points out loud at 0:12, 0:31 and 0:49." },
  framework: { followed: false, missing: ["Final point"] },
  moments: [
    { t: 12, kind: "good", note: "Numbered the first point clearly" },
    { t: 27, kind: "fix", note: "Three ums before the second point" },
    { t: 55, kind: "fix", note: "Trailed off instead of landing" },
  ],
  observations: [
    { tag: "fillers", skillId: "fillers", severity: 2, incident: false, note: "Seven fillers, mostly at sentence starts." },
    { tag: "monotone", skillId: "pitch", severity: 2, incident: false, note: "Pitch stayed within four semitones." },
    { tag: "cut-off-by-timer", skillId: null, severity: 1, incident: true, note: "The clock ended the last sentence." },
  ],
  nextFocusSkillId: "fillers",
  oneLiner: "Good bones. Your ums are hiding a clear thinker.",
  model: "mock",
  analyzedAt: Date.now(),
};

/** A history where vocal variety has sat at ~6 for five sessions and monotone keeps getting tagged. */
function mockHistory(n: number, opts: { monotone?: boolean; withObs?: boolean } = {}): SessionDoc[] {
  return Array.from({ length: n }, (_, i) => ({
    ...MOCK_SESSION,
    id: `h${i}`,
    createdAt: Date.now() - (i + 1) * 86_400_000,
    date: `2026-09-0${5 - i}`,
    audio: { durationSec: 60, speakingRatio: 0.8, pauseCount: 4, longestPauseSec: 1.2, meanPauseSec: 0.7, pitchMedianHz: 120, pitchSpreadSemitones: opts.monotone ? 3.9 : 8.5, varietyScore: 20, volumeMeanDb: -22, volumeRangeDb: 8, monotone: Boolean(opts.monotone), envelope: [] },
    ai: {
      ...MOCK_AI,
      scores: { clarity: 6.5, structure: 6.5, vocalVariety: 6, energy: 6, presence: 6.5, engagement: 6.5, overall: 6.3 },
      fillers: { ...MOCK_AI.fillers, perMin: 2 + i * 0.5, total: 3 },
      observations: opts.withObs === false ? undefined : [{ tag: "monotone", skillId: "pitch", severity: 2, incident: false, note: "Flat melody." }, { tag: "cut-off-by-timer", skillId: null, severity: 1, incident: true, note: "Timer." }],
      topFix: { skillId: "sentence-endings", title: "Finish your sentences", why: "Cut off at the end.", how: "Land it." },
      nextFocusSkillId: "sentence-endings",
    },
  }));
}

const MOCK_PROFILE: UserProfile = { uid: "u", displayName: "D", email: "", onboarded: true, createdAt: 0, streak: { count: 3, lastDate: null, best: 3 }, xp: 300, totalSessions: 5, sessionMinutes: 10, goal: "spot" };
const UNLOCKED_ALL: Record<string, SkillState> = Object.fromEntries(["breath", "pause", "articulators", "fillers", "prep", "three-two-one", "wheel-60", "word-association", "story-formula", "posture", "eye-contact", "threading"].map((id) => [id, { id, xp: 40, level: 1, sessions: 1 }]));

const coachCases = (): { name: string; profile: UserProfile; sessions: SessionDoc[] }[] => [
  { name: "Timer cut-offs + monotone ×5, no block", profile: MOCK_PROFILE, sessions: mockHistory(5, { monotone: true }) },
  { name: "Same, but day 2 of a fillers block, not yet improved", profile: { ...MOCK_PROFILE, focus: { skillId: "fillers", since: "2026-09-04", sessions: 1, startAvg: 6.5, startFillers: 2.5 } }, sessions: mockHistory(5, { monotone: true }) },
  { name: "Fillers block that already improved (8 → 2.5)", profile: { ...MOCK_PROFILE, focus: { skillId: "fillers", since: "2026-09-04", sessions: 1, startAvg: 6.5, startFillers: 8 } }, sessions: mockHistory(5, { monotone: true }) },
  { name: "Legacy sessions without observations, healthy pitch", profile: MOCK_PROFILE, sessions: mockHistory(4, { monotone: false, withObs: false }) },
  { name: "Only the baseline so far", profile: MOCK_PROFILE, sessions: mockHistory(1, { monotone: true }) },
  { name: "No sessions", profile: MOCK_PROFILE, sessions: [] },
];

const MOCK_SESSION: SessionDoc = {
  id: "mock1",
  uid: "u",
  createdAt: Date.now(),
  date: "2026-09-04",
  kind: "daily",
  drillId: "m-321",
  drillName: "3-2-1 on an object",
  skillIds: ["three-two-one", "wheel-60"],
  status: "analyzed",
  ai: MOCK_AI,
  xp: 84,
};
const MOCK_PREV: SessionDoc = { ...MOCK_SESSION, id: "mock0", date: "2026-09-03", drillName: "60-second wheel", ai: { ...MOCK_AI, wpm: 162, fillers: { ...MOCK_AI.fillers, perMin: 9.1 }, scores: { ...MOCK_AI.scores, overall: 4.8, vocalVariety: 3.5 } } };

const MOCK_SKILLS: Record<string, SkillState> = {
  fillers: { id: "fillers", xp: 120, level: 2, sessions: 4, lastScore: 6 },
  "wheel-60": { id: "wheel-60", xp: 60, level: 1, sessions: 2 },
  prep: { id: "prep", xp: 260, level: 3, sessions: 5 },
  "three-two-one": { id: "three-two-one", xp: 40, level: 1, sessions: 1 },
  breath: { id: "breath", xp: 950, level: 5, sessions: 12 },
};

export default function Preview() {
  if (process.env.NODE_ENV === "production") notFound();
  const [tab, setTab] = useState("vero");
  const [boom, setBoom] = useState(0);
  const tabs = ["roleplay", "plan", "coach", "vero", "feedback", "record", "progress", "skills", "wheel"];
  const rpCase = CASES.find((c) => c.id === "deca-sem-26-districtevent1") ?? CASES[0];
  const mockRubric: RubricResult = {
    org: "DECA",
    category: "series",
    items: rubricFor("series", rpCase.pis).map((s, i) => ({ id: s.id, label: s.label, max: s.max, points: [12, 9, 6, 11, 3, 5, 4, 5, 3, 4][i] ?? Math.round(s.max * 0.7), note: i === 2 ? "Named the theories, never applied them to fans." : "" })),
    total: 62,
    max: 100,
    missed: [rpCase.pis[4]],
  };
  return (
    <div className="max-w-[720px] mx-auto px-5 py-8">
      <div className="flex gap-4 mb-8">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`label-ink min-h-[40px] border-b-2 ${tab === t ? "border-ink" : "border-transparent text-ink-3"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "vero" && (
        <div className="space-y-10">
          <div className="flex items-center justify-between h-[60px] border-b border-line">
            <span className="font-display text-[20px] font-semibold tracking-[-0.03em]">VERVE</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Flame size={24} state="cold" /><span className="num font-display text-[21px]">0</span></span>
              <span className="flex items-center gap-1.5"><Flame size={24} state="lit" /><span className="num font-display text-[21px]">4</span></span>
              <span className="flex items-center gap-1.5"><Flame size={24} state="hot" /><span className="num font-display text-[21px]">12</span></span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(["perched", "welcome", "cheer", "notes"] as const).map((p) => (
              <div key={p} className="flex flex-col items-center gap-2">
                <Vero pose={p} size={150} />
                <span className="label">{p}</span>
              </div>
            ))}
          </div>
          <div className="bg-ink p-6 flex items-center gap-6">
            <Vero pose="welcome" size={120} className="text-paper" cut="var(--ink)" />
            <Vero pose="cheer" size={120} className="text-paper" cut="var(--ink)" />
          </div>
          <button type="button" className="btn" onClick={() => setBoom((b) => b + 1)}>
            Fire confetti
          </button>
          <Confetti key={boom} fire={boom > 0} />
        </div>
      )}
      {tab === "roleplay" && (
        <div className="space-y-12">
          <CaseBrief c={rpCase} format={FORMATS["deca-series"]} />
          <PrepPad org="DECA" value="" onChange={() => {}} className="hairline-strong pt-5" />
          <div className="hairline-strong pt-5">
            <PiChecklist pis={rpCase.pis} checked={[1, 2]} onToggle={() => {}} />
            <JudgeQuestion q={rpCase.questions[0]} index={0} total={2} nextLabel="Next question" onNext={() => {}} className="mt-4" />
          </div>
          <RubricView rubric={mockRubric} />
        </div>
      )}
      {tab === "plan" && (
        <ol className="divide-y divide-line border-t border-line">
          {([5, 10, 15] as const).map((m) => {
            const sessions = mockHistory(5, { monotone: true });
            const profile = { ...MOCK_PROFILE, sessionMinutes: m, focus: { skillId: "fillers", since: "2026-09-04", sessions: 1, startAvg: 6.5, startFillers: 2.5, reason: "Day 2 of 3 on filler control." } };
            const p = buildPlan({ profile, skills: UNLOCKED_ALL, sessions, date: "2026-09-07" });
            return (
              <li key={m} className="py-4" data-minutes={m} data-total={planMinutes(p)} data-blocks={planBlocks(p).length}>
                <p className="label">
                  {m} min · plan is {planMinutes(p)} min · {planBlocks(p).length} drill{planBlocks(p).length > 1 ? "s" : ""}
                </p>
                <p className="text-[14px] mt-1">Warmup: {DRILL_MAP[p.warmupId]?.name} ({DRILL_MAP[p.warmupId]?.minutes} min)</p>
                {planBlocks(p).map((b, i) => (
                  <p key={b.drillId} className="text-[14px]">
                    Drill {i + 1}: {DRILL_MAP[b.drillId]?.name} ({DRILL_MAP[b.drillId]?.minutes} min) · focus {SKILL_MAP[b.focusSkillId]?.name} · {b.reason}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      )}
      {tab === "coach" && (
        <ol className="divide-y divide-line border-t border-line">
          {coachCases().map((c) => {
            const d = decideFocus({ profile: c.profile, sessions: c.sessions, skills: UNLOCKED_ALL });
            return (
              <li key={c.name} className="py-4" data-case={c.name} data-skill={d.skillId} data-kind={d.evidence.kind}>
                <p className="label">{c.name}</p>
                <p className="font-display text-[22px] mt-1">{d.skillId}</p>
                <p className="text-[14px] text-ink-2">{d.reason}</p>
                <p className="text-[11px] text-ink-3 num">{JSON.stringify(d.evidence)}</p>
              </li>
            );
          })}
        </ol>
      )}
      {tab === "feedback" && (
        <FeedbackView session={{ ...MOCK_SESSION, coach: { skillId: "pitch", reason: "Monotone in 4 of your last 5 sessions.", evidence: { kind: "pattern", tag: "monotone", count: 4, of: 5 } } }} previous={MOCK_PREV} previousSessions={mockHistory(5, { monotone: true })} average={averageScores(mockHistory(5, { monotone: true }))} xpEarned={84} streak={4} nextDrillName="One breath, one sentence" showTapeLink />
      )}
      {tab === "record" && (
        <div className="-mx-5">
          <div className="px-5">
            <p className="font-display text-[26px] leading-tight">Traffic cone</p>
            <FrameworkStrip framework={FRAMEWORK_MAP["three-two-one"]} compact className="mt-3" />
          </div>
          <CameraStage stream={null} hasVideo={false} analyzer={null} recording elapsed={23} total={75} className="mt-4" />
          <div className="px-5 mt-4">
            <button className="btn-accent btn-block min-h-[60px]">Keep going · 0:02</button>
          </div>
        </div>
      )}
      {tab === "progress" && (
        <>
          <TrendChart
            points={[
              { x: "1 Sep", y: 11.2 },
              { x: "2 Sep", y: 9.1 },
              { x: "3 Sep", y: 8.4 },
              { x: "4 Sep", y: 6.2 },
              { x: "5 Sep", y: 5.1 },
            ]}
            band={[0, 2]}
            lowerIsBetter
          />
          <SessionList sessions={[MOCK_SESSION, MOCK_PREV]} className="mt-10" />
          <Transcript text={MOCK_AI.transcript} className="mt-10" />
        </>
      )}
      {tab === "skills" && <SkillTree skills={MOCK_SKILLS} focusId="fillers" />}
      {tab === "wheel" && (
        <>
          <VeroLine muted>Vinh Giang&apos;s anti-rambling tool. Use the numbers.</VeroLine>
          <TopicWheel candidates={["Stapler", "Umbrella", "Patience", "Luck", "Kite", "Doorbell", "Silence", "Toaster"]} final="Traffic cone" className="mt-8" />
          <FrameworkStrip framework={FRAMEWORK_MAP["three-two-one"]} className="mt-10" />
        </>
      )}
    </div>
  );
}
