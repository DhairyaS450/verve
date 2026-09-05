"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { ensureProfile, saveDriveToken } from "@/lib/db";
import { cacheAccessToken } from "@/lib/drive";
import { VeroMark } from "@/components/VeroMark";

interface Handoff {
  idToken?: string;
  accessToken?: string;
  expiresAt?: number;
  encRefreshToken?: string | null;
  email?: string;
  next?: string;
}

export default function AuthComplete() {
  const router = useRouter();
  const ran = useRef(false);
  const [msg, setMsg] = useState("Signing you in");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/handoff", { method: "POST" });
        if (!res.ok) {
          router.replace("/welcome?error=no_handoff");
          return;
        }
        const h = (await res.json()) as Handoff;
        if (!h.idToken) throw new Error("no id token");
        const cred = GoogleAuthProvider.credential(h.idToken, h.accessToken);
        const result = await signInWithCredential(firebaseAuth(), cred);
        const profile = await ensureProfile(result.user);
        if (h.accessToken && h.expiresAt) cacheAccessToken(result.user.uid, h.accessToken, h.expiresAt);
        if (h.encRefreshToken) {
          setMsg("Connecting your Drive");
          await saveDriveToken(result.user.uid, { encRefreshToken: h.encRefreshToken, email: h.email, connectedAt: Date.now() });
        }
        const next = h.next && h.next.startsWith("/") ? h.next : "/today";
        router.replace(profile.onboarded ? next : "/onboarding");
      } catch (e) {
        console.error(e);
        router.replace("/welcome?error=signin_failed");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="flex items-center gap-3 text-ink-2">
        <VeroMark size={22} className="blink" />
        <span className="label">{msg}</span>
      </div>
    </div>
  );
}
