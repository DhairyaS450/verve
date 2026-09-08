import { DRILLS, MAINS, WARMUPS, DRILL_MAP } from "@/content/drills";
import { SKILLS, SKILL_MAP } from "@/content/skills";
import type { Drill } from "@/content/types";
import type { PlanBlock, PlanDoc, SessionDoc, SkillState, UserProfile } from "./types";
import { decideFocus, decideSecondaryFocus } from "./coach";

export function isUnlocked(skillId: string, skills: Record<string, SkillState>): boolean {
  const s = SKILL_MAP[skillId];
  if (!s) return false;
  return s.prereqs.every((p) => (skills[p]?.level ?? 0) >= 1);
}

export function unlockedSkillIds(skills: Record<string, SkillState>): string[] {
  return SKILLS.filter((s) => isUnlocked(s.id, skills)).map((s) => s.id);
}

function drillUnlocked(d: Drill, skills: Record<string, SkillState>) {
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

/**
 * The focus for today. The stored block (set by the coach after each session) wins;
 * otherwise decide fresh from history.
 */
export function chooseFocus(profile: UserProfile, sessions: SessionDoc[], skills: Record<string, SkillState>): { skillId: string; reason: string } {
  const block = profile.focus;
  if (block && SKILL_MAP[block.skillId] && isUnlocked(block.skillId, skills)) {
    return { skillId: block.skillId, reason: block.reason ?? `Focus: ${SKILL_MAP[block.skillId].name}.` };
  }
  const d = decideFocus({ profile, sessions, skills });
  return { skillId: d.skillId, reason: d.reason };
}

/** What a session length buys. */
export function sessionShape(minutes: number): { warmupMax: number; maxBlocks: 1 | 2 | 3; firstMax: number; singleMax: number } {
  if (minutes <= 5) return { warmupMax: 2, maxBlocks: 1, firstMax: 3, singleMax: 3 };
  if (minutes <= 10) return { warmupMax: 3, maxBlocks: 2, firstMax: 7, singleMax: 7 };
  return { warmupMax: 3, maxBlocks: 3, firstMax: 6, singleMax: 12 };
}

export interface PlanInput {
  profile: UserProfile;
  skills: Record<string, SkillState>;
  sessions: SessionDoc[]; // newest first
  date: string;
  forceDrillId?: string;
}

export function buildPlan({ profile, skills, sessions, date, forceDrillId }: PlanInput): PlanDoc {
  const { skillId: focus, reason } = chooseFocus(profile, sessions, skills);
  const focusSkill = SKILL_MAP[focus];
  const budget = profile.sessionMinutes ?? 10;
  const shape = sessionShape(budget);
  const recent = sessions.slice(0, 7);
  const recentDrillIds = new Set(recent.map((s) => s.drillId));

  // ---- Warmup: same skill, else same branch, else anything. Short enough for the budget. Least recently used.
  const warmupPool = (pool: Drill[]) => pool.sort((a, b) => lastWarmup(a.id, sessions) - lastWarmup(b.id, sessions));
  const short = (w: Drill) => w.minutes <= shape.warmupMax;
  let warmups = warmupPool(WARMUPS.filter((w) => w.skillIds.includes(focus) && short(w)));
  if (!warmups.length) warmups = warmupPool(WARMUPS.filter((w) => short(w) && w.skillIds.some((id) => SKILL_MAP[id]?.branch === focusSkill.branch)));
  if (!warmups.length) warmups = warmupPool(WARMUPS.filter(short));
  if (!warmups.length) warmups = warmupPool([...WARMUPS]);
  const warmup = warmups[0];
  const remaining = Math.max(3, budget - warmup.minutes);

  const available = MAINS.filter((d) => drillUnlocked(d, skills));
  const rank = (pool: Drill[]) =>
    [...pool].sort((a, b) => {
      const aNew = lastDone(a.id, sessions) === 0 ? 0 : 1;
      const bNew = lastDone(b.id, sessions) === 0 ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return lastDone(a.id, sessions) - lastDone(b.id, sessions);
    });

  /** Best drill for a skill within a time cap. Never-done first, then least recent, avoiding this week's repeats. */
  const pickDrill = (skillId: string, maxMinutes: number, exclude: Set<string>, explore = false): Drill | undefined => {
    const fits = (d: Drill) => d.minutes <= maxMinutes && !exclude.has(d.id);
    const skill = SKILL_MAP[skillId];
    let main: Drill | undefined;
    if (explore) {
      const recentBranches = new Set(recent.slice(0, 5).flatMap((s) => s.skillIds.map((id) => SKILL_MAP[id]?.branch)));
      main = rank(available.filter((d) => fits(d) && !recentBranches.has(SKILL_MAP[d.skillIds[0]]?.branch) && !recentDrillIds.has(d.id)))[0];
    }
    if (!main) main = rank(available.filter((d) => d.skillIds.includes(skillId) && fits(d) && !recentDrillIds.has(d.id)))[0];
    if (!main) main = rank(available.filter((d) => d.skillIds.includes(skillId) && fits(d)))[0];
    if (!main && skill) main = rank(available.filter((d) => fits(d) && d.skillIds.some((id) => SKILL_MAP[id]?.branch === skill.branch)))[0];
    if (!main) main = rank(available.filter(fits))[0];
    return main;
  };

  // ---- Forced (free practice): single block.
  if (forceDrillId && DRILL_MAP[forceDrillId]) {
    return { date, warmupId: warmup.id, drillId: forceDrillId, focusSkillId: focus, reason, generatedAt: Date.now(), completed: false };
  }

  // ---- Block 1 always serves the focus. If enough time is left, block 2 trains the next weak spot.
  // Novelty comes from never-done drills first, and from exploration only when the coach has no real second candidate.
  const extras: PlanBlock[] = [];
  let main: Drill | undefined = pickDrill(focus, Math.min(shape.firstMax, remaining), new Set());
  if (main && shape.maxBlocks >= 2) {
    let left = remaining - main.minutes;
    const used = new Set([main.id]);
    const usedSkills = [focus];
    while (extras.length < shape.maxBlocks - 1 && left >= 3) {
      const sec = decideSecondaryFocus({ profile, sessions, skills }, focus, usedSkills.slice(1));
      const b = pickDrill(sec.skillId, left, used, sec.evidence.kind === "explore");
      if (!b) break;
      const serves = b.skillIds.some((id) => id === sec.skillId || SKILL_MAP[id]?.branch === SKILL_MAP[sec.skillId]?.branch);
      const focusId = serves ? sec.skillId : b.skillIds[0];
      extras.push({ drillId: b.id, focusSkillId: focusId, reason: serves ? sec.reason : `Something new: ${SKILL_MAP[focusId]?.name.toLowerCase() ?? b.name}.` });
      used.add(b.id);
      usedSkills.push(focusId);
      left -= b.minutes;
    }
    // A long session with no second drill gets one longer drill instead of dead time.
    if (!extras.length && shape.singleMax > shape.firstMax) main = pickDrill(focus, Math.min(shape.singleMax, remaining), new Set()) ?? main;
  }
  if (!main) main = pickDrill(focus, 99, new Set()) ?? DRILL_MAP["m-wheel-60"];

  return {
    date,
    warmupId: warmup.id,
    drillId: main.id,
    focusSkillId: focus,
    reason,
    second: extras[0],
    third: extras[1],
    minutes: budget,
    generatedAt: Date.now(),
    completed: false,
  };
}

/** A stored plan is reused only if it is still valid for today's settings. */
export function planIsCurrent(plan: PlanDoc | null, profile: UserProfile): plan is PlanDoc {
  if (!plan || !DRILL_MAP[plan.drillId]) return false;
  if (plan.completed) return true;
  return (plan.minutes ?? 10) === (profile.sessionMinutes ?? 10);
}

/** The drill blocks of a plan, in order. */
export function planBlocks(plan: PlanDoc): PlanBlock[] {
  const blocks: PlanBlock[] = [{ drillId: plan.drillId, focusSkillId: plan.focusSkillId, reason: plan.reason }];
  for (const b of [plan.second, plan.third]) {
    if (b && DRILL_MAP[b.drillId] && !blocks.some((x) => x.drillId === b.drillId)) blocks.push(b);
  }
  return blocks;
}

export function planMinutes(plan: PlanDoc): number {
  const w = DRILL_MAP[plan.warmupId]?.minutes ?? 0;
  return w + planBlocks(plan).reduce((a, b) => a + (DRILL_MAP[b.drillId]?.minutes ?? 0), 0);
}

export function isNewDrill(drillId: string, sessions: SessionDoc[]): boolean {
  return !sessions.some((s) => s.drillId === drillId && s.status === "analyzed");
}

export function allDrillsFor(skillId: string): Drill[] {
  return DRILLS.filter((d) => d.skillIds.includes(skillId));
}
