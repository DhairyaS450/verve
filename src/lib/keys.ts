"use client";

import { firebaseAuth } from "./firebase";
import { deleteGeminiKey, getGeminiKey, saveGeminiKey } from "./db";

async function authHeader(): Promise<Record<string, string>> {
  const u = firebaseAuth().currentUser;
  if (!u) throw new Error("not signed in");
  return { authorization: `Bearer ${await u.getIdToken()}` };
}

export interface GeminiKeyStatus {
  hasOwnKey: boolean;
  last4?: string;
  sharedAllowed: boolean;
}

export async function getGeminiKeyStatus(uid: string): Promise<GeminiKeyStatus> {
  const [own, res] = await Promise.all([
    getGeminiKey(uid).catch(() => null),
    fetch("/api/keys/gemini", { headers: await authHeader() })
      .then((r) => (r.ok ? r.json() : { sharedAllowed: false }))
      .catch(() => ({ sharedAllowed: false })),
  ]);
  return { hasOwnKey: Boolean(own?.encKey), last4: own?.last4, sharedAllowed: Boolean(res.sharedAllowed) };
}

export async function saveOwnGeminiKey(uid: string, apiKey: string): Promise<{ last4: string }> {
  const res = await fetch("/api/keys/gemini", {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error === "invalid_key" ? "Google rejected that key. Check it and try again." : "Could not save the key.");
  }
  const { encKey, last4 } = (await res.json()) as { encKey: string; last4: string };
  await saveGeminiKey(uid, { encKey, last4, addedAt: Date.now() });
  return { last4 };
}

export async function removeOwnGeminiKey(uid: string) {
  await deleteGeminiKey(uid);
}
