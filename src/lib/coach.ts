import type { CoachDecision, CoachEvidence, FocusBlock, Observation, Scores, SessionDoc, SkillState, UserProfile } from "./types";
import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_SKILLS, TAG_MAP, type Dimension } from "@/content/observations";
import { SKILL_MAP } from "@/content/skills";
import { fmt1, localDateStr } from "./format";

/**
 * The coach. Deterministic. Looks across sessions, not at one clip.
 * Patterns (recurring tags, weak dimensions) decide the focus; incidents never do.
 * A focus is held for a block of three sessions unless it clearly improves.
 */

const WINDOW = 6;
const BLOCK = 3;
const DECAY = 0.85;
const DEFAULT_FOCUS: Record<string, string> = { stage: "pause", spot: "wheel-60", story: "story-formula", confidence: "volume" };

export function analyzedOnly(sessions: SessionDoc[]): SessionDoc[] {
  return sessions.filter((s) => s.status === "analyzed" && s.ai).sort((a, b) => b.createdAt - a.createdAt);
}

/** Deterministic tags from device metrics + transcript numbers. Never incidents. */
export function derivedObservations(s: SessionDoc): Observation[] {
  const out: Observation[] = [];
  const ai = s.ai;
  if (!ai) return out;
  const a = s.audio;
  if (a && a.pitchSpreadSemitones > 0 && a.pitchSpreadSemitones < 5 && (s.recording?.durationSec ?? 0) >= 30) {
    out.push({ tag: "monotone", skillId: "pitch", severity: a.pitchSpreadSemitones < 3.5 ? 3 : 2, incident: false, note: `Pitch moved only ${a.pitchSpreadSemitones} semitones.` });
  }
  if (ai.fillers.perMin >= 5) out.push({ tag: "fillers", skillId: "fillers", severity: ai.fillers.perMin >= 8 ? 3 : 2, incident: false, note: `${fmt1(ai.fillers.perMin)} fillers a minute.` });
  if (a && a.pauseCount === 0 && (s.recording?.durationSec ?? 0) >= 40) out.push({ tag: "no-pauses", skillId: "pause", severity: 1, incident: false, note: "No pause longer than half a second." });
  if (ai.wpm >= 175) out.push({ tag: "rushed", skillId: "rate", severity: ai.wpm >= 190 ? 3 : 2, incident: false, note: `${ai.wpm} words a minute.` });
  if (ai.wpm > 0 && ai.wpm <= 105) out.push({ tag: "dragging", skillId: "rate", severity: 1, incident: false, note: `${ai.wpm} words a minute.` });
  return out;
}

/** Vero's observations + derived ones, deduped by tag (max severity wins). */
export function observationsFor(s: SessionDoc): Observation[] {
  const map = new Map<string, Observation>();
  for (const o of [...(s.ai?.observations ?? []), ...derivedObservations(s)]) {
    if (!TAG_MAP[o.tag]) continue;
    const prev = map.get(o.tag);
    if (!prev || o.severity > prev.severity) map.set(o.tag, { ...o, skillId: TAG_MAP[o.tag].skillId });
  }
  return [...map.values()];
}

export function averageScores(sessions: SessionDoc[], n = 5): Scores | null {
  const list = analyzedOnly(sessions).slice(0, n);
  if (!list.length) return null;
  const sum: Record<keyof Scores, number> = { clarity: 0, structure: 0, vocalVariety: 0, energy: 0, presence: 0, engagement: 0, overall: 0 };
  for (const s of list) for (const k of Object.keys(sum) as (keyof Scores)[]) sum[k] += s.ai!.scores[k];
  const out = {} as Scores;
  for (const k of Object.keys(sum) as (keyof Scores)[]) out[k] = Math.round((sum[k] / list.length) * 10) / 10;
  return out;
}

function weightedDimensionAverages(list: SessionDoc[]): Record<Dimension, { avg: number; n: number }> {
  const out = {} as Record<Dimension, { avg: number; n: number }>;
  for (const d of DIMENSIONS) {
    let num = 0;
    let den = 0;
    let n = 0;
    list.forEach((s, i) => {
      const v = s.ai?.scores[d];
      if (typeof v !== "number") return;
      const w = Math.pow(DECAY, i);
      num += w * v;
      den += w;
      n++;
    });
    out[d] = { avg: den ? Math.round((num / den) * 10) / 10 : 0, n };
  }
  return out;
}

export interface TagPattern {
  tag: string;
  label: string;
  skillId: string;
  dimension: Dimension | "incident";
  count: number;
  score: number;
}

