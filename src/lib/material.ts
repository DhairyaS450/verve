import type { Drill, Passage } from "@/content/types";
import {
  DISAGREE_STATEMENTS,
  EXPERT_QUESTIONS,
  EXPERT_TOPICS,
  PARAGRAPHS,
  QUESTION_SETS,
  STORY_PROMPTS,
  TWISTERS,
  YES_AND_STATEMENTS,
  randomPassage,
} from "@/content/passages";
import { ABSTRACT_WORDS, ASSOCIATION_WORDS, OBJECTS, TOPICS, pickMany, pickTopic } from "@/content/topics";
import { CASE_MAP, loadCustomCase, pickCase, type RoleplayCase } from "@/content/cases";
import { PRACTICE_PROBES } from "@/content/roleplay";

export interface SessionMaterial {
  /** The headline prompt shown to the user and sent to Vero */
  prompt?: string;
  /** Sub-prompts that advance on a timer while recording */
  promptExtra?: string[];
  segmentSec?: number;
  /** Candidates for the topic "wheel" animation */
  candidates?: string[];
  passage?: Passage;
  twisters?: string[];
  /** Warmup ticker items */
  items?: string[];
  itemInterval?: number;
  itemPrefix?: string;
  paragraph?: string;
  line?: string;
  /** DECA / FBLA case for role-play drills */
  roleplayCase?: RoleplayCase;
}

/** Drills whose recording is split into timed segments with on-screen labels. */
const SEGMENTS: Record<string, { labels: string[]; sec: number }> = {
  "m-eli5": { labels: ["For a five-year-old", "Now for an expert"], sec: 60 },
  "m-energy-match": { labels: ["Low, tired energy", "Warm", "Electric"], sec: 20 },
  "m-hook-five": { labels: ["Start in the action", "Open with a question", "Open with a bold claim", "Open with dialogue", "Open with a contrast"], sec: 22 },
  "m-open-close": { labels: ["The opening", "The closing"], sec: 30 },
};

export interface MaterialOptions {
  /** Force a specific case id ("custom" = the pasted case in sessionStorage) */
  caseId?: string;
  /** Recently used case ids, avoided when picking */
  excludeCases?: string[];
  /** Narrow the random pick */
  filter?: { org?: "DECA" | "FBLA"; event?: string };
}

function resolveCase(set: string | undefined, opts: MaterialOptions): RoleplayCase | undefined {
  if (opts.caseId === "custom") return loadCustomCase() ?? undefined;
  if (opts.caseId && CASE_MAP[opts.caseId]) return CASE_MAP[opts.caseId];
  const picked = pickCase({ set: set ?? "deca", org: opts.filter?.org, event: opts.filter?.event, exclude: opts.excludeCases });
  return picked ?? pickCase({ set: set ?? "deca", exclude: opts.excludeCases });
}

export function buildMaterial(drill: Drill, recentPrompts: string[] = [], opts: MaterialOptions = {}): SessionMaterial {
  const m = drill.material;
  const out: SessionMaterial = {};
  switch (m.kind) {
    case "passage":
      out.passage = randomPassage();
      out.prompt = `Read: ${out.passage.title}`;
      break;
    case "twisters":
      out.twisters = pickMany(TWISTERS, m.count ?? 3);
      break;
    case "line":
      out.line = m.text;
      break;
    case "topic": {
      const t = pickTopic(m.set, recentPrompts);
      out.prompt = t.text;
      out.candidates = pickMany(
        TOPICS.filter((x) => x.text !== t.text).map((x) => x.text),
        14,
      );
      break;
    }
    case "object": {
      if (m.count && m.count > 1) {
        out.items = pickMany(OBJECTS, m.count);
        out.itemInterval = m.intervalSec ?? 12;
      } else {
        const o = pickMany(OBJECTS.filter((x) => !recentPrompts.includes(x)), 1)[0] ?? OBJECTS[0];
        out.prompt = o;
        out.candidates = pickMany(OBJECTS.filter((x) => x !== o), 14);
      }
      break;
    }
    case "question": {
      const pool = QUESTION_SETS[m.set ?? "opinion"] ?? QUESTION_SETS.opinion;
      const qs = pickMany(pool.filter((q) => !recentPrompts.includes(q)), m.count ?? 1);
      if ((m.count ?? 1) > 1) {
        out.prompt = `${qs.length} questions`;
        out.promptExtra = qs;
        out.segmentSec = m.intervalSec ?? 30;
      } else out.prompt = qs[0];
      break;
    }
    case "words": {
      const pool = m.set === "abstract" ? ABSTRACT_WORDS : ASSOCIATION_WORDS;
      const items = pickMany(pool, m.count ?? 10);
      if (drill.phase === "warmup") {
        out.items = items;
        out.itemInterval = m.intervalSec ?? 3;
        if (m.set === "abstract") out.itemPrefix = "";
      } else {
        out.prompt = "Explain each with an analogy";
        out.promptExtra = items;
        out.segmentSec = m.intervalSec ?? 30;
      }
      break;
    }
    case "statements": {
      if (m.set === "disagree") {
        out.prompt = pickMany(DISAGREE_STATEMENTS.filter((s) => !recentPrompts.includes(s)), 1)[0];
      } else {
        out.items = pickMany(YES_AND_STATEMENTS, m.count ?? 8);
        out.itemInterval = m.intervalSec ?? 12;
        out.itemPrefix = "";
      }
      break;
    }
    case "paragraph":
      out.paragraph = pickMany(PARAGRAPHS, 1)[0];
      out.prompt = "Paraphrase the paragraph";
      break;
    case "story-prompt": {
      const pool = STORY_PROMPTS[m.set ?? "personal"] ?? STORY_PROMPTS.personal;
      const ps = pickMany(pool.filter((p) => !recentPrompts.includes(p)), m.count ?? 1);
      if ((m.count ?? 1) > 1) {
        out.prompt = `${ps.length} prompts`;
        out.promptExtra = ps;
        out.segmentSec = m.intervalSec ?? 30;
      } else out.prompt = ps[0] ?? pool[0];
      break;
    }
    case "expert": {
      const topic = pickMany(EXPERT_TOPICS, 1)[0];
      out.prompt = `You are the world's leading expert on ${topic}`;
      out.promptExtra = pickMany(EXPERT_QUESTIONS, m.count ?? 3);
      out.segmentSec = m.intervalSec ?? 30;
      break;
    }
    case "case": {
      const c = resolveCase(m.set, opts);
      if (!c) break;
      out.roleplayCase = c;
      out.prompt = c.title;
      if (m.count && m.intervalSec) {
        // Segmented drills: judge questions only, or one indicator per segment.
        if (drill.id === "m-rp-qa") {
          const qs = [...c.questions, ...PRACTICE_PROBES[c.org]].slice(0, m.count);
          out.promptExtra = qs;
        } else {
          out.promptExtra = c.pis.slice(0, m.count);
        }
        out.segmentSec = m.intervalSec;
      }
      break;
    }
    case "pis": {
      const c = resolveCase("any", opts);
      if (!c) break;
      out.roleplayCase = c;
      out.items = pickMany(c.pis, Math.min(m.count ?? 5, c.pis.length));
      out.itemInterval = m.intervalSec ?? 25;
      out.itemPrefix = "";
      break;
    }
    case "none":
    default:
      break;
  }
  const seg = SEGMENTS[drill.id];
  if (seg) {
    out.promptExtra = seg.labels;
    out.segmentSec = seg.sec;
  }
  return out;
}
