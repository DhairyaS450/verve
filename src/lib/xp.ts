import type { SkillState, Streak, VeroAnalysis } from "./types";
import { skillLevel } from "@/content/skills";
import { addDays } from "./format";

export function sessionXP(analysis: VeroAnalysis, isNewDrill: boolean, hadWarmup: boolean): number {
  const overall = Math.max(1, Math.min(10, analysis.scores.overall || 5));
  return 40 + Math.round(overall * 6) + (isNewDrill ? 20 : 0) + (hadWarmup ? 10 : 0);
}

export function skillXPGain(score: number): number {
  return Math.round(Math.max(1, Math.min(10, score)) * 10);
}

export function applySkillXP(
  current: Record<string, SkillState>,
  skillIds: string[],
  score: number,
  now: number,
): Record<string, SkillState> {
  const out: Record<string, SkillState> = {};
  const gain = skillXPGain(score);
  for (const id of skillIds) {
    const prev = current[id] ?? { id, xp: 0, level: 0, sessions: 0 };
    const xp = prev.xp + gain;
    out[id] = {
      id,
      xp,
      level: skillLevel(xp),
      sessions: prev.sessions + 1,
      lastPracticedAt: now,
      lastScore: score,
      bestScore: Math.max(prev.bestScore ?? 0, score),
    };
  }
  return out;
}

export function nextStreak(streak: Streak | undefined, today: string): Streak {
  const s = streak ?? { count: 0, lastDate: null, best: 0 };
  if (s.lastDate === today) return s;
  const yesterday = addDays(today, -1);
  const count = s.lastDate === yesterday ? s.count + 1 : 1;
  return { count, lastDate: today, best: Math.max(s.best ?? 0, count) };
}

/** Streak is only "alive" if practiced today or yesterday. */
export function liveStreak(streak: Streak | undefined, today: string): number {
  if (!streak || !streak.lastDate) return 0;
  if (streak.lastDate === today || streak.lastDate === addDays(today, -1)) return streak.count;
  return 0;
}

export const USER_LEVELS = [
  { xp: 0, name: "Rookie" },
  { xp: 150, name: "Novice" },
  { xp: 400, name: "Apprentice" },
  { xp: 800, name: "Speaker" },
  { xp: 1400, name: "Presenter" },
  { xp: 2200, name: "Storyteller" },
  { xp: 3200, name: "Orator" },
  { xp: 4500, name: "Keynote" },
  { xp: 6000, name: "Master" },
  { xp: 8000, name: "Elite" },
];

export function userLevel(xp: number) {
  let idx = 0;
  for (let i = 0; i < USER_LEVELS.length; i++) if (xp >= USER_LEVELS[i].xp) idx = i;
  const cur = USER_LEVELS[idx];
  const next = USER_LEVELS[idx + 1];
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { level: idx + 1, name: cur.name, nextXp: next?.xp ?? null, progress: Math.max(0, Math.min(1, progress)) };
}