/** Recurring, non-incident tags across the window, strongest first. */
export function recurringTags(list: SessionDoc[]): TagPattern[] {
  const acc = new Map<string, TagPattern>();
  list.forEach((s, i) => {
    const w = Math.pow(DECAY, i);
    const seen = new Set<string>();
    for (const o of observationsFor(s)) {
      if (o.incident || seen.has(o.tag)) continue;
      const t = TAG_MAP[o.tag];
      if (!t || !t.skillId || t.dimension === "incident") continue;
      seen.add(o.tag);
      const cur = acc.get(o.tag) ?? { tag: o.tag, label: t.label, skillId: t.skillId, dimension: t.dimension, count: 0, score: 0 };
      cur.count += 1;
      cur.score += w * o.severity;
      acc.set(o.tag, cur);
    }
    // Sessions analyzed before observation tags existed contribute only their
    // deterministic metrics (already merged above). Their old single-clip top fix
    // is exactly the kind of one-off verdict this coach exists to outweigh.
  });
  return [...acc.values()].sort((a, b) => b.score - a.score);
}

export function dimensionOfSkill(skillId: string): Dimension | "incident" {
  for (const d of DIMENSIONS) if (DIMENSION_SKILLS[d].includes(skillId)) return d;
  const t = Object.values(TAG_MAP).find((x) => x.skillId === skillId);
  if (t) return t.dimension;
  const branch = SKILL_MAP[skillId]?.branch;
  if (branch === "voice") return "vocalVariety";
  if (branch === "clarity") return "clarity";
  if (branch === "structure") return "structure";
  if (branch === "presence") return "presence";
  if (branch === "story" || branch === "engagement") return "engagement";
  return "clarity";
}

function unlocked(skillId: string, skills: Record<string, SkillState>): boolean {
  const s = SKILL_MAP[skillId];
  if (!s) return false;
  return s.prereqs.every((p) => (skills[p]?.level ?? 0) >= 1);
}

function firstUnlocked(candidates: string[], skills: Record<string, SkillState>, avoid?: string): string | undefined {
  return candidates.find((c) => c !== avoid && unlocked(c, skills)) ?? candidates.find((c) => unlocked(c, skills));
}

/** How many of the last `n` sessions show evidence for this skill (pattern tag or top fix). */
export function patternCountForSkill(skillId: string, sessions: SessionDoc[], n = WINDOW): { count: number; of: number } {
  const list = analyzedOnly(sessions).slice(0, n);
  let count = 0;
  for (const s of list) {
    const hit = observationsFor(s).some((o) => !o.incident && o.skillId === skillId) || s.ai?.topFix?.skillId === skillId;
    if (hit) count++;
  }
  return { count, of: list.length };
}

