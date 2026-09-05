"use client";

import clsx from "clsx";
import { BRANCHES, LEVEL_NAMES, SKILL_LEVEL_XP, skillsInBranch } from "@/content/skills";
import type { Skill } from "@/content/types";
import type { SkillState } from "@/lib/types";
import { isUnlocked } from "@/lib/planner";

export type NodeStatus = "locked" | "available" | "started" | "strong" | "elite";

export function nodeStatus(skill: Skill, skills: Record<string, SkillState>): NodeStatus {
  const st = skills[skill.id];
  if (st && st.level >= 5) return "elite";
  if (st && st.level >= 3) return "strong";
  if (st && st.sessions > 0) return "started";
  return isUnlocked(skill.id, skills) ? "available" : "locked";
}

export function SkillNode({ skill, skills, selected, focus, onSelect }: { skill: Skill; skills: Record<string, SkillState>; selected?: boolean; focus?: boolean; onSelect?: (s: Skill) => void }) {
  const status = nodeStatus(skill, skills);
  const lvl = skills[skill.id]?.level ?? 0;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(skill)}
      aria-pressed={selected}
      className={clsx("group text-left flex flex-col items-start gap-2 min-w-[132px] max-w-[150px] shrink-0 py-2 -mx-1 px-1", status === "locked" && "opacity-55")}
    >
      <span
        className={clsx(
          "w-[34px] h-[34px] flex items-center justify-center font-display text-[13px] num border transition-colors",
          status === "locked" && "border-dashed border-ink-3 text-ink-3",
          status === "available" && "border-ink text-ink",
          status === "started" && "border-ink bg-paper-2 text-ink",
          status === "strong" && "border-ink bg-ink text-paper",
          status === "elite" && "border-accent bg-accent text-accent-ink",
          selected && "outline outline-2 outline-offset-2 outline-accent",
        )}
      >
        {status === "locked" ? "" : lvl}
      </span>
      <span className="leading-tight">
        <span className={clsx("block font-display text-[14px]", focus && "underline decoration-accent decoration-2 underline-offset-4")}>{skill.name}</span>
        <span className="block text-[11.5px] text-ink-2 mt-0.5 line-clamp-2">{skill.blurb}</span>
      </span>
    </button>
  );
}

export function SkillTree({ skills, selectedId, focusId, onSelect }: { skills: Record<string, SkillState>; selectedId?: string; focusId?: string; onSelect?: (s: Skill) => void }) {
  return (
    <div className="space-y-8">
      {BRANCHES.map((b) => {
        const list = skillsInBranch(b.id);
        const lvls = list.map((s) => skills[s.id]?.level ?? 0);
        const avg = lvls.reduce((a, c) => a + c, 0) / Math.max(1, lvls.length);
        return (
          <section key={b.id}>
            <div className="flex items-baseline justify-between hairline-strong pt-3">
              <h3 className="font-display text-[20px] font-medium">{b.name}</h3>
              <span className="label">{b.tagline}</span>
            </div>
            <div className="h-[2px] bg-paper-3 mt-2">
              <div className="h-full bg-ink" style={{ width: `${(avg / 5) * 100}%` }} />
            </div>
            <div className="flex gap-3 overflow-x-auto pt-3 pb-1 -mx-1 px-1 [scrollbar-width:none]">
              {list.map((s) => (
                <SkillNode key={s.id} skill={s} skills={skills} selected={selectedId === s.id} focus={focusId === s.id} onSelect={onSelect} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function levelLabel(level: number) {
  return LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, level)];
}

export function nextLevelXp(level: number) {
  return SKILL_LEVEL_XP[Math.min(SKILL_LEVEL_XP.length - 1, level + 1)];
}
