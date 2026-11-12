import "server-only";
import { GoogleGenAI, Type, createPartFromUri, createUserContent, type Part } from "@google/genai";
import { z } from "zod";
import { env, optionalEnv } from "./env";
import { SKILLS, SKILL_MAP } from "@/content/skills";
import { FRAMEWORK_MAP } from "@/content/frameworks";
import { DRILL_MAP } from "@/content/drills";
import { OBSERVATION_TAGS, TAG_IDS, TAG_MAP } from "@/content/observations";
import { findPassage } from "@/content/passages";
import { passageAsRead } from "../passage-read";
import type { Passage } from "@/content/types";
import type { AudioMetrics, Observation, RubricResult, VeroAnalysis } from "../types";

export interface RoleplayForPrompt {
  org: "DECA" | "FBLA";
  category: RubricResult["category"];
  formatName: string;
  prepMinutes: number;
  presentMinutes: number;
  role: string;
  judgeRole: string;
  situation: string;
  ask: string;
  pis: string[];
  questionsAsked: { t: number; q: string }[];
  rubric: { id: string; label: string; max: number; bands: [number, number, number, number] }[];
  bandNames: string[];
}

export interface HistoryForPrompt {
  sessions: { date: string; drill: string; overall: number; fillersPerMin: number; pitchSpread?: number; tags: string[]; topFix?: string }[];
  dimensionAvg?: Record<string, number>;
  recurringTags?: { tag: string; count: number }[];
  focus?: { skillId: string; sessions: number };
}

export interface AnalyzeContext {
  drillId: string;
  kind: "daily" | "free" | "baseline";
  prompt?: string;
  promptExtra?: string[];
  /** Read-aloud drills: the passage that was on screen. Older sessions are matched on their prompt instead. */
  passageId?: string;
  focusSkillId?: string;
  frameworkId?: string;
  durationSec: number;
  audio?: AudioMetrics;
  endedBy?: "timer" | "user";
  history?: HistoryForPrompt;
  previous?: { topFixTitle?: string; topFixSkillId?: string; fillersPerMin?: number; overall?: number };
  displayName?: string;
  roleplay?: RoleplayForPrompt;
}

const scoreField = { type: Type.NUMBER, description: "1-10" } as const;

export class NoSpeechError extends Error {
  constructor() {
    super("No speech detected in the recording.");
    this.name = "NoSpeechError";
  }
}

/** The review itself could not be produced: Gemini blocked it, or sent back nothing usable. */
export class ReviewError extends Error {
  constructor(
    public code: "recitation" | "empty",
    detail: string,
  ) {
    super(code === "recitation" ? `Gemini blocked the review as recitation (${detail}).` : `Gemini returned no usable review (${detail}).`);
    this.name = "ReviewError";
  }
}

/**
 * How the transcript is asked for.
 * - verbatim: word for word. The default.
 * - read-aloud: the passage on screen is known, so it is never typed out; Vero reports how the read went against it.
 * - no-recite: verbatim, except that published text the speaker recites is described in brackets.
 *
 * Gemini ends a response with finishReason RECITATION and an empty body when the answer would reproduce a long
 * run of published text. A verbatim transcript of someone reading a famous speech is exactly that.
 */
