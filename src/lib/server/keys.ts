import "server-only";
import { optionalEnv } from "./env";

/**
 * Who may use the app's shared GEMINI_API_KEY.
 * Unset GEMINI_OWNER_EMAILS → everyone (single-user deployments).
 * Set it (comma-separated) → only those accounts; everyone else brings their own key.
 */
export function sharedKeyAllowed(email?: string): boolean {
  if (!optionalEnv("GEMINI_API_KEY")) return false;
  const list = optionalEnv("GEMINI_OWNER_EMAILS");
  if (!list) return true;
  const allowed = list
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email) && allowed.includes(email!.toLowerCase());
}

/** Cheap validity check: fetch one model's metadata with the key. */
export async function validateGeminiKey(key: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export function looksLikeKeyError(message: string): boolean {
  return /API key|API_KEY_INVALID|PERMISSION_DENIED|403|invalid.*key|unregistered callers|leaked/i.test(message);
}
