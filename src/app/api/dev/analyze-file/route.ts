import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { analyzeMedia } from "@/lib/server/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Development only: run the Vero pipeline on a local file. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { path, mimeType, drillId = "m-321", durationSec = 60 } = (await req.json()) as { path: string; mimeType: string; drillId?: string; durationSec?: number };
  const started = Date.now();
  try {
    const bytes = await readFile(path);
    const analysis = await analyzeMedia(bytes, mimeType, {
      drillId,
      kind: "daily",
      prompt: "Traffic cone",
      focusSkillId: "fillers",
      frameworkId: "three-two-one",
      durationSec,
      displayName: "Dhairya",
      audio: {
        durationSec,
        speakingRatio: 0.82,
        pauseCount: 6,
        longestPauseSec: 1.4,
        meanPauseSec: 0.7,
        pitchMedianHz: 118,
        pitchSpreadSemitones: 4.2,
        varietyScore: 21,
        volumeMeanDb: -22,
        volumeRangeDb: 9,
        monotone: false,
        envelope: [],
      },
      previous: { topFixTitle: "Finish your sentences", topFixSkillId: "sentence-endings", fillersPerMin: 9.1, overall: 4.8 },
    });
    return NextResponse.json({ ms: Date.now() - started, analysis });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, ms: Date.now() - started }, { status: 500 });
  }
}