type TranscriptMode = "verbatim" | "read-aloud" | "no-recite";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ["noSpeech", "transcript", "wordCount", "fillers", "scores", "observations", "topFix", "win", "moments", "nextFocusSkillId", "oneLiner"],
  properties: {
    noSpeech: { type: Type.BOOLEAN, description: "true if the recording contains no intelligible speech: silence, noise only, or a missing audio track. Then transcript is empty and nothing is invented." },
    transcript: { type: Type.STRING, description: "Verbatim transcript including filler words like um, uh, like, you know. Empty if noSpeech." },
    wordCount: { type: Type.INTEGER },
    fillers: {
      type: Type.OBJECT,
      required: ["total", "top"],
      properties: {
        total: { type: Type.INTEGER, description: "Total filler word count (um, uh, er, like, you know, so, basically, kind of, sort of, right)." },
        top: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, required: ["word", "count"], properties: { word: { type: Type.STRING }, count: { type: Type.INTEGER } } },
        },
      },
    },
    scores: {
      type: Type.OBJECT,
      required: ["clarity", "structure", "vocalVariety", "energy", "presence", "engagement", "overall"],
      properties: {
        clarity: scoreField,
        structure: scoreField,
        vocalVariety: scoreField,
        energy: scoreField,
        presence: scoreField,
        engagement: scoreField,
        overall: scoreField,
      },
    },
    observations: {
      type: Type.ARRAY,
      description: "3–6 things you saw, each tagged from the catalog. Mark situational one-offs incident=true.",
      items: {
        type: Type.OBJECT,
        required: ["tag", "severity", "incident", "note"],
        properties: {
          tag: { type: Type.STRING, enum: TAG_IDS },
          severity: { type: Type.INTEGER, description: "1 minor, 2 clear, 3 dominant" },
          incident: { type: Type.BOOLEAN, description: "true if this was a one-time situational slip, not a habit" },
          note: { type: Type.STRING, description: "≤ 12 words of evidence from the tape" },
          t: { type: Type.NUMBER, description: "Seconds from start, if it happened at a moment" },
        },
      },
    },
    topFix: {
      type: Type.OBJECT,
      required: ["skillId", "title", "why", "how"],
      properties: {
        skillId: { type: Type.STRING, description: "One skill id from the provided list." },
        title: { type: Type.STRING, description: "≤ 7 words. The single biggest RECURRING thing to fix." },
        why: { type: Type.STRING, description: "≤ 14 words. Evidence from the tape and history." },
        how: { type: Type.STRING, description: "≤ 14 words. The concrete drill instruction for next time." },
      },
    },
    win: {
      type: Type.OBJECT,
      required: ["title", "detail"],
      properties: {
        title: { type: Type.STRING, description: "≤ 7 words. The thing that genuinely worked." },
        detail: { type: Type.STRING, description: "≤ 14 words. Evidence from the tape." },
      },
    },
    framework: {
      type: Type.OBJECT,
      required: ["followed", "missing"],
      properties: {
        followed: { type: Type.BOOLEAN },
        missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Framework steps that were skipped or weak." },
      },
    },
    moments: {
      type: Type.ARRAY,
      description: "2–4 timestamped moments. Mix good and fix.",
      items: {
        type: Type.OBJECT,
        required: ["t", "kind", "note"],
        properties: {
          t: { type: Type.NUMBER, description: "Seconds from start." },
          kind: { type: Type.STRING, enum: ["good", "fix"] },
          note: { type: Type.STRING, description: "≤ 10 words." },
        },
      },
    },
    nextFocusSkillId: { type: Type.STRING, description: "Skill id to train next. Must address a pattern, never an incident." },
    oneLiner: { type: Type.STRING, description: "≤ 14 words. Vero's verdict, direct and warm." },
    rubric: {
      type: Type.OBJECT,
      description: "ONLY for role-play sessions: the judge's score sheet, one entry per rubric item id provided.",
      required: ["items", "missed"],
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["id", "points", "note"],
            properties: {
              id: { type: Type.STRING, description: "Rubric item id exactly as provided." },
              points: { type: Type.INTEGER, description: "Points within the item's scale." },
              note: { type: Type.STRING, description: "≤ 12 words of evidence for the score." },
            },
          },
        },
        missed: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Performance indicators that were never addressed, verbatim." },
      },
    },
  },
};

const READING_SCHEMA = {
  type: Type.OBJECT,
  description: "Read-aloud drill: how the read went against the passage on screen. Never write the passage out.",
  required: ["finished", "readTo", "slips"],
  properties: {
    finished: { type: Type.BOOLEAN, description: "true if the speaker read through to the final word of the passage" },
    readTo: { type: Type.STRING, description: "The last four words of the passage that the speaker actually said, copied exactly from the passage." },
    slips: {
      type: Type.STRING,
      description: "≤ 40 words. What differed from the page, with timestamps: fillers, added, skipped or misread words, restarts. 'Clean read.' if nothing differed.",
    },
  },
};

function responseSchema(mode: TranscriptMode) {
  if (mode === "verbatim") return RESPONSE_SCHEMA;
  if (mode === "read-aloud") {
    return {
      ...RESPONSE_SCHEMA,
      required: [...RESPONSE_SCHEMA.required, "reading"],
      properties: {
        ...RESPONSE_SCHEMA.properties,
        transcript: { type: Type.STRING, description: "Leave empty. The passage is known; do not write it out." },
        reading: READING_SCHEMA,
      },
    };
  }
  return {
    ...RESPONSE_SCHEMA,
    properties: {
      ...RESPONSE_SCHEMA.properties,
      transcript: {
        type: Type.STRING,
        description:
          "Verbatim for the speaker's own words, fillers included. Published text the speaker recites is NOT written out: one bracketed description replaces the whole stretch. Empty if noSpeech.",
      },
    },
  };
}

