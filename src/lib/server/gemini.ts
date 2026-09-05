import "server-only";
import { GoogleGenAI, Type, createPartFromUri, createUserContent } from "@google/genai";
import { z } from "zod";
import { env, optionalEnv } from "./env";
import { SKILLS, SKILL_MAP } from "@/content/skills";
import { FRAMEWORK_MAP } from "@/content/frameworks";
import { DRILL_MAP } from "@/content/drills";
import type { AudioMetrics, VeroAnalysis } from "../types";

export interface AnalyzeContext {
  drillId: string;
  kind: "daily" | "free" | "baseline";
  prompt?: string;
  promptExtra?: string[];
  focusSkillId?: string;
  frameworkId?: string;
  durationSec: number;
  audio?: AudioMetrics;
  previous?: { topFixTitle?: string; topFixSkillId?: string; fillersPerMin?: number; overall?: number };
  displayName?: string;
}

const scoreField = { type: Type.NUMBER, description: "1-10" } as const;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ["transcript", "wordCount", "fillers", "scores", "topFix", "win", "moments", "nextFocusSkillId", "oneLiner"],
  properties: {
    transcript: { type: Type.STRING, description: "Verbatim transcript including filler words like um, uh, like, you know." },
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
    topFix: {
      type: Type.OBJECT,
      required: ["skillId", "title", "why", "how"],
      properties: {
        skillId: { type: Type.STRING, description: "One skill id from the provided list." },
        title: { type: Type.STRING, description: "≤ 7 words. The single biggest thing to fix." },
        why: { type: Type.STRING, description: "≤ 14 words. Evidence from the tape." },
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
    nextFocusSkillId: { type: Type.STRING, description: "Skill id to train next session. Usually topFix.skillId." },
    oneLiner: { type: Type.STRING, description: "≤ 14 words. Vero's verdict, direct and warm." },
  },
};

const analysisSchema = z.object({
  transcript: z.string(),
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
  topFix: z.object({ skillId: z.string(), title: z.string(), why: z.string(), how: z.string() }),
  win: z.object({ title: z.string(), detail: z.string() }),
  framework: z.object({ followed: z.boolean(), missing: z.array(z.string()) }).optional(),
  moments: z.array(z.object({ t: z.number(), kind: z.enum(["good", "fix"]), note: z.string() })),
  nextFocusSkillId: z.string(),
  oneLiner: z.string(),
});

function systemInstruction(): string {
  return `You are Vero, the coach inside Verve — a daily communication-training app. You are a world-class public speaking, storytelling and voice coach in the tradition of Vinh Giang, Matt Abrahams, Yasir Khan and Nancy Duarte. You watch a user's practice recording and coach them.

Coaching principles:
- Progressive overload: fix ONE thing at a time. Pick the single highest-leverage fix. Not a list.
- Be specific and evidence-based: quote timestamps and the user's actual words.
- Be warm, direct, and short. No paragraphs. Every string you return must respect its word limit.
- Benchmarks: fillers ≤ 1/min elite, 2–4 good, 5 average, 8+ hurts credibility. Pace 120–160 wpm ideal for talks; > 170 rushed; < 110 dragging. Vocal variety: pitch and volume should move; monotone kills attention. Pauses at sentence ends are strength, not weakness.
- Structure: judge against the framework provided if any. A missing final point or a trailing ending is a structure fault.
- Presence (if video): eye contact with the lens, still feet, gestures in the "power sphere" (belly to eyes), expressive face. If no video is present, score presence from vocal confidence only and say so in no field except keep it neutral (6).
- Story drills: judge hook, present tense / dialogue (reliving vs reporting), sensory detail, stakes, and a one-sentence landing.
- Scores are 1–10 and honest. A first-timer usually sits at 4–6. Reserve 9–10 for genuinely elite delivery.
- topFix.skillId and nextFocusSkillId MUST be ids from the skill list provided. Prefer the fix that unlocks the most improvement fastest. Do not pick the same fix as last session if it clearly improved; move on.
- The transcript must be verbatim and include fillers (um, uh, like, you know) so they can be counted. Count fillers precisely.
- Do not mention that you are an AI. Speak as Vero.`;
}

function userPrompt(ctx: AnalyzeContext): string {
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
  if (fw) lines.push(`Framework required: ${fw.name} — ${fw.steps.map((s) => s.label).join(" → ")}. Report adherence in "framework".`);
  if (focus) lines.push(`Current focus skill: ${focus.id} (${focus.name}). Cue: "${focus.cue}". Comment on whether it improved.`);
  if (ctx.previous?.topFixTitle) {
    lines.push(
      `Last session's top fix: "${ctx.previous.topFixTitle}" (${ctx.previous.topFixSkillId ?? "?"}). Last fillers/min: ${ctx.previous.fillersPerMin ?? "?"}. Last overall: ${ctx.previous.overall ?? "?"}. If that improved, acknowledge it in win or oneLiner and pick the next fix.`,
    );
  }
  lines.push(`Recording length: ${Math.round(ctx.durationSec)} seconds.`);
  if (ctx.audio) {
    const a = ctx.audio;
    lines.push(
      `Deterministic audio metrics from the device (trust these numbers): pauses ≥0.5s: ${a.pauseCount} (longest ${a.longestPauseSec}s), speaking ratio ${Math.round(a.speakingRatio * 100)}%, pitch median ${a.pitchMedianHz} Hz, pitch spread ${a.pitchSpreadSemitones} semitones (p10–p90), volume range ${a.volumeRangeDb} dB, monotone flag: ${a.monotone ? "YES" : "no"}, variety score ${a.varietyScore}/100.`,
    );
  }
  lines.push(`Skill ids you may reference: ${skillList}.`);
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

export async function analyzeMedia(bytes: Buffer | Uint8Array, mimeType: string, ctx: AnalyzeContext): Promise<VeroAnalysis> {
  const ai = new GoogleGenAI({ apiKey: env("GEMINI_API_KEY") });
  const primary = optionalEnv("GEMINI_MODEL") ?? "gemini-3.8-flash";
  const fallback = "gemini-2.5-flash";

  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const uploaded = await ai.files.upload({ file: blob, config: { mimeType, displayName: `verve-${ctx.drillId}-${Date.now()}` } });
  if (!uploaded.name) throw new Error("Gemini upload failed");
  const active = await waitForActive(ai, uploaded.name);
  if (!active.uri || !active.mimeType) throw new Error("Gemini file missing uri");

  const contents = createUserContent([createPartFromUri(active.uri, active.mimeType), userPrompt(ctx)]);
  const run = async (model: string) => {
    const res = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction(),
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });
    const text = res.text ?? "";
    return { text, model };
  };

  let out: { text: string; model: string };
  try {
    out = await run(primary);
  } catch (e) {
    console.error(`[gemini] ${primary} failed, falling back`, e);
    out = await run(fallback);
  } finally {
    ai.files.delete({ name: uploaded.name }).catch(() => {});
  }

  const parsed = analysisSchema.parse(JSON.parse(stripFences(out.text)));
  const minutes = Math.max(0.25, ctx.durationSec / 60);
  const wordCount = parsed.wordCount || parsed.transcript.split(/\s+/).filter(Boolean).length;
  const fillersTotal = parsed.fillers.total;
  const clamp10 = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));
  const scores = {
    clarity: clamp10(parsed.scores.clarity),
    structure: clamp10(parsed.scores.structure),
    vocalVariety: clamp10(parsed.scores.vocalVariety),
    energy: clamp10(parsed.scores.energy),
    presence: clamp10(parsed.scores.presence),
    engagement: clamp10(parsed.scores.engagement),
    overall: clamp10(parsed.scores.overall),
  };
  const validSkill = (id: string, fb: string) => (SKILL_MAP[id] ? id : fb);
  const topSkill = validSkill(parsed.topFix.skillId, ctx.focusSkillId ?? "fillers");
  return {
    transcript: parsed.transcript.trim(),
    wordCount,
    wpm: Math.round(wordCount / minutes),
    fillers: {
      total: fillersTotal,
      perMin: Math.round((fillersTotal / minutes) * 10) / 10,
      top: parsed.fillers.top.slice(0, 4),
    },
    scores,
    topFix: { skillId: topSkill, title: trimWords(parsed.topFix.title, 8), why: trimWords(parsed.topFix.why, 16), how: trimWords(parsed.topFix.how, 16) },
    win: { title: trimWords(parsed.win.title, 8), detail: trimWords(parsed.win.detail, 16) },
    framework: parsed.framework,
    moments: parsed.moments.slice(0, 4).map((m) => ({ ...m, t: Math.max(0, Math.min(ctx.durationSec, m.t)), note: trimWords(m.note, 12) })),
    nextFocusSkillId: validSkill(parsed.nextFocusSkillId, topSkill),
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
