"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { updateProfile } from "@/lib/db";
import type { Goal } from "@/lib/types";
import { VeroLine } from "@/components/VeroMark";
import { firstName } from "@/lib/format";

const GOALS: { id: Goal; title: string; blurb: string }[] = [
  { id: "spot", title: "Think on the spot", blurb: "Any topic, zero prep, no rambling." },
  { id: "story", title: "Tell better stories", blurb: "Keep a room hanging on every word." },
  { id: "stage", title: "Speak on stage", blurb: "From a toast to a keynote." },
  { id: "confidence", title: "Sound confident", blurb: "A voice people lean in to hear." },
];

export default function Onboarding() {
  const { profile } = useAuth();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [minutes, setMinutes] = useState<5 | 10 | 15>(10);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!profile || !goal) return;
    setBusy(true);
    await updateProfile(profile.uid, { goal, sessionMinutes: minutes, focusSkillId: undefined });
    router.push("/practice?kind=baseline");
  };

  return (
    <div className="max-w-[640px] pb-16">
      <p className="label">Welcome{profile ? `, ${firstName(profile.displayName)}` : ""}</p>
      <h1 className="font-display font-medium text-[38px] md:text-[56px] leading-[1] tracking-[-0.035em] mt-3">What do you want most?</h1>

      <ol className="mt-8 border-t border-line">
        {GOALS.map((g, i) => (
          <li key={g.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => setGoal(g.id)}
              aria-pressed={goal === g.id}
              className={clsx("w-full text-left grid grid-cols-[36px_1fr_24px] items-center gap-3 py-4 min-h-[64px] -mx-2 px-2 transition-colors", goal === g.id ? "bg-paper-2" : "hover:bg-paper-2")}
            >
              <span className="num text-[12px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-display text-[20px] leading-tight">{g.title}</span>
                <span className="block text-[13px] text-ink-2 mt-0.5">{g.blurb}</span>
              </span>
              <span className={clsx("w-[18px] h-[18px] border border-ink justify-self-end", goal === g.id && "bg-ink")} />
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <p className="label">Daily session</p>
        <div className="mt-3 grid grid-cols-3 border border-ink">
          {([5, 10, 15] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m} className={clsx("min-h-[52px] font-display text-[18px] num border-r border-ink last:border-r-0", minutes === m ? "bg-ink text-paper" : "bg-transparent")}>
              {m} min
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-ink-3">
          <span>Short warmup, one quick drill.</span>
          <span>Warmup, one or two drills.</span>
          <span>Warmup, three drills, three focuses.</span>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <VeroLine muted>First, a 60-second baseline. Just talk. I need to see where you are.</VeroLine>
        <button type="button" className="btn-accent btn-block" disabled={!goal || busy} onClick={start}>
          {busy ? "Starting" : "Record baseline"}
        </button>
      </div>
    </div>
  );
}