export function decideFocus(opts: { profile: UserProfile; sessions: SessionDoc[]; skills: Record<string, SkillState> }): CoachDecision {
  const { profile, skills } = opts;
  const list = analyzedOnly(opts.sessions).slice(0, WINDOW);
  const goalDefault = profile.goal ? DEFAULT_FOCUS[profile.goal] : "wheel-60";

  if (!list.length) {
    return { skillId: unlocked(goalDefault, skills) ? goalDefault : "wheel-60", reason: "First session. I need a baseline, not a performance.", evidence: { kind: "goal" } };
  }

  const dims = weightedDimensionAverages(list);
  const patterns = recurringTags(list);
  const block = profile.focus;
  const n = list.length;

  // ---- 1. Hold the current block unless it improved or ran its course.
  if (block && SKILL_MAP[block.skillId] && block.sessions > 0 && block.sessions < BLOCK) {
    const dim = dimensionOfSkill(block.skillId);
    const last2 = list.slice(0, 2);
    const recentAvg = dim === "incident" ? 0 : last2.reduce((a, s) => a + (s.ai!.scores[dim] ?? 0), 0) / Math.max(1, last2.length);
    const fillersNow = last2.reduce((a, s) => a + s.ai!.fillers.perMin, 0) / Math.max(1, last2.length);
    const improved =
      (block.startAvg !== undefined && recentAvg >= block.startAvg + 1) ||
      recentAvg >= 8 ||
      (block.skillId === "fillers" && block.startFillers !== undefined && fillersNow <= block.startFillers * 0.6);
    if (!improved) {
      const day = block.sessions + 1;
      const label = dim === "incident" ? "" : `${DIMENSION_LABELS[dim]} still ${fmt1(dims[dim].avg)}.`;
      return {
        skillId: block.skillId,
        reason: `Day ${day} of ${BLOCK} on ${SKILL_MAP[block.skillId].name.toLowerCase()}. ${label}`.trim(),
        evidence: { kind: "keep", day, of: BLOCK, dimension: dim === "incident" ? undefined : dim, avg: dim === "incident" ? undefined : dims[dim].avg },
      };
    }
  }

  const avoid = block?.skillId;

  // ---- 2. Strongest recurring pattern (needs 2 sessions, or 1 strong one when history is thin).
  const minCount = n >= 3 ? 2 : 1;
  for (const p of patterns) {
    if (p.count < minCount) continue;
    if (p.skillId === avoid && block && block.sessions >= BLOCK) continue; // just finished a block on it; rotate
    const skillId = unlocked(p.skillId, skills) ? p.skillId : firstUnlocked(DIMENSION_SKILLS[p.dimension as Dimension] ?? [], skills, avoid);
    if (!skillId) continue;
    return {
      skillId,
      reason: n === 1 ? `${p.label} showed up in your baseline.` : `${p.label} in ${p.count} of your last ${n} sessions.`,
      evidence: { kind: "pattern", tag: p.tag, count: p.count, of: n, dimension: p.dimension === "incident" ? undefined : p.dimension },
    };
  }

  // ---- 3. Weakest dimension with enough samples.
  const ranked = DIMENSIONS.filter((d) => dims[d].n >= Math.min(3, n)).sort((a, b) => dims[a].avg - dims[b].avg);
  const weakest = ranked[0];
  if (weakest && dims[weakest].avg < 7.5) {
    const skillId = firstUnlocked(DIMENSION_SKILLS[weakest], skills, avoid);
    if (skillId) {
      return {
        skillId,
        reason: `${DIMENSION_LABELS[weakest]} averaged ${fmt1(dims[weakest].avg)} over ${dims[weakest].n} sessions. Lowest of six.`,
        evidence: { kind: "dimension", dimension: weakest, avg: dims[weakest].avg, of: dims[weakest].n },
      };
    }
  }

  // ---- 4. Vero's suggestion, then the goal default.
  const vero = list[0].ai?.nextFocusSkillId;
  if (vero && unlocked(vero, skills) && vero !== avoid) {
    return { skillId: vero, reason: `Vero's call: ${SKILL_MAP[vero].name.toLowerCase()}.`, evidence: { kind: "vero" } };
  }
  const fallback = unlocked(goalDefault, skills) ? goalDefault : "wheel-60";
  return { skillId: fallback, reason: `Building toward your goal: ${SKILL_MAP[fallback].name.toLowerCase()}.`, evidence: { kind: "goal" } };
}

/** Advance the focus block after a session, given the decision for the next one. */
export function nextFocusBlock(prev: FocusBlock | undefined, decision: CoachDecision, sessions: SessionDoc[]): FocusBlock {
  const list = analyzedOnly(sessions);
  const dim = dimensionOfSkill(decision.skillId);
  const dims = weightedDimensionAverages(list.slice(0, WINDOW));
  if (prev && prev.skillId === decision.skillId && decision.evidence.kind === "keep") {
    return { ...prev, sessions: prev.sessions + 1, reason: decision.reason, evidence: decision.evidence };
  }
  return {
    skillId: decision.skillId,
    since: localDateStr(),
    sessions: 1,
    startAvg: dim === "incident" ? undefined : dims[dim]?.avg,
    startFillers: list[0]?.ai?.fillers.perMin,
    reason: decision.reason,
    evidence: decision.evidence,
  };
}

/** Compact history for Vero's prompt. */
export function historyForPrompt(sessions: SessionDoc[], focus?: FocusBlock) {
  const list = analyzedOnly(sessions).slice(0, WINDOW);
  const dims = weightedDimensionAverages(list);
  const dimensionAvg: Record<string, number> = {};
  for (const d of DIMENSIONS) if (dims[d].n) dimensionAvg[d] = dims[d].avg;
  return {
    sessions: list.map((s) => ({
      date: s.date,
      drill: s.drillName,
      overall: s.ai!.scores.overall,
      fillersPerMin: s.ai!.fillers.perMin,
      pitchSpread: s.audio?.pitchSpreadSemitones,
      tags: observationsFor(s)
        .filter((o) => !o.incident)
        .map((o) => o.tag),
      topFix: s.ai!.topFix.title,
    })),
    dimensionAvg,
    recurringTags: recurringTags(list)
      .filter((p) => p.count >= 2)
      .slice(0, 6)
      .map((p) => ({ tag: p.tag, count: p.count })),
    focus: focus ? { skillId: focus.skillId, sessions: focus.sessions } : undefined,
  };
}

export type { CoachEvidence };
