import { NextResponse } from "next/server";
import { decrypt } from "@/lib/server/crypto";
import { refreshAccessToken } from "@/lib/server/google-oauth";
import { verifyFirebaseIdToken } from "@/lib/server/verify-user";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await verifyFirebaseIdToken(req);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  let body: { encRefreshToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.encRefreshToken) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  try {
    const refreshToken = decrypt(body.encRefreshToken);
    const t = await refreshAccessToken(refreshToken);
    return NextResponse.json({ accessToken: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 - 30_000 });
  } catch (e) {
    const err = e as Error & { invalidGrant?: boolean };
    console.error("drive token", err.message);
    return NextResponse.json({ error: err.invalidGrant ? "reconnect" : "refresh_failed" }, { status: err.invalidGrant ? 401 : 502 });
  }
}
