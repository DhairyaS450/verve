"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import clsx from "clsx";
import { Activity, GitBranch, Play, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { VeroMark } from "./VeroMark";
import { liveStreak, userLevel } from "@/lib/xp";
import { localDateStr } from "@/lib/format";

const NAV = [
  { href: "/today", label: "Today", icon: Play },
  { href: "/skills", label: "Skills", icon: GitBranch },
  { href: "/progress", label: "Progress", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const focusMode = pathname.startsWith("/practice");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/welcome");
      return;
    }
    if (profile && !profile.onboarded && !pathname.startsWith("/onboarding") && !pathname.startsWith("/practice") && !pathname.startsWith("/settings")) {
      router.replace("/onboarding");
    }
  }, [loading, user, profile, pathname, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-3">
          <VeroMark size={22} className="blink" />
          <span className="label">Loading</span>
        </div>
      </div>
    );
  }

  const streak = liveStreak(profile.streak, localDateStr());
  const lvl = userLevel(profile.xp ?? 0);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      {/* Desktop rail */}
      {!focusMode && (
        <aside className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-dvh border-r border-line px-6 py-8">
          <Link href="/today" className="font-display text-[22px] font-semibold tracking-[-0.03em] flex items-center gap-2">
            <VeroMark size={22} /> VERVE
          </Link>
          <nav className="mt-12 flex flex-col gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={clsx(
                    "flex items-center gap-3 py-2.5 text-[15px] border-l-2 pl-4 -ml-[2px] transition-colors",
                    active ? "border-ink text-ink font-medium" : "border-transparent text-ink-2 hover:text-ink",
                  )}
                >
                  <n.icon size={16} strokeWidth={1.75} /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-4">
            <div className="hairline pt-4">
              <div className="label">Streak</div>
              <div className="metric text-[40px] mt-1">{streak}</div>
            </div>
            <div>
              <div className="label">Level {lvl.level}</div>
              <div className="font-display text-[18px] mt-1">{lvl.name}</div>
              <div className="h-[3px] bg-paper-3 mt-2">
                <div className="h-full bg-ink" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
              </div>
            </div>
            <Link href="/settings" className="flex items-center gap-2 text-[13px] text-ink-2 hover:text-ink">
              <Settings size={14} strokeWidth={1.75} /> Settings
            </Link>
          </div>
        </aside>
      )}

      <div className={clsx("min-h-dvh flex flex-col", !focusMode && "pb-[76px] md:pb-0")}>
        <main className="flex-1 w-full mx-auto max-w-[1080px] px-5 md:px-12 pt-5 md:pt-10 safe-t">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {!focusMode && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-paper border-t border-line safe-b z-40">
          <div className="grid grid-cols-3 h-[60px]">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx("flex flex-col items-center justify-center gap-1 min-h-[44px]", active ? "text-ink" : "text-ink-3")}
                >
                  <n.icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
