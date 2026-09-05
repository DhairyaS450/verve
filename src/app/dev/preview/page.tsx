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
  nextFocusSkillId: "fillers",
  oneLiner: "Good bones. Your ums are hiding a clear thinker.",
  model: "mock",
  analyzedAt: Date.now(),
};

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
  const [tab, setTab] = useState("feedback");
  const tabs = ["feedback", "record", "progress", "skills", "wheel"];
  return (
    <div className="max-w-[720px] mx-auto px-5 py-8">
      <div className="flex gap-4 mb-8">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`label-ink min-h-[40px] border-b-2 ${tab === t ? "border-ink" : "border-transparent text-ink-3"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "feedback" && <FeedbackView session={MOCK_SESSION} previous={MOCK_PREV} xpEarned={84} streak={4} nextDrillName="One breath, one sentence" showTapeLink />}
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
