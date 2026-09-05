import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/server/crypto";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  const raw = jar.get("verve_handoff")?.value;
  if (!raw) return NextResponse.json({ error: "no_handoff" }, { status: 404 });
  jar.delete("verve_handoff");
  try {
    const data = JSON.parse(decrypt(raw));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "bad_handoff" }, { status: 400 });
  }
}
