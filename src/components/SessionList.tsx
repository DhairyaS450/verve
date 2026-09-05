import Link from "next/link";
import clsx from "clsx";
import type { SessionDoc } from "@/lib/types";
import { fmt1, relativeDay } from "@/lib/format";

/** History as a hairline timeline, not cards. */
export function SessionList({ sessions, className, limit }: { sessions: SessionDoc[]; className?: string; limit?: number }) {
  const list = limit ? sessions.slice(0, limit) : sessions;
  if (!list.length) return <p className={clsx("text-[14px] text-ink-3", className)}>No sessions yet.</p>;
  return (
    <ol className={clsx("divide-y divide-line border-t border-line", className)}>
      {list.map((s) => {
        const analyzed = s.status === "analyzed" && s.ai;
        return (
          <li key={s.id}>
            <Link href={`/session/${s.id}`} className="grid grid-cols-[72px_1fr_auto] md:grid-cols-[110px_1fr_140px_auto] items-center gap-3 py-3.5 min-h-[56px] hover:bg-paper-2 -mx-2 px-2">
              <span className="text-[12px] text-ink-2 num">{relativeDay(s.date)}</span>
              <span className="min-w-0">
                <span className="block font-display text-[15px] truncate">{s.drillName}</span>
                <span className="block text-[12px] text-ink-3 truncate">{analyzed ? s.ai?.topFix.title : s.status === "failed" ? "Analysis failed" : s.status}</span>
              </span>
              <span className="hidden md:block text-[12px] text-ink-2 num">{analyzed ? `${fmt1(s.ai?.fillers.perMin)} fillers/min` : ""}</span>
              <span className={clsx("metric text-[26px] w-[48px] text-right", analyzed ? "text-ink" : "text-ink-3")}>{analyzed ? fmt1(s.ai?.scores.overall) : "–"}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
