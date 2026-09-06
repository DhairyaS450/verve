import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMedia } from "@/lib/server/gemini";
import { verifyFirebaseIdToken } from "@/lib/server/verify-user";
import { decrypt } from "@/lib/server/crypto";
import { looksLikeKeyError, sharedKeyAllowed } from "@/lib/server/keys";
import { optionalEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 120 * 1024 * 1024;

const bodySchema = z.object({
  accessToken: z.string().min(10),
  fileId: z.string().min(5),
  mimeType: z.string().min(3),
  encGeminiKey: z.string().optional(),
  context: z.object({
    drillId: z.string(),
    kind: z.enum(["daily", "free", "baseline"]),
    prompt: z.string().optional(),
    promptExtra: z.array(z.string()).optional(),
    focusSkillId: z.string().optional(),
    frameworkId: z.string().optional(),
    durationSec: z.number().positive(),
    displayName: z.string().optional(),
    audio: z.any().optional(),
    endedBy: z.enum(["timer", "user"]).optional(),
    history: z
      .object({
        sessions: z.array(
          z.object({
            date: z.string(),
            drill: z.string(),
            overall: z.number(),
            fillersPerMin: z.number(),
            pitchSpread: z.number().optional(),
            tags: z.array(z.string()),
            topFix: z.string().optional(),
          }),
        ),
        dimensionAvg: z.record(z.string(), z.number()).optional(),
        recurringTags: z.array(z.object({ tag: z.string(), count: z.number() })).optional(),
        focus: z.object({ skillId: z.string(), sessions: z.number() }).optional(),
      })
      .optional(),
    previous: z
      .object({
        topFixTitle: z.string().optional(),
        topFixSkillId: z.string().optional(),
        fillersPerMin: z.number().optional(),
        overall: z.number().optional(),
      })
      .optional(),
  }),
});

export async function POST(req: Request) {
  let email: string | undefined;
  try {
    ({ email } = await verifyFirebaseIdToken(req));
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: parsed.error.flatten() }, { status: 400 });
  const { accessToken, fileId, mimeType, context, encGeminiKey } = parsed.data;

  // ---- Which Gemini key pays for this? The user's own, or the shared one if allowed.
  let apiKey: string | undefined;
  let ownKey = false;
  if (encGeminiKey) {
    try {
      apiKey = decrypt(encGeminiKey);
      ownKey = true;
    } catch {
      return NextResponse.json({ error: "key_invalid" }, { status: 402 });
    }
  } else if (sharedKeyAllowed(email)) {
    apiKey = optionalEnv("GEMINI_API_KEY");
  }
  if (!apiKey) return NextResponse.json({ error: "key_required" }, { status: 402 });

  try {
    const media = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!media.ok) {
      return NextResponse.json({ error: "drive_fetch_failed", status: media.status }, { status: 502 });
    }
    const len = Number(media.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const bytes = Buffer.from(await media.arrayBuffer());
    if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

    const analysis = await analyzeMedia(bytes, mimeType, context, apiKey);
    return NextResponse.json({ analysis });
  } catch (e) {
    const err = e as Error;
    console.error("analyze", err);
    if (ownKey && looksLikeKeyError(err.message ?? "")) return NextResponse.json({ error: "key_invalid" }, { status: 402 });
    return NextResponse.json({ error: "analysis_failed", message: err.message }, { status: 500 });
  }
}
