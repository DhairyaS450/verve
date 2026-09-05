"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { liveStreak } from "@/lib/xp";
import { localDateStr } from "@/lib/format";
import { VeroMark } from "./VeroMark";
import { Flame } from "./Flame";

const TITLES: [string, string][] = [
  ["/today", "Today"],
  ["/skills", "Skills"],
  ["/progress", "Progress"],
  ["/settings", "Settings"],
  ["/session", "Session"],
  ["/onboarding", "Welcome"],
];

/** App header: wordmark (mobile) or page title (desktop), streak flame, settings. */
export function AppHeader() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Verve";
  const streak = profile ? liveStreak(profile.streak, localDateStr()) : 0;
  const state = streak <= 0 ? "cold" : streak >= 7 ? "hot" : "lit";

  return (
    <header className="flex items-center justify-between h-[60px] md:h-[72px] border-b border-line mb-6 md:mb-8">
      <Link href="/today" className="md:hidden font-display text-[20px] font-semibold tracking-[-0.03em] flex items-center gap-2 min-h-[44px]">
        <VeroMark size={22} /> VERVE
      </Link>
      <h1 className="hidden md:block font-display text-[24px] font-medium tracking-[-0.02em]">{title}</h1>
      <div className="flex items-center gap-1">
        <Link href="/progress" className="flex items-center gap-1.5 min-h-[44px] px-2" aria-label={`${streak} day streak`} title={`${streak} day streak`}>
          <Flame size={24} state={state} />
          <span className="num font-display text-[21px] leading-none font-medium">{streak}</span>
        </Link>
        <Link href="/settings" aria-label="Settings" className="w-[44px] h-[44px] flex items-center justify-center text-ink-2 hover:text-ink -mr-3">
          <Settings size={21} strokeWidth={1.75} />
        </Link>
      </div>
    </header>
  );
}
