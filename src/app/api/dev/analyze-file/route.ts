import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { analyzeMedia } from "@/lib/server/gemini";
import { CASE_MAP } from "@/content/cases";
import { bandNamesFor, rubricFor } from "@/content/roleplay";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Development only: run the Vero pipeline on a local file with a synthetic history. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { path, mimeType, drillId = "m-321", durationSec = 60, endedBy = "timer", caseId } = (await req.json()) as {
    path: string;
    mimeType: string;
    drillId?: string;
    durationSec?: number;
    endedBy?: "timer" | "user";
    caseId?: string;
  };
  const started = Date.now();
  const c = caseId ? CASE_MAP[caseId] : undefined;
  try {
    const bytes = await readFile(path);
    const analysis = await analyzeMedia(bytes, mimeType, {
      drillId,
      kind: "daily",
      prompt: c ? c.title : "Traffic cone",
      focusSkillId: c ? "rp-pis" : "fillers",
      frameworkId: c ? undefined : "three-two-one",
      durationSec,
      endedBy,
      roleplay: c
        ? {
            org: c.org,
            category: c.category,
            formatName: "DECA Individual Series",
            prepMinutes: 10,
            presentMinutes: 10,
            role: c.role,
            judgeRole: c.judgeRole,
            situation: c.situation,
            ask: c.ask,
            pis: c.pis,
            questionsAsked: c.questions.slice(0, 1).map((q) => ({ t: 40, q })),
            rubric: rubricFor(c.category, c.pis).map((r) => ({ id: r.id, label: r.label, max: r.max, bands: r.bands })),
            bandNames: [...bandNamesFor(c.category)],
          }
        : undefined,
      displayName: "Dhairya",
      audio: {
        durationSec,
        speakingRatio: 0.82,
        pauseCount: 6,
        longestPauseSec: 1.4,
        meanPauseSec: 0.7,
        pitchMedianHz: 118,
        pitchSpreadSemitones: 3.8,
        varietyScore: 18,
        volumeMeanDb: -22,
        volumeRangeDb: 9,
        monotone: true,
        envelope: [],
      },
      history: {
        sessions: [
          { date: "2026-09-05", drill: "60-second wheel", overall: 6.4, fillersPerMin: 2.1, pitchSpread: 4.1, tags: ["monotone", "no-hook"], topFix: "Replace um with silence" },
          { date: "2026-09-05", drill: "PREP an answer", overall: 6.2, fillersPerMin: 3.0, pitchSpread: 3.9, tags: ["monotone", "flat-emphasis"], topFix: "Finish your sentences" },
          { date: "2026-09-04", drill: "3-2-1 on an object", overall: 6.0, fillersPerMin: 4.5, pitchSpread: 4.4, tags: ["monotone", "fillers"], topFix: "Replace um with silence" },
          { date: "2026-09-04", drill: "Baseline", overall: 5.1, fillersPerMin: 8.0, pitchSpread: 3.6, tags: ["fillers", "monotone", "no-point-first"], topFix: "Replace um with silence" },
        ],
        dimensionAvg: { clarity: 6.6, structure: 6.3, vocalVariety: 5.9, energy: 6.1, presence: 6.5, engagement: 6.0 },
        recurringTags: [
          { tag: "monotone", count: 4 },
          { tag: "fillers", count: 2 },
        ],
        focus: { skillId: "fillers", sessions: 2 },
      },
      previous: { topFixTitle: "Replace um with silence", topFixSkillId: "fillers", fillersPerMin: 2.1, overall: 6.4 },
    });
    return NextResponse.json({ ms: Date.now() - started, analysis });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, ms: Date.now() - started }, { status: 500 });
  }
}