const analysisSchema = z.object({
  noSpeech: z.boolean().optional().default(false),
  transcript: z.string(),
  reading: z.object({ finished: z.boolean().optional(), readTo: z.string().optional(), slips: z.string().optional() }).optional(),
  wordCount: z.number(),
  fillers: z.object({ total: z.number(), top: z.array(z.object({ word: z.string(), count: z.number() })) }),
  scores: z.object({
    clarity: z.number(),
    structure: z.number(),
    vocalVariety: z.number(),
    energy: z.number(),
    presence: z.number(),
    engagement: z.number(),
    overall: z.number(),
  }),
  observations: z
    .array(z.object({ tag: z.string(), severity: z.number(), incident: z.boolean(), note: z.string(), t: z.number().optional() }))
    .optional()
    .default([]),
  topFix: z.object({ skillId: z.string(), title: z.string(), why: z.string(), how: z.string() }),
  win: z.object({ title: z.string(), detail: z.string() }),
  framework: z.object({ followed: z.boolean(), missing: z.array(z.string()) }).optional(),
  moments: z.array(z.object({ t: z.number(), kind: z.enum(["good", "fix"]), note: z.string() })),
  nextFocusSkillId: z.string(),
  oneLiner: z.string(),
  rubric: z
    .object({
      items: z.array(z.object({ id: z.string(), points: z.number(), note: z.string() })),
      missed: z.array(z.string()),
    })
    .optional(),
});

const TRANSCRIPT_RULE: Record<TranscriptMode, string> = {
  verbatim: "- The transcript must be verbatim and include fillers so they can be counted. Count fillers precisely.",
  "read-aloud":
    '- This is a read-aloud drill and the passage is given to you. Never write the passage out: leave "transcript" empty, fill "reading" instead, and quote at most five consecutive words of the passage anywhere in your answer. Count fillers precisely.',
  "no-recite":
    "- The transcript is verbatim for the speaker's own words, fillers included, so they can be counted. Where the speaker recites published text (a famous speech, a poem, a book passage, lyrics, scripture), do not write those words out: replace the whole stretch with one bracketed description such as [recites the opening of a famous speech, about 40 words]. Never quote more than five consecutive words of published text anywhere in your answer. Count fillers precisely.",
};

