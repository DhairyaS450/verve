"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { getSkillStates } from "@/lib/db";
import type { SkillState } from "@/lib/types";
import type { Skill } from "@/content/types";
import { SKILL_MAP, SKILLS } from "@/content/skills";
import { SkillTree, levelLabel, nextLevelXp, nodeStatus } from "@/components/SkillTree";
import { allDrillsFor } from "@/lib/planner";
import { FRAMEWORK_MAP } from "@/content/frameworks";

export default function SkillsPage() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<Record<string, SkillState>>({});
  const [selected, setSelected] = useState<Skill | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSkillStates(profile.uid).then(setSkills);
  }, [profile]);

  const started = useMemo(() => Object.values(skills).filter((s) => s.sessions > 0).length, [skills]);
  const elite = useMemo(() => Object.values(skills).filter((s) => s.level >= 5).length, [skills]);

  return (
    <div className="pb-12 md:grid md:grid-cols-[1fr_320px] md:gap-12">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="label">Skill tree</p>
          <p className="label">
            <span className="num text-ink">{started}</span> / {SKILLS.length} started · <span className="num text-ink">{elite}</span> elite
          </p>
        </div>
        <h1 className="font-display font-medium text-[36px] md:text-[56px] leading-[0.98] tracking-[-0.035em] mt-3">Zero to stage.</h1>
        <p className="mt-2 text-[14px] text-ink-2">Tap a node. Practice it whenever you like.</p>
        <Link href="/roleplay" className="mt-4 inline-flex items-center gap-2 label-ink min-h-[44px]">
          Roleplay prep <span className="text-ink-3">· DECA and FBLA cases, judged</span>
        </Link>
        <div className="mt-8">
          <SkillTree skills={skills} selectedId={selected?.id} focusId={profile?.focusSkillId} onSelect={setSelected} />
        </div>
      </div>

      {/* Detail panel: bottom sheet on mobile, side column on desktop */}
      {selected && (
        <aside className="fixed md:sticky md:top-10 md:self-start inset-x-0 bottom-0 md:inset-auto z-50 md:z-auto bg-paper border-t md:border-t-0 md:border-l border-ink md:border-line p-5 md:pl-8 max-h-[70dvh] md:max-h-none overflow-y-auto safe-b rise">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">{SKILL_MAP[selected.id].branch}</p>
              <h2 className="font-display text-[26px] font-medium leading-tight mt-1">{selected.name}</h2>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="label-ink min-h-[44px] md:hidden">
              Close
            </button>
          </div>
          <p className="mt-2 text-[14px] text-ink-2">{selected.blurb}</p>
          <p className="mt-3 text-[14px] border-l-2 border-accent pl-3">{selected.cue}</p>
          <SkillStatus skill={selected} skills={skills} />
          <Drills skill={selected} skills={skills} />
        </aside>
      )}
    </div>
  );
}

function SkillStatus({ skill, skills }: { skill: Skill; skills: Record<string, SkillState> }) {
  const st = skills[skill.id];
  const status = nodeStatus(skill, skills);
  const lvl = st?.level ?? 0;
  const next = nextLevelXp(lvl);
  const xp = st?.xp ?? 0;
  if (status === "locked") {
    const need = skill.prereqs.filter((p) => (skills[p]?.level ?? 0) < 1).map((p) => SKILL_MAP[p]?.name).filter(Boolean);
    return (
      <div className="mt-5 hairline pt-4">
        <p className="label">Locked</p>
        <p className="text-[14px] mt-1">First practice: {need.join(", ")}.</p>
      </div>
    );
  }
  return (
    <div className="mt-5 hairline pt-4 grid grid-cols-[auto_1fr] gap-4 items-end">
      <div>
        <p className="label">Level {lvl}</p>
        <p className="font-display text-[22px] leading-none mt-1">{levelLabel(lvl)}</p>
      </div>
      <div>
        <div className="flex justify-between text-[11px] text-ink-3 num">
          <span>{xp} xp</span>
          <span>{lvl >= 5 ? "max" : `${next} xp`}</span>
        </div>
        <div className="h-[4px] bg-paper-3 mt-1">
          <div className="h-full bg-ink" style={{ width: `${lvl >= 5 ? 100 : Math.min(100, (xp / next) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function Drills({ skill, skills }: { skill: Skill; skills: Record<string, SkillState> }) {
  const status = nodeStatus(skill, skills);
  const drills = allDrillsFor(skill.id);
  const mains = drills.filter((d) => d.phase === "main" && d.id !== "m-baseline");
  const warmups = drills.filter((d) => d.phase === "warmup");
  return (
    <div className="mt-6">
      <p className="label">Drills</p>
      <ol className="mt-2 divide-y divide-line border-t border-line">
        {mains.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[16px] leading-tight truncate">{d.name}</p>
              <p className="text-[12px] text-ink-3 mt-0.5 truncate">
                {d.minutes} min{d.frameworkId ? ` · ${FRAMEWORK_MAP[d.frameworkId]?.name}` : ""}
              </p>
            </div>
            <Link href={`/practice?kind=free&drill=${d.id}`} className={clsx("btn btn-sm shrink-0", status === "locked" && "pointer-events-none opacity-40")} aria-disabled={status === "locked"}>
              Practice
            </Link>
          </li>
        ))}
        {warmups.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-3 text-ink-2">
            <div className="min-w-0">
              <p className="font-display text-[15px] leading-tight truncate">{d.name}</p>
              <p className="text-[12px] text-ink-3 mt-0.5">Warmup · {d.minutes} min</p>
            </div>
          </li>
        ))}
        {!mains.length && !warmups.length && <li className="py-3 text-[13px] text-ink-3">Trained inside other drills.</li>}
      </ol>
    </div>
  );
}
