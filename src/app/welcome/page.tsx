"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { VeroMark } from "@/components/VeroMark";

const ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  missing_state: "Sign-in expired. Try again.",
  state_mismatch: "Sign-in expired. Try again.",
  exchange_failed: "Google rejected the sign-in. Try again.",
  no_handoff: "Sign-in expired. Try again.",
  signin_failed: "Could not sign in. Check that Google sign-in is enabled.",
};

function Welcome() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (!loading && user && profile) router.replace(profile.onboarded ? "/today" : "/onboarding");
  }, [loading, user, profile, router]);

  return (
    <main className="min-h-dvh grid md:grid-cols-[1fr_1fr]">
      <section className="px-6 pt-10 pb-8 md:px-16 md:py-16 flex flex-col">
        <div className="font-display text-[22px] font-semibold tracking-[-0.03em] flex items-center gap-2">
          <VeroMark size={22} /> VERVE
        </div>
        <div className="mt-16 md:mt-auto">
          <p className="label">Daily communication training</p>
          <h1 className="font-display font-medium text-[44px] md:text-[80px] leading-[0.98] tracking-[-0.04em] mt-4">
            Fifteen minutes.
            <br />
            One fix
            <br />
            at a time.
          </h1>
          <p className="mt-6 text-[17px] text-ink-2 max-w-[38ch]">Spin a topic. Talk. Vero watches the tape and tells you the one thing to fix. Tomorrow, you fix it.</p>
        </div>
        <div className="mt-10 md:mt-16 space-y-3 max-w-[420px]">
          <a href="/api/auth/google?next=/today" className="btn-accent btn-block">
            Continue with Google
          </a>
          <p className="text-[12px] text-ink-3">Recordings stay in your own Google Drive. Nothing is stored on our servers.</p>
          {error && <p className="text-[13px] text-accent">{ERRORS[error] ?? "Something went wrong. Try again."}</p>}
        </div>
      </section>
      <section className="hidden md:flex bg-ink text-paper flex-col justify-between p-16">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="metric text-[64px]">1</div>
            <div className="label text-paper/60 mt-2">Filler per minute is elite</div>
          </div>
          <div>
            <div className="metric text-[64px]">140</div>
            <div className="label text-paper/60 mt-2">Words per minute, the zone</div>
          </div>
          <div>
            <div className="metric text-[64px]">2s</div>
            <div className="label text-paper/60 mt-2">Pause that reads as authority</div>
          </div>
        </div>
        <ol className="space-y-5">
          {["Warm the voice. Two minutes.", "Spin a topic. Talk on camera.", "Vero picks your one fix.", "See the number drop tomorrow."].map((s, i) => (
            <li key={s} className="flex items-baseline gap-5 border-t border-paper/20 pt-4">
              <span className="num text-[12px] text-paper/50">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[26px] leading-tight">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}