function systemInstruction(mode: TranscriptMode): string {
  return `You are Vero, the coach inside Verve — a daily communication-training app. You are a world-class public speaking, storytelling and voice coach in the tradition of Vinh Giang, Matt Abrahams, Yasir Khan and Nancy Duarte. You watch a user's practice recording and coach them. You also know their recent history.

Coaching principles:
- PATTERNS OVER INCIDENTS. A habit that shows up across sessions matters more than anything that happened once. A one-time slip (a single lost word, a cough, the timer ending the recording mid-sentence) is an incident: tag it, mark incident=true, and never let it become the topFix or nextFocusSkillId.
- If the recording ended by the timer, an unfinished final sentence is NOT a fault. Do not tag "unfinished-sentences" for it; use "cut-off-by-timer" with incident=true if you mention it at all.
- Progressive overload: one fix at a time. The topFix must be the highest-leverage RECURRING weakness: something visible in this clip AND in the history (or, with no history, something that happened more than once in this clip). If a dimension has sat at 6–7 for several sessions, that persistent ceiling is exactly what to name.
- Be specific and evidence-based: quote timestamps, numbers and the user's actual words.
- Be warm, direct, and short. No paragraphs. Every string you return must respect its word limit.
- Benchmarks: fillers ≤ 1/min elite, 2–4 good, 5 average, 8+ hurts credibility. Pace 120–160 wpm ideal; > 170 rushed; < 110 dragging. Deliberate pauses at sentence ends are strength.

Scoring: use the whole 1–10 range and be decisive.
- 3 = a weakness anyone would notice. 5 = average untrained speaker. 7 = competent, no obvious fault. 8 = noticeably skilled. 9–10 = elite.
- vocalVariety: pitch spread < 4 semitones or flat volume → ≤ 5; 5–8 semitones → 6–7; ≥ 9 semitones with deliberate pauses and emphasis → 8+.
- energy: quiet, low affect → ≤ 5; steady conversational → 6; animated with volume changes → 7–8; magnetic → 9.
- presence: eyes off the lens or fidgeting → ≤ 5; steady, planted, some gestures → 6–7; expressive face, purposeful gestures, stillness between → 8+. No video → 6 and say nothing about it.
- engagement: facts only → ≤ 5; one hook, example or analogy → 6–7; hooks, questions, contrast and a landing → 8+.
- structure: no point first → ≤ 5; framework followed → 7; signposted with a strong close → 8+.
- Compare against the speaker's history averages when provided: if this clip is clearly better or worse than their average in a dimension, move that score by at least one point.

Role-play sessions (DECA / FBLA), when a case and rubric are provided:
- You are the judge. Score every rubric item within its scale, using the band definitions given. DECA bands: Exceeds Expectations = would rank in the top 10% of business personnel performing this indicator; Meets = acceptable and effective, 70–89th percentile, no further training needed; Below = limited effectiveness, 50–69th percentile; Little/No Value = 0–49th percentile. An indicator that was never mentioned or applied scores in the lowest band. For "Exemplary/Proficient/Developing/Novice" and FBLA sheets, use the same top-10% / competent / limited / absent logic.
- A performance indicator counts as addressed only if the speaker defines or clearly applies it to THIS company's situation. Naming it without applying it is "Below". List every unaddressed indicator in rubric.missed, verbatim.
- Weigh the judge questions: they were shown on screen at the listed times; judge the answers that follow them.
- Roleplay observation tags (pi-missed, pi-shallow, no-greeting, no-recommendation, no-close, vague-plan, weak-qa, no-business-vocab, ran-short, ran-long, no-alternatives) exist for this purpose; use them, and pick the topFix from what cost the most rubric points.
- Do not invent facts about the company beyond the case. Judge what was said.

Silence rule (absolute): if you cannot hear intelligible speech from the speaker (silence, room noise, a muted or missing microphone), set noSpeech=true, leave the transcript empty, and do NOT write anything the speaker "said". Never invent a transcript or score words you did not hear.

Output rules:
- observations: 3–6 items, tags ONLY from the catalog provided, each with severity 1–3, incident true/false, and ≤ 12 words of evidence.
- topFix.skillId and nextFocusSkillId MUST be ids from the skill list. Prefer the skill that fixes the strongest recurring tag.
${TRANSCRIPT_RULE[mode]}
- Do not mention that you are an AI. Speak as Vero.`;
}

