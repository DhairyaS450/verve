import { DRILLS, MAINS, WARMUPS, DRILL_MAP } from "@/content/drills";
import { SKILLS, SKILL_MAP } from "@/content/skills";
import type { Drill } from "@/content/types";
import type { Goal, PlanDoc, SessionDoc, SkillState, UserProfile } from "./types";
import { fmt1 } from "./format";

const GOAL_DEFAULT_FOCUS: Record<Goal, string> = {
  stage: "pause",
  spot: "wheel-60",
  story: "story-formula",
  confidence: "volume",
};

export function isUnlocked(skillId: string, skills: Record<string, SkillState>): boolean {
  const s = SKILL_MAP[skillId];
  if (!s) return false;
  return s.prereqs.every((p) => (skills[p]?.level ?? 0) >= 1);
}

export function unlockedSkillIds(skills: Record<string, SkillState>): string[] {
  return SKILLS.filter((s) => isUnlocked(s.id, skills)).map((s) => s.id);
}

function drillUnlocked(d: Drill, skills: Record<string, SkillState>) {
  // A drill is available if its primary skill is unlocked.
  return isUnlocked(d.skillIds[0], skills);
}

function lastDone(drillId: string, sessions: SessionDoc[]): number {
  const s = sessions.find((x) => x.drillId === drillId);
  return s?.createdAt ?? 0;
}

function lastWarmup(warmupId: string, sessions: SessionDoc[]): number {
  const s = sessions.find((x) => x.warmupId === warmupId);
  return s?.createdAt ?? 0;
}

export function reasonLine(last: SessionDoc | undefined): string {
  if (!last?.ai) return "First session. I need a baseline, not a performance.";
  const f = last.ai.fillers?.perMin;
  const fix = last.ai.topFix?.title;
  if (typeof f === "number" && f >= 4 && /filler|um|uh|pause/i.test(fix ?? "")) {
    return `Last time: ${fmt1(f)} fillers a minute. Today we fix that.`;
  }
  if (fix) return `Last time: ${fix.toLowerCase()}. Today we fix that.`;
  return "Building on yesterday.";
}

export function chooseFocus(profile: UserProfile, sessions: SessionDoc[], skills: Record<string, SkillState>): string {
  const last = sessions.find((s) => s.status === "analyzed" && s.ai);
  const candidates = [last?.ai?.nextFocusSkillId, profile.focusSkillId, profile.goal ? GOAL_DEFAULT_FOCUS[profile.goal] : undefined, "wheel-60"];
  for (const c of candidates) {
    if (c && SKILL_MAP[c] && isUnlocked(c, skills)) return c;
  }
  return "wheel-60";
}

export interface PlanInput {
  profile: UserProfile;
  skills: Record<string, SkillState>;
  sessions: SessionDoc[]; // newest first
  date: string;
  forceDrillId?: string;
}

export function buildPlan({ profile, skills, sessions, date, forceDrillId }: PlanInput): PlanDoc {
  const focus = chooseFocus(profile, sessions, skills);
  const focusSkill = SKILL_MAP[focus];
  const budget = profile.sessionMinutes ?? 10;
  const recent = sessions.slice(0, 7);
  const recentDrillIds = new Set(recent.map((s) => s.drillId));
  const totalSessions = profile.totalSessions ?? 0;

  // ---- Warmup: same skill, else same branch, else anything. Least recently used.
  const warmupPool = (pool: Drill[]) => pool.sort((a, b) => lastWarmup(a.id, sessions) - lastWarmup(b.id, sessions));
  let warmups = warmupPool(WARMUPS.filter((w) => w.skillIds.includes(focus)));
  if (!warmups.length) warmups = warmupPool(WARMUPS.filter((w) => w.skillIds.some((id) => SKILL_MAP[id]?.branch === focusSkill.branch)));
  if (!warmups.length) warmups = warmupPool([...WARMUPS]);
  const warmup = warmups[0];

  // ---- Main drill
  let main: Drill | undefined = forceDrillId ? DRILL_MAP[forceDrillId] : undefined;
  if (!main) {
    const maxMinutes = Math.max(3, budget - warmup.minutes);
    const available = MAINS.filter((d) => drillUnlocked(d, skills));
    const fits = (d: Drill) => d.minutes <= maxMinutes;
    const explore = totalSessions > 0 && totalSessions % 3 === 2;

    const rank = (pool: Drill[]) =>
      [...pool].sort((a, b) => {
        const aNew = lastDone(a.id, sessions) === 0 ? 0 : 1;
        const bNew = lastDone(b.id, sessions) === 0 ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew; // never-done first
        return lastDone(a.id, sessions) - lastDone(b.id, sessions); // then least recent
      });

    if (explore) {
      const recentBranches = new Set(recent.slice(0, 5).flatMap((s) => s.skillIds.map((id) => SKILL_MAP[id]?.branch)));
      const fresh = available.filter((d) => fits(d) && !recentBranches.has(SKILL_MAP[d.skillIds[0]]?.branch) && !recentDrillIds.has(d.id));
      main = rank(fresh)[0];
    }
    if (!main) {
      const forFocus = available.filter((d) => d.skillIds.includes(focus) && fits(d) && !recentDrillIds.has(d.id));
      main = rank(forFocus)[0];
    }
    if (!main) {
      const forFocusAny = available.filter((d) => d.skillIds.includes(focus) && fits(d));
      main = rank(forFocusAny)[0];
    }
    if (!main) {
      const branchAny = available.filter((d) => fits(d) && d.skillIds.some((id) => SKILL_MAP[id]?.branch === focusSkill.branch));
      main = rank(branchAny)[0];
    }
    if (!main) main = rank(available.filter(fits))[0] ?? rank(available)[0] ?? DRILL_MAP["m-wheel-60"];
  }

  const last = sessions.find((s) => s.status === "analyzed" && s.ai);
  return {
    date,
    warmupId: warmup.id,
    drillId: main.id,
    focusSkillId: focus,
    reason: reasonLine(last),
    generatedAt: Date.now(),
    completed: false,
  };
}

export function isNewDrill(drillId: string, sessions: SessionDoc[]): boolean {
  return !sessions.some((s) => s.drillId === drillId && s.status === "analyzed");
}

export function allDrillsFor(skillId: string): Drill[] {
  return DRILLS.filter((d) => d.skillIds.includes(skillId));
}
