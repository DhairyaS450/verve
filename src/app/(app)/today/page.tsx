"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getPlan, getSkillStates, listSessions, savePlan } from "@/lib/db";
import { buildPlan, planBlocks, planIsCurrent, planMinutes } from "@/lib/planner";
import type { PlanDoc, SessionDoc, SkillState } from "@/lib/types";
import { DRILL_MAP } from "@/content/drills";
import { SKILL_MAP } from "@/content/skills";
import { VeroLine } from "@/components/VeroMark";
import { Vero } from "@/components/Vero";
import { Metric } from "@/components/Metrics";
import { fmt1, localDateStr, relativeDay } from "@/lib/format";
import { liveStreak } from "@/lib/xp";
import { VERO } from "@/content/vero";

export default function TodayPage() {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      const today = localDateStr();
      const [ss, sk, existing] = await Promise.all([listSessions(profile.uid, 40), getSkillStates(profile.uid), getPlan(profile.uid, today)]);
      if (!alive) return;
      let p: PlanDoc;
      if (planIsCurrent(existing, profile)) p = existing;
      else {
        p = buildPlan({ profile, skills: sk, sessions: ss, date: today });
        await savePlan(profile.uid, p);
      }
      setSessions(ss);
      setSkills(sk);
      setPlan(p);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, profile?.totalSessions, profile?.sessionMinutes]);

  if (!profile || !ready || !plan) {
    return (
      <div className="pt-6">
        <p className="label">Today</p>
        <div className="mt-4 h-[56px] w-[60%] bg-paper-2" />
      </div>
    );
  }

  const warmup = DRILL_MAP[plan.warmupId];
  const blocks = planBlocks(plan);
  const focus = SKILL_MAP[plan.focusSkillId];
  const analyzed = sessions.filter((s) => s.status === "analyzed" && s.ai);
  const last = analyzed[0];
  const prev = analyzed[1];
  const streak = liveStreak(profile.streak, localDateStr());
  const total = planMinutes(plan);
  const todaySession = sessions.find((s) => s.date === localDateStr() && s.status === "analyzed" && s.kind === "daily" && (!s.blockCount || (s.blockIndex ?? 1) >= s.blockCount));
  const done = plan.completed || Boolean(todaySession);
  const rows: { label: string; title: string; minutes: number; sub?: string }[] = [
    ...(warmup && plan.drillId !== "m-baseline" ? [{ label: "Warmup", title: warmup.name, minutes: warmup.minutes }] : []),
    ...blocks.map((b, i) => {
      const d = DRILL_MAP[b.drillId];
      const f = SKILL_MAP[b.focusSkillId];
      return { label: blocks.length > 1 ? `Drill ${i + 1} · ${f?.name ?? ""}` : "Drill", title: d.name, minutes: d.minutes, sub: i === 0 ? d.intro : b.reason };
    }),
  ];

  return (
    <div className="pb-12 md:grid md:grid-cols-[1fr_300px] md:gap-16">
      <div>
        <p className="label">
          Today <span className="text-ink-3">· {relativeDay(localDateStr()).replace("Today", new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }))}</span>
        </p>

        {!done ? (
          <>
            <p className="mt-8 md:mt-14 text-[13px] text-accent font-semibold tracking-[0.1em] uppercase">Focus</p>
            <h1 className="font-display font-medium text-[44px] md:text-[80px] leading-[0.96] tracking-[-0.04em] mt-2 rise">{focus?.name ?? "Speak"}</h1>
            <VeroLine className="mt-5 rise-1" muted>
              {plan.reason}
            </VeroLine>

            <ol className="mt-10 border-t border-ink rise-2">
              {rows.map((r, i) => (
                <li key={i} className="grid grid-cols-[36px_1fr_auto] items-baseline gap-3 py-4 border-b border-line">
                  <span className="num text-[12px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="label block">{r.label}</span>
                    <span className="font-display text-[20px] md:text-[24px] leading-tight block mt-1">{r.title}</span>
                    {r.sub && <span className="text-[13px] text-ink-2 block mt-1">{r.sub}</span>}
                  </span>
                  <span className="num text-[13px] text-ink-2">{r.minutes} min</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center rise-3">
              <Link href="/practice?kind=daily" className="btn-accent btn-block md:w-auto md:min-w-[260px] text-[16px] min-h-[64px]">
                Start · {total} min
              </Link>
              <span className="text-[13px] text-ink-2 md:ml-4">
                <Link href="/skills" className="underline underline-offset-4">
                  Or pick a drill yourself
                </Link>
                <span className="text-ink-3"> · </span>
                <Link href="/roleplay" className="underline underline-offset-4">
                  Roleplay prep
                </Link>
              </span>
            </div>
          </>
        ) : (
          <>
            <Vero pose="perched" size={120} className="mt-6 -mb-4 rise" />
            <p className="mt-8 md:mt-10 text-[13px] text-good font-semibold tracking-[0.1em] uppercase">Done for today</p>
            <h1 className="font-display font-medium text-[44px] md:text-[72px] leading-[0.96] tracking-[-0.04em] mt-2 rise">{VERO.streak(streak)}</h1>
            {last?.ai && (
              <VeroLine className="mt-5 rise-1" muted>
                {last.ai.oneLiner}
              </VeroLine>
            )}
            <div className="mt-10 flex flex-col gap-3 md:flex-row rise-2">
              <Link href="/skills" className="btn btn-block md:w-auto md:min-w-[240px]">
                Go again · free practice
              </Link>
              {last && (
                <Link href={`/session/${last.id}`} className="btn-ghost btn-block md:w-auto">
                  Review today&apos;s tape
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <aside className="mt-14 md:mt-0 md:border-l md:border-line md:pl-10">
        <p className="label">Last session</p>
        {last?.ai ? (
          <div className="mt-4 space-y-6">
            <Metric label="Fillers / min" value={fmt1(last.ai.fillers.perMin)} delta={prev?.ai ? Math.round((last.ai.fillers.perMin - prev.ai.fillers.perMin) * 10) / 10 : null} lowerIsBetter size="lg" />
            <div className="hairline pt-4">
              <p className="label">Biggest fix</p>
              <p className="font-display text-[20px] leading-tight mt-1">{last.ai.topFix.title}</p>
              <p className="text-[13px] text-ink-2 mt-1">{last.ai.topFix.how}</p>
            </div>
            <Link href="/progress" className="text-[13px] underline underline-offset-4 text-ink-2">
              All progress
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-[14px] text-ink-3">{VERO.empty}</p>
        )}
        <div className="hairline mt-8 pt-4">
          <p className="label">Skills started</p>
          <p className="metric text-[40px] mt-1">{Object.values(skills).filter((s) => s.sessions > 0).length}</p>
        </div>
      </aside>
    </div>
  );
}
