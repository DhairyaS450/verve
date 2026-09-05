"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { getSkillStates, listSessions } from "@/lib/db";
import type { SessionDoc, SkillState } from "@/lib/types";
import { BRANCHES, skillsInBranch } from "@/content/skills";
import { TrendChart } from "@/components/TrendChart";
import { SessionList } from "@/components/SessionList";
import { Metric } from "@/components/Metrics";
import { fmt1, localDateStr, shortDate } from "@/lib/format";
import { liveStreak, userLevel } from "@/lib/xp";
import { VERO } from "@/content/vero";

type MetricKey = "fillers" | "wpm" | "variety" | "overall";
const TABS: { key: MetricKey; label: string; unit?: string; band?: [number, number]; lower?: boolean; max?: number }[] = [
  { key: "fillers", label: "Fillers / min", band: [0, 2], lower: true },
  { key: "wpm", label: "Pace", unit: "wpm", band: [120, 160], max: 200 },
  { key: "variety", label: "Vocal variety", band: [7, 10], max: 10 },
  { key: "overall", label: "Overall", band: [7, 10], max: 10 },
];

export default function ProgressPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [tab, setTab] = useState<MetricKey>("fillers");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      const [ss, sk] = await Promise.all([listSessions(profile.uid, 120), getSkillStates(profile.uid)]);
      if (!alive) return;
      setSessions(ss);
      setSkills(sk);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [profile]);

  const analyzed = useMemo(() => sessions.filter((s) => s.status === "analyzed" && s.ai).reverse(), [sessions]);
  const points = useMemo(
    () =>
      analyzed.map((s) => ({
        x: shortDate(s.date),
        y: tab === "fillers" ? s.ai!.fillers.perMin : tab === "wpm" ? s.ai!.wpm : tab === "variety" ? s.ai!.scores.vocalVariety : s.ai!.scores.overall,
      })),
    [analyzed, tab],
  );
  const t = TABS.find((x) => x.key === tab)!;
  const first = analyzed[0]?.ai;
  const last = analyzed[analyzed.length - 1]?.ai;

  if (!profile) return null;
  const streak = liveStreak(profile.streak, localDateStr());
  const lvl = userLevel(profile.xp ?? 0);

  return (
    <div className="pb-12">
      <p className="label">Progress</p>
      <div className="mt-4 grid grid-cols-3 gap-4 md:max-w-[560px]">
        <Metric label="Sessions" value={String(analyzed.length)} size="lg" />
        <Metric label="Streak" value={String(streak)} unit="days" size="lg" />
        <Metric label={`Level ${lvl.level}`} value={lvl.name} size="md" hint={lvl.nextXp ? `${profile.xp} / ${lvl.nextXp} xp` : `${profile.xp} xp`} />
      </div>

      <section className="mt-12 md:grid md:grid-cols-[1fr_280px] md:gap-16">
        <div>
          <div className="flex gap-5 overflow-x-auto hairline-strong pt-3 [scrollbar-width:none]">
            {TABS.map((x) => (
              <button key={x.key} type="button" onClick={() => setTab(x.key)} aria-pressed={tab === x.key} className={clsx("label-ink min-h-[40px] whitespace-nowrap border-b-2 -mb-px", tab === x.key ? "border-ink" : "border-transparent text-ink-3")}>
                {x.label}
              </button>
            ))}
          </div>
          {ready && points.length > 0 ? (
            <TrendChart points={points} band={t.band} lowerIsBetter={t.lower} unit={t.unit} max={t.max} className="mt-4" />
          ) : (
            <p className="mt-6 text-[14px] text-ink-3">{ready ? VERO.empty : "Loading"}</p>
          )}
        </div>
        <div className="mt-8 md:mt-0">
          <p className="label">Since your baseline</p>
          {first && last && analyzed.length > 1 ? (
            <dl className="mt-3 divide-y divide-line border-t border-line">
              <Row label="Fillers / min" a={fmt1(first.fillers.perMin)} b={fmt1(last.fillers.perMin)} good={last.fillers.perMin <= first.fillers.perMin} />
              <Row label="Pace (wpm)" a={String(first.wpm)} b={String(last.wpm)} good={Math.abs(last.wpm - 140) <= Math.abs(first.wpm - 140)} />
              <Row label="Vocal variety" a={fmt1(first.scores.vocalVariety)} b={fmt1(last.scores.vocalVariety)} good={last.scores.vocalVariety >= first.scores.vocalVariety} />
              <Row label="Structure" a={fmt1(first.scores.structure)} b={fmt1(last.scores.structure)} good={last.scores.structure >= first.scores.structure} />
              <Row label="Overall" a={fmt1(first.scores.overall)} b={fmt1(last.scores.overall)} good={last.scores.overall >= first.scores.overall} />
            </dl>
          ) : (
            <p className="mt-3 text-[14px] text-ink-3">Two sessions in, this fills up.</p>
          )}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between hairline-strong pt-3">
          <h2 className="font-display text-[22px] font-medium">Skill levels</h2>
          <span className="label">0–5 per branch</span>
        </div>
        <ol className="mt-4 grid md:grid-cols-3 gap-x-10 gap-y-4">
          {BRANCHES.map((b) => {
            const list = skillsInBranch(b.id);
            const lv = list.map((s) => skills[s.id]?.level ?? 0);
            const avg = lv.reduce((a, c) => a + c, 0) / Math.max(1, lv.length);
            const started = list.filter((s) => (skills[s.id]?.sessions ?? 0) > 0).length;
            return (
              <li key={b.id} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                <span className="font-display text-[15px]">{b.name}</span>
                <span className="h-[6px] bg-paper-3 block">
                  <span className="h-full bg-ink block" style={{ width: `${(avg / 5) * 100}%` }} />
                </span>
                <span className="num text-[12px] text-ink-2 w-[52px] text-right">
                  {started}/{list.length}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between hairline-strong pt-3 mb-3">
          <h2 className="font-display text-[22px] font-medium">History</h2>
          <span className="label">{sessions.length} recorded</span>
        </div>
        <SessionList sessions={sessions} />
      </section>
    </div>
  );
}

function Row({ label, a, b, good }: { label: string; a: string; b: string; good: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-2.5">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="num text-[13px] text-ink-3">{a}</dd>
      <dd className={clsx("num font-display text-[20px] w-[52px] text-right", good ? "text-good" : "text-accent")}>{b}</dd>
    </div>
  );
}