function userPrompt(ctx: AnalyzeContext, mode: TranscriptMode, passage?: Passage): string {
  const drill = DRILL_MAP[ctx.drillId];
  const fw = ctx.frameworkId ? FRAMEWORK_MAP[ctx.frameworkId] : undefined;
  const focus = ctx.focusSkillId ? SKILL_MAP[ctx.focusSkillId] : undefined;
  const skillList = SKILLS.map((s) => `${s.id} (${s.branch}: ${s.name})`).join(", ");
  const lines: string[] = [];
  lines.push(`Speaker: ${ctx.displayName ?? "the user"}. Session type: ${ctx.kind}.`);
  lines.push(`Drill: ${drill?.name ?? ctx.drillId}. Instructions given: ${drill?.steps.join(" / ") ?? ""}`);
  lines.push(`Evaluate most: ${drill?.evalFocus.join(", ") ?? "overall delivery"}.`);
  if (ctx.prompt) lines.push(`Prompt / topic: "${ctx.prompt}"`);
  if (ctx.promptExtra?.length) lines.push(`Sub-prompts in order: ${ctx.promptExtra.map((p, i) => `${i + 1}) ${p}`).join(" ")}`);
  if (mode === "read-aloud" && passage) {
    const n = passage.text.split(/\s+/).filter(Boolean).length;
    lines.push(`READ-ALOUD DRILL. The speaker is reading this passage from the screen: "${passage.title}" (${passage.source}), ${n} words:`);
    lines.push(`"""${passage.text}"""`);
    lines.push(
      `The words are not the speaker's own, so do not judge or comment on the wording, the content or how it is organised. Judge the delivery: which word they stressed in each sentence, pauses at the punctuation, pace, vocal variety, eyes on the lens.`,
    );
    lines.push(
      `Do not write the passage out. Set "transcript" to "". In "reading": finished = did they reach the final word; readTo = the last four words of the passage they actually said; slips = what differed from the page, with timestamps. Set wordCount to the number of words they actually spoke.`,
    );
  }
  if (fw) lines.push(`Framework required: ${fw.name} — ${fw.steps.map((s) => s.label).join(" → ")}. Report adherence in "framework".`);
  if (focus) {
    const on = ctx.history?.focus?.skillId === focus.id ? ` (session ${(ctx.history?.focus?.sessions ?? 0) + 1} on this focus)` : "";
    lines.push(`Current focus skill: ${focus.id} (${focus.name})${on}. Cue: "${focus.cue}". Say whether it improved.`);
  }
  lines.push(`Recording length: ${Math.round(ctx.durationSec)} seconds. Ended by: ${ctx.endedBy === "timer" ? "THE TIMER (hard stop after a 5-second grace). An unfinished last sentence is not a fault." : "the speaker, deliberately."}`);
  if (ctx.audio) {
    const a = ctx.audio;
    lines.push(
      `Deterministic audio metrics from the device (trust these numbers): pauses ≥0.5s: ${a.pauseCount} (longest ${a.longestPauseSec}s), speaking ratio ${Math.round(a.speakingRatio * 100)}%, pitch median ${a.pitchMedianHz} Hz, pitch spread ${a.pitchSpreadSemitones} semitones (p10–p90), volume range ${a.volumeRangeDb} dB, monotone flag: ${a.monotone ? "YES" : "no"}, variety score ${a.varietyScore}/100.`,
    );
  }
  const h = ctx.history;
  if (h && h.sessions.length) {
    lines.push(`History, newest first (${h.sessions.length} sessions):`);
    for (const s of h.sessions) {
      lines.push(`- ${s.date} · ${s.drill} · overall ${s.overall} · ${s.fillersPerMin} fillers/min${s.pitchSpread !== undefined ? ` · pitch spread ${s.pitchSpread} st` : ""} · tags: ${s.tags.join(", ") || "none"}${s.topFix ? ` · top fix: ${s.topFix}` : ""}`);
    }
    if (h.dimensionAvg && Object.keys(h.dimensionAvg).length) {
      lines.push(`Dimension averages over that window: ${Object.entries(h.dimensionAvg).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
    }
    if (h.recurringTags?.length) lines.push(`Recurring tags: ${h.recurringTags.map((t) => `${t.tag} ×${t.count}`).join(", ")}.`);
    lines.push(`Use the history: name persistent ceilings, credit real improvement, and do not repeat a fix that has clearly been solved.`);
  } else if (ctx.previous?.topFixTitle) {
    lines.push(`Last session's top fix: "${ctx.previous.topFixTitle}" (${ctx.previous.topFixSkillId ?? "?"}). Last fillers/min: ${ctx.previous.fillersPerMin ?? "?"}. Last overall: ${ctx.previous.overall ?? "?"}.`);
  }
  const rp = ctx.roleplay;
  if (rp) {
    lines.push(`ROLE-PLAY: ${rp.org} ${rp.formatName} (${rp.prepMinutes} min prep, up to ${rp.presentMinutes} min with the judge).`);
    lines.push(`Participant role: ${rp.role}. Judge role: ${rp.judgeRole}.`);
    lines.push(`Situation: ${rp.situation}`);
    lines.push(`The ask: ${rp.ask}`);
    lines.push(`Performance indicators: ${rp.pis.map((p, i) => `${i + 1}) ${p}`).join(" ")}`);
    lines.push(rp.questionsAsked.length ? `Judge questions shown on screen: ${rp.questionsAsked.map((q) => `[${Math.round(q.t)}s] ${q.q}`).join(" | ")}` : "No judge questions were shown.");
    lines.push(`Rubric (score each id within its scale; band upper bounds listed low→high, named ${rp.bandNames.join(" / ")}): ${rp.rubric.map((r) => `${r.id}: "${r.label}" max ${r.max}, bands ${r.bands.join("/")}`).join("; ")}.`);
    lines.push(`Return rubric.items with one entry per id above and rubric.missed with unaddressed indicators.`);
  }
  lines.push(`Observation tag catalog (tag: when to use): ${OBSERVATION_TAGS.map((t) => `${t.tag}: ${t.hint}`).join("; ")}.`);
  lines.push(`Skill ids you may reference: ${skillList}.`);
  if (mode === "no-recite") {
    lines.push(`An earlier attempt at this review was blocked for reproducing published text. Follow the transcript rule exactly: describe recited text in brackets, never type it out.`);
  }
  lines.push(`Return JSON only, matching the schema. Respect every word limit.`);
  return lines.join("\n");
}

