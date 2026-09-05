import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/server/verify-user";
import { sharedKeyAllowed, validateGeminiKey } from "@/lib/server/keys";
import { encrypt } from "@/lib/server/crypto";

export const runtime = "nodejs";

/** Does this account get to use Verve's shared Gemini key? */
export async function GET(req: Request) {
  try {
    const { email } = await verifyFirebaseIdToken(req);
    return NextResponse.json({ sharedAllowed: sharedKeyAllowed(email) });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
}

/** Validate a user-supplied Gemini key and return it encrypted for storage in their own Firestore subtree. */
export async function POST(req: Request) {
  try {
    await verifyFirebaseIdToken(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const apiKey = (body.apiKey ?? "").trim();
  if (!/^[A-Za-z0-9_\-]{20,}$/.test(apiKey)) return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  const check = await validateGeminiKey(apiKey);
  if (!check.ok) return NextResponse.json({ error: "invalid_key", status: check.status }, { status: 400 });
  return NextResponse.json({ encKey: encrypt(apiKey), last4: apiKey.slice(-4) });
}
