import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callbackPath, decodeJwtPayload, exchangeCode } from "@/lib/server/google-oauth";
import { encrypt } from "@/lib/server/crypto";
import { appUrl } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const base = appUrl(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const raw = jar.get("verve_oauth")?.value;
  jar.delete("verve_oauth");

  if (error) return NextResponse.redirect(`${base}/welcome?error=${encodeURIComponent(error)}`);
  if (!code || !state || !raw) return NextResponse.redirect(`${base}/welcome?error=missing_state`);
  let saved: { state: string; next: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return NextResponse.redirect(`${base}/welcome?error=bad_state`);
  }
  if (saved.state !== state) return NextResponse.redirect(`${base}/welcome?error=state_mismatch`);

  try {
    const tokens = await exchangeCode(code, `${base}${callbackPath()}`);
    const payload = decodeJwtPayload(tokens.id_token ?? "");
    const handoff = {
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000 - 30_000,
      encRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      scope: tokens.scope ?? "",
      email: (payload.email as string) ?? "",
      next: saved.next || "/today",
    };
    jar.set("verve_handoff", encrypt(JSON.stringify(handoff)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 120,
    });
    return NextResponse.redirect(`${base}/auth/complete`);
  } catch (e) {
    console.error("oauth callback", e);
    return NextResponse.redirect(`${base}/welcome?error=exchange_failed`);
  }
}
