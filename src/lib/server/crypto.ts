import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { optionalEnv } from "./env";

function key(): Buffer {
  const b64 = optionalEnv("TOKEN_ENC_KEY");
  if (b64) {
    const k = Buffer.from(b64, "base64");
    if (k.length === 32) return k;
  }
  const secret = optionalEnv("GOOGLE_CLIENT_SECRET");
  if (!secret) throw new Error("TOKEN_ENC_KEY or GOOGLE_CLIENT_SECRET required for encryption");
  return createHash("sha256").update(`verve:${secret}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decrypt(token: string): string {
  const raw = Buffer.from(token, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

export function randomState(): string {
  return randomBytes(16).toString("base64url");
}
