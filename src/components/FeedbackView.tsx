import Link from "next/link";
import clsx from "clsx";
import type { SessionDoc } from "@/lib/types";
import { SKILL_MAP } from "@/content/skills";
import { VeroLine } from "./VeroMark";
import { Metric, ScoreBars, fillerHint, paceHint } from "./Metrics";
import { fmt0, fmt1 } from "@/lib/format";

/**
 * The verdict. One fix, one win, three numbers, six bars. Nothing else.
 */
export function FeedbackView({
  session,
  previous,
  xpEarned,
  streak,
  nextDrillName,
  showTapeLink,
  hideLine,
  className,
}: {
  session: SessionDoc;
  previous?: SessionDoc | null;
  xpEarned?: number;
  streak?: number;
  nextDrillName?: string;
  showTapeLink?: boolean;
  hideLine?: boolean;
  className?: string;
}) {
  const ai = session.ai;
  if (!ai) return null;
  const prev = previous?.ai;
  const fixSkill = SKILL_MAP[ai.topFix.skillId];
  const nextSkill = SKILL_MAP[ai.nextFocusSkillId];
  const dFill = prev ? Math.round((ai.fillers.perMin - prev.fillers.perMin) * 10) / 10 : null;
  const dWpm = prev ? ai.wpm - prev.wpm : null;
  const dVar = prev ? Math.round((ai.scores.vocalVariety - prev.scores.vocalVariety) * 10) / 10 : null;
  const dOverall = prev ? Math.round((ai.scores.overall - prev.scores.overall) * 10) / 10 : null;

  return (
    <div className={clsx("space-y-10", className)}>
      {!hideLine && <VeroLine className="rise">{ai.oneLiner}</VeroLine>}

      {/* Three numbers */}
      <div className="grid grid-cols-3 gap-4 hairline-strong pt-5 rise-1">
        <Metric label="Fillers / min" value={fmt1(ai.fillers.perMin)} delta={dFill} lowerIsBetter hint={fillerHint(ai.fillers.perMin)} />
        <Metric label="Pace" value={fmt0(ai.wpm)} unit="wpm" delta={dWpm} hint={paceHint(ai.wpm)} />
        <Metric label="Overall" value={fmt1(ai.scores.overall)} unit="/ 10" delta={dOverall} />
      </div>

      {/* The one fix */}
      <section className="rise-2">
        <div className="flex items-baseline justify-between">
          <span className="label">Biggest fix</span>
          {fixSkill && <span className="text-[11px] uppercase tracking-[0.1em] text-accent font-semibold">{fixSkill.name}</span>}
        </div>
        <h2 className="font-display text-[30px] md:text-[44px] font-medium leading-[1.02] tracking-[-0.03em] mt-2">{ai.topFix.title}</h2>
        <dl className="mt-4 grid md:grid-cols-2 gap-x-8 gap-y-3">
          <div className="border-t border-line pt-2">
            <dt className="label">Why</dt>
            <dd className="text-[15px] mt-1">{ai.topFix.why}</dd>
          </div>
          <div className="border-t border-line pt-2">
            <dt className="label">Next time</dt>
            <dd className="text-[15px] mt-1">{ai.topFix.how}</dd>
          </div>
        </dl>
      </section>

      {/* The win */}
      <section className="rise-3">
        <span className="label">What worked</span>
        <h3 className="font-display text-[22px] md:text-[28px] font-medium leading-tight tracking-[-0.02em] mt-2 text-good">{ai.win.title}</h3>
        <p className="text-[15px] text-ink-2 mt-1">{ai.win.detail}</p>
      </section>

      {ai.framework && !ai.framework.followed && ai.framework.missing.length > 0 && (
        <section>
          <span className="label">Framework gaps</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ai.framework.missing.map((m) => (
              <li key={m} className="text-[13px] border border-ink px-2 py-1">
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Scores */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <span className="label">Scores</span>
          {dVar !== null && (
            <span className={clsx("num text-[12px]", dVar >= 0 ? "text-good" : "text-accent")}>
              Variety {dVar >= 0 ? "+" : "−"}
              {fmt1(Math.abs(dVar))}
            </span>
          )}
        </div>
        <ScoreBars scores={ai.scores} previous={prev?.scores ?? null} />
      </section>

      {/* Footer: xp, streak, next */}
      <section className="hairline-strong pt-5 grid grid-cols-3 gap-4">
        {xpEarned !== undefined && <Metric label="XP" value={`+${xpEarned}`} />}
        {streak !== undefined && <Metric label="Streak" value={String(streak)} unit={streak === 1 ? "day" : "days"} />}
        <div className="min-w-0 col-span-1">
          <div className="label">Next focus</div>
          <div className="font-display text-[18px] leading-tight mt-2">{nextSkill?.name ?? "—"}</div>
          {nextDrillName && <div className="text-[12px] text-ink-3 mt-1 truncate">{nextDrillName}</div>}
        </div>
      </section>

      {showTapeLink && (
        <Link href={`/session/${session.id}`} className="btn-ghost btn-block">
          Watch the tape
        </Link>
      )}
    </div>
  );
}
