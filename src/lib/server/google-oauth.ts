import "server-only";
import { env, googleClientId } from "./env";

export const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file"];

export function callbackPath() {
  return "/api/auth/google/callback";
}

export function buildAuthUrl(state: string, redirectUri: string, loginHint?: string): string {
  const p = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type: string;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: googleClientId(),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`refresh failed: ${res.status} ${text}`) as Error & { invalidGrant?: boolean };
    err.invalidGrant = /invalid_grant/.test(text);
    throw err;
  }
  return (await res.json()) as { access_token: string; expires_in: number };
}

export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) return {};
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
