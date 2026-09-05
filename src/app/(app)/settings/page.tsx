"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { updateProfile } from "@/lib/db";
import type { Goal } from "@/lib/types";
import { userLevel } from "@/lib/xp";

const GOALS: { id: Goal; label: string }[] = [
  { id: "spot", label: "Think on the spot" },
  { id: "story", label: "Tell better stories" },
  { id: "stage", label: "Speak on stage" },
  { id: "confidence", label: "Sound confident" },
];

export default function SettingsPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  if (!profile) return null;
  const lvl = userLevel(profile.xp ?? 0);

  return (
    <div className="max-w-[560px] pb-16">
      <p className="label">Settings</p>
      <h1 className="font-display font-medium text-[36px] md:text-[48px] leading-[1] tracking-[-0.03em] mt-3">{profile.displayName}</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {profile.email} · Level {lvl.level} {lvl.name} · {profile.xp} xp
      </p>

      <section className="mt-10">
        <p className="label">Daily session</p>
        <div className="mt-3 grid grid-cols-3 border border-ink">
          {([5, 10, 15] as const).map((m) => (
            <button key={m} type="button" onClick={() => updateProfile(profile.uid, { sessionMinutes: m })} aria-pressed={profile.sessionMinutes === m} className={clsx("min-h-[52px] font-display text-[18px] num border-r border-ink last:border-r-0", profile.sessionMinutes === m ? "bg-ink text-paper" : "")}>
              {m} min
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <p className="label">Goal</p>
        <ol className="mt-2 border-t border-line">
          {GOALS.map((g) => (
            <li key={g.id} className="border-b border-line">
              <button type="button" onClick={() => updateProfile(profile.uid, { goal: g.id })} aria-pressed={profile.goal === g.id} className="w-full flex items-center justify-between py-3.5 min-h-[52px] text-left">
                <span className="font-display text-[17px]">{g.label}</span>
                <span className={clsx("w-[16px] h-[16px] border border-ink", profile.goal === g.id && "bg-ink")} />
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <p className="label">Google Drive</p>
        <p className="mt-2 text-[14px]">{profile.driveConnected ? `Connected · ${profile.driveEmail || profile.email}` : "Not connected"}</p>
        <p className="text-[12px] text-ink-3 mt-1">Recordings live in a folder called Verve in your Drive. Verve can only see files it created.</p>
        <a href="/api/auth/google?next=/settings" className="btn-ghost mt-4">
          {profile.driveConnected ? "Reconnect" : "Connect Drive"}
        </a>
      </section>

      <section className="mt-12 hairline-strong pt-6 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await signOut();
            router.replace("/welcome");
          }}
        >
          Sign out
        </button>
        <span className="text-[11px] text-ink-3">Verve · Vero is a raven.</span>
      </section>
    </div>
  );
}
