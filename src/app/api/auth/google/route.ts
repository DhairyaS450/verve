import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthUrl, callbackPath } from "@/lib/server/google-oauth";
import { randomState } from "@/lib/server/crypto";
import { appUrl } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/today";
  const hint = url.searchParams.get("hint") ?? undefined;
  const state = randomState();
  const jar = await cookies();
  jar.set("verve_oauth", JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const redirectUri = `${appUrl(req)}${callbackPath()}`;
  return NextResponse.redirect(buildAuthUrl(state, redirectUri, hint));
}
