import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMedia } from "@/lib/server/gemini";
import { verifyFirebaseIdToken } from "@/lib/server/verify-user";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 120 * 1024 * 1024;

const bodySchema = z.object({
  accessToken: z.string().min(10),
  fileId: z.string().min(5),
  mimeType: z.string().min(3),
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
  try {
    await verifyFirebaseIdToken(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", detail: parsed.error.flatten() }, { status: 400 });
  const { accessToken, fileId, mimeType, context } = parsed.data;

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

    const analysis = await analyzeMedia(bytes, mimeType, context);
    return NextResponse.json({ analysis });
  } catch (e) {
    const err = e as Error;
    console.error("analyze", err);
    return NextResponse.json({ error: "analysis_failed", message: err.message }, { status: 500 });
  }
}