async function waitForActive(ai: GoogleGenAI, name: string, timeoutMs = 150_000) {
  const start = Date.now();
  for (;;) {
    const f = await ai.files.get({ name });
    if (f.state === "ACTIVE") return f;
    if (f.state === "FAILED") throw new Error("Gemini could not process the file");
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for Gemini file processing");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** Pitch spread (p10–p90 semitones) → 1–10, used to anchor Vero's vocal variety score. */
function varietyFromSpread(st: number): number {
  if (st <= 0) return 0;
  if (st < 3) return 3;
  if (st < 4) return 4;
  if (st < 5) return 5;
  if (st < 7) return 6;
  if (st < 9) return 7;
  if (st < 12) return 8;
  return 9;
}

interface SpeechPresence {
  speech: boolean;
  seconds: number;
  words: number;
  note?: string;
}

const PRESENCE_SCHEMA = {
  type: Type.OBJECT,
  required: ["speech", "seconds", "words", "note"],
  properties: {
    speech: { type: Type.BOOLEAN, description: "true only if a human voice speaking words is audible" },
    seconds: { type: Type.NUMBER, description: "seconds of the recording that contain speech; 0 if none" },
    words: { type: Type.INTEGER, description: "approximate number of words spoken; 0 if none" },
    note: { type: Type.STRING, description: "what the audio contains, at most 12 words" },
  },
};

const presenceSchema = z.object({ speech: z.boolean(), seconds: z.number().min(0), words: z.number().min(0), note: z.string().optional() });

/**
 * One narrow question before the full review: is anyone talking?
 * The analysis schema demands a transcript and scores, and a flash model will invent both for a silent
 * file no matter what the prompt says. Here silence is an expected answer, not a hole to fill.
 */
async function detectSpeech(ai: GoogleGenAI, filePart: Part, model: string): Promise<SpeechPresence> {
  const res = await ai.models.generateContent({
    model,
    contents: createUserContent([
      filePart,
      "Listen to the whole recording. Report whether a human voice is speaking words. Silence, hiss, hum, room noise, keyboard clicks or music without a voice all count as no speech. Do not guess what someone might have said: if you hear no words, answer speech=false, seconds=0, words=0.",
    ]),
    config: { responseMimeType: "application/json", responseSchema: PRESENCE_SCHEMA, temperature: 0 },
  });
  const parsed = presenceSchema.parse(JSON.parse(stripFences(res.text ?? "")));
  console.log(`[gemini] speech presence (${model}): speech=${parsed.speech} seconds=${parsed.seconds} words=${parsed.words} · ${parsed.note ?? ""}`);
  return parsed;
}

/** No new review attempt starts after this long: the route has 300 s in total. */
const RETRY_BUDGET_MS = 180_000;

export async function analyzeMedia(bytes: Buffer | Uint8Array, mimeType: string, ctx: AnalyzeContext, apiKey?: string): Promise<VeroAnalysis> {
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey: apiKey ?? env("GEMINI_API_KEY") });
  const primary = optionalEnv("GEMINI_MODEL") ?? "gemini-3.8-flash";
  const fallback = "gemini-2.5-flash";

  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const uploaded = await ai.files.upload({ file: blob, config: { mimeType, displayName: `verve-${ctx.drillId}-${Date.now()}` } });
  if (!uploaded.name) throw new Error("Gemini upload failed");
  const active = await waitForActive(ai, uploaded.name);
  if (!active.uri || !active.mimeType) throw new Error("Gemini file missing uri");

  const filePart = createPartFromUri(active.uri, active.mimeType);
  // Gate before the review. Any take long enough to be scored gets the presence check; a failure of the
  // check itself (quota, outage) must not block a real tape, so it degrades to "unknown".
  if (ctx.durationSec >= 8) {
    const presence = await detectSpeech(ai, filePart, primary).catch(() => detectSpeech(ai, filePart, fallback).catch(() => null));
    if (presence && (!presence.speech || presence.seconds < 2)) {
      ai.files.delete({ name: uploaded.name }).catch(() => {});
      throw new NoSpeechError();
    }
  }

  const passage = DRILL_MAP[ctx.drillId]?.material.kind === "passage" ? findPassage(ctx.passageId, ctx.prompt) : undefined;

  type Outcome = { ok: true; parsed: z.infer<typeof analysisSchema>; model: string; mode: TranscriptMode } | { ok: false; reason: "recitation" | "empty"; detail: string };
  const review = async (model: string, mode: TranscriptMode): Promise<Outcome> => {
    const res = await ai.models.generateContent({
      model,
      contents: createUserContent([filePart, userPrompt(ctx, mode, passage)]),
      config: {
        systemInstruction: systemInstruction(mode),
        responseMimeType: "application/json",
        responseSchema: responseSchema(mode),
        temperature: 0.4,
      },
    });
    const text = res.text ?? "";
    const finish = String(res.candidates?.[0]?.finishReason ?? "none");
    const detail = `model=${model} mode=${mode} finish=${finish} block=${res.promptFeedback?.blockReason ?? "none"} chars=${text.length}`;
    console.log(`[gemini] review ${detail} thoughts=${res.usageMetadata?.thoughtsTokenCount ?? 0} out=${res.usageMetadata?.candidatesTokenCount ?? 0}`);
    if (finish === "RECITATION") return { ok: false, reason: "recitation", detail };
    try {
      return { ok: true, parsed: analysisSchema.parse(JSON.parse(stripFences(text))), model, mode };
    } catch {
      // Empty body, output cut off mid-object, or a shape the schema refuses: all unusable, none worth showing raw.
      return { ok: false, reason: "empty", detail };
    }
  };

  // At most three calls. A recitation block on a verbatim transcript is retried without the recited text;
  // anything else unusable (and any API error) gets one go on the fallback model.
  let done: Extract<Outcome, { ok: true }> | null = null;
  let failed: Extract<Outcome, { ok: false }> | null = null;
  try {
    let next: { model: string; mode: TranscriptMode } | null = { model: primary, mode: passage ? "read-aloud" : "verbatim" };
    for (let n = 0; next && n < 3; n++) {
      if (n > 0 && Date.now() - startedAt > RETRY_BUDGET_MS) break;
      const cur: { model: string; mode: TranscriptMode } = next;
      next = null;
      let r: Outcome;
      try {
        r = await review(cur.model, cur.mode);
      } catch (e) {
        if (cur.model === fallback) throw e;
        console.error(`[gemini] ${cur.model} failed, falling back`, e);
        next = { model: fallback, mode: cur.mode };
        continue;
      }
      if (r.ok) {
        done = r;
        break;
      }
      failed = r;
      if (r.reason === "recitation" && cur.mode === "verbatim") next = { model: cur.model, mode: "no-recite" };
      else if (cur.model !== fallback) next = { model: fallback, mode: cur.mode };
    }
  } finally {
    ai.files.delete({ name: uploaded.name }).catch(() => {});
  }
  if (!done) throw new ReviewError(failed?.reason ?? "empty", failed?.detail ?? "no attempt completed");

  const { parsed, mode } = done;
  const out = { model: done.model };
  const minutes = Math.max(0.25, ctx.durationSec / 60);
  const typedWords = parsed.transcript.trim().split(/\s+/).filter(Boolean).length;
  const asRead = mode === "read-aloud" && passage ? passageAsRead(passage.text, parsed.reading, parsed.wordCount || 0) : null;
  // Words actually spoken. Only a verbatim transcript can be counted; otherwise Vero's own count stands in.
  const spokenWords = mode === "verbatim" ? typedWords : asRead ? parsed.wordCount || asRead.words : Math.max(parsed.wordCount || 0, typedWords);
  const wordCount = mode === "verbatim" ? parsed.wordCount || typedWords : spokenWords;
  // A silent tape must never become feedback.
  if (parsed.noSpeech || (ctx.durationSec >= 15 && spokenWords < 5)) throw new NoSpeechError();
  const fillersTotal = parsed.fillers.total;
  const clamp10 = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));

  // Deterministic anchor: blend Vero's vocal variety with measured pitch spread.
  let vocalVariety = clamp10(parsed.scores.vocalVariety);
  const spread = ctx.audio?.pitchSpreadSemitones ?? 0;
  const det = varietyFromSpread(spread);
  if (det > 0 && ctx.durationSec >= 30) vocalVariety = clamp10(vocalVariety * 0.5 + det * 0.5);

  const scores = {
    clarity: clamp10(parsed.scores.clarity),
    structure: clamp10(parsed.scores.structure),
    vocalVariety,
    energy: clamp10(parsed.scores.energy),
    presence: clamp10(parsed.scores.presence),
    engagement: clamp10(parsed.scores.engagement),
    overall: clamp10(parsed.scores.overall),
  };

  // Observations: catalog tags only; incidents stay incidents; the timer cut-off is always an incident.
  const observations: Observation[] = [];
  for (const o of parsed.observations ?? []) {
    const t = TAG_MAP[o.tag];
    if (!t) continue;
    const incident = t.dimension === "incident" ? true : o.incident;
    observations.push({
      tag: o.tag,
      skillId: t.skillId,
      severity: (Math.max(1, Math.min(3, Math.round(o.severity))) as 1 | 2 | 3),
      incident,
      note: trimWords(o.note, 14),
      t: o.t !== undefined ? Math.max(0, Math.min(ctx.durationSec, o.t)) : undefined,
    });
  }
  if (ctx.endedBy === "timer") {
    // The clock, not the speaker, ended the sentence: never let that become the fix.
    const idx = observations.findIndex((o) => o.tag === "unfinished-sentences" && o.note && /timer|cut|end|final|last/i.test(o.note));
    if (idx >= 0) observations[idx] = { ...observations[idx], tag: "cut-off-by-timer", skillId: null, incident: true };
  }

  const validSkill = (id: string, fb: string) => (SKILL_MAP[id] ? id : fb);
  let topFix = {
    skillId: validSkill(parsed.topFix.skillId, ctx.focusSkillId ?? "fillers"),
    title: trimWords(parsed.topFix.title, 8),
    why: trimWords(parsed.topFix.why, 16),
    how: trimWords(parsed.topFix.how, 16),
  };
  // Guard: a timer cut-off must not produce a "finish your sentences" verdict unless trailing off is a real, separate pattern.
  const trailingIsPattern = observations.some((o) => o.tag === "unfinished-sentences" && !o.incident);
  if (ctx.endedBy === "timer" && topFix.skillId === "sentence-endings" && !trailingIsPattern) {
    const strongest = [...observations].filter((o) => !o.incident && o.skillId).sort((a, b) => b.severity - a.severity)[0];
    if (strongest && strongest.skillId) {
      const tag = TAG_MAP[strongest.tag];
      topFix = { skillId: strongest.skillId, title: tag.label, why: strongest.note, how: SKILL_MAP[strongest.skillId]?.cue ?? topFix.how };
    }
  }
  const nextFocus = validSkill(parsed.nextFocusSkillId, topFix.skillId);

  // Role-play rubric: attach labels and maxima from the spec, clamp points, total it.
  let rubric: RubricResult | undefined;
  if (ctx.roleplay && parsed.rubric) {
    const byId = new Map(parsed.rubric.items.map((it) => [it.id, it]));
    const items = ctx.roleplay.rubric.map((spec) => {
      const got = byId.get(spec.id);
      const points = Math.max(0, Math.min(spec.max, Math.round(got?.points ?? 0)));
      return { id: spec.id, label: spec.label, points, max: spec.max, note: trimWords(got?.note ?? "", 14) };
    });
    const total = items.reduce((a, b) => a + b.points, 0);
    const max = items.reduce((a, b) => a + b.max, 0);
    const known = new Set(ctx.roleplay.pis.map((p) => p.toLowerCase()));
    const missed = parsed.rubric.missed.filter((m) => known.has(m.toLowerCase()) || ctx.roleplay!.pis.some((p) => p.toLowerCase().includes(m.toLowerCase().slice(0, 30))));
    rubric = { org: ctx.roleplay.org, category: ctx.roleplay.category, items, total, max, missed };
  }

  return {
    rubric,
    transcript: asRead ? asRead.text : parsed.transcript.trim(),
    transcriptKind: asRead ? "passage" : mode === "no-recite" ? "summarized" : undefined,
    slips: asRead ? trimWords(parsed.reading?.slips ?? "", 60) || undefined : undefined,
    wordCount,
    wpm: Math.round(wordCount / minutes),
    fillers: {
      total: fillersTotal,
      perMin: Math.round((fillersTotal / minutes) * 10) / 10,
      top: parsed.fillers.top.slice(0, 4),
    },
    scores,
    observations: observations.slice(0, 8),
    topFix,
    win: { title: trimWords(parsed.win.title, 8), detail: trimWords(parsed.win.detail, 16) },
    framework: parsed.framework,
    moments: parsed.moments.slice(0, 4).map((m) => ({ ...m, t: Math.max(0, Math.min(ctx.durationSec, m.t)), note: trimWords(m.note, 12) })),
    nextFocusSkillId: nextFocus === "sentence-endings" && ctx.endedBy === "timer" && !trailingIsPattern ? topFix.skillId : nextFocus,
    oneLiner: trimWords(parsed.oneLiner, 16),
    model: out.model,
    analyzedAt: Date.now(),
  };
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

function trimWords(s: string, max: number): string {
  const words = s.trim().split(/\s+/);
  return words.length <= max ? s.trim() : words.slice(0, max).join(" ");
}
