import Link from "next/link";
import clsx from "clsx";
import type { Scores, SessionDoc } from "@/lib/types";
import { SKILL_MAP } from "@/content/skills";
import { TAG_MAP } from "@/content/observations";
import { VeroLine } from "./VeroMark";
import { Metric, ScoreBars, fillerHint, paceHint } from "./Metrics";
import { fmt0, fmt1 } from "@/lib/format";
import { observationsFor, patternCountForSkill } from "@/lib/coach";
import { RubricView } from "./Roleplay";

/**
 * The verdict. One fix, one win, three numbers, six bars. Nothing else.
 * Patterns are labelled as patterns; one-offs are labelled as one-offs.
 */
export function FeedbackView({
  session,
  previous,
  previousSessions,
  average,
  xpEarned,
  streak,
  nextDrillName,
  showTapeLink,
  hideLine,
  className,
}: {
  session: SessionDoc;
  previous?: SessionDoc | null;
  /** Earlier sessions (newest first), for pattern evidence */
  previousSessions?: SessionDoc[];
  /** Rolling average of the last few sessions, drawn as a marker on each bar */
  average?: Scores | null;
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
  const coach = session.coach;
  const nextSkill = SKILL_MAP[coach?.skillId ?? ai.nextFocusSkillId];
  const dFill = prev ? Math.round((ai.fillers.perMin - prev.fillers.perMin) * 10) / 10 : null;
  const dWpm = prev ? ai.wpm - prev.wpm : null;
  const dOverall = prev ? Math.round((ai.scores.overall - prev.scores.overall) * 10) / 10 : null;
  const pattern = previousSessions ? patternCountForSkill(ai.topFix.skillId, previousSessions) : null;
  const obs = observationsFor(session);
  const habits = obs.filter((o) => !o.incident);
  const incidents = obs.filter((o) => o.incident);

  return (
    <div className={clsx("space-y-10", className)}>
      {!hideLine && <VeroLine className="rise">{ai.oneLiner}</VeroLine>}

      {/* Judge's sheet for role-plays; otherwise the three numbers */}
      {ai.rubric ? (
        <>
          <RubricView rubric={ai.rubric} className="rise-1" />
          <div className="grid grid-cols-3 gap-3 md:gap-4 hairline pt-5 min-w-0">
            <Metric label="Fillers / min" value={fmt1(ai.fillers.perMin)} delta={dFill} lowerIsBetter size="md" />
            <Metric label="Pace" value={fmt0(ai.wpm)} unit="wpm" delta={dWpm} size="md" />
            <Metric label="Length" value={session.recording ? `${Math.floor(session.recording.durationSec / 60)}:${String(Math.round(session.recording.durationSec % 60)).padStart(2, "0")}` : "–"} size="md" />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-3 md:gap-4 hairline-strong pt-5 rise-1 min-w-0">
          <Metric label="Fillers / min" value={fmt1(ai.fillers.perMin)} delta={dFill} lowerIsBetter hint={fillerHint(ai.fillers.perMin)} />
          <Metric label="Pace" value={fmt0(ai.wpm)} unit="wpm" delta={dWpm} hint={paceHint(ai.wpm)} />
          <Metric label="Overall" value={fmt1(ai.scores.overall)} unit="/ 10" delta={dOverall} />
        </div>
      )}

      {/* The one fix */}
      <section className="rise-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label">Biggest fix</span>
          {fixSkill && <span className="text-[11px] uppercase tracking-[0.1em] text-accent font-semibold text-right">{fixSkill.name}</span>}
        </div>
        <h2 className="font-display text-[30px] md:text-[44px] font-medium leading-[1.02] tracking-[-0.03em] mt-2">{ai.topFix.title}</h2>
        {pattern && pattern.of > 0 && (
          <p className={clsx("mt-2 text-[12px] font-semibold tracking-[0.08em] uppercase", pattern.count > 0 ? "text-ink-2" : "text-ink-3")}>
            {pattern.count > 0 ? `Pattern · also in ${pattern.count} of your last ${pattern.of}` : "New this session"}
          </p>
        )}
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

      {/* Everything else Vero saw, compact */}
      {(habits.length > 0 || incidents.length > 0) && (
        <section>
          <span className="label">Also noticed</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {habits.map((o) => (
              <li key={o.tag} className="text-[13px] border border-ink px-2 py-1 flex items-center gap-2" title={o.note}>
                {TAG_MAP[o.tag]?.label ?? o.tag}
                <span className="flex gap-[2px]" aria-label={`severity ${o.severity}`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={clsx("w-[4px] h-[4px]", n <= o.severity ? "bg-ink" : "bg-paper-3")} />
                  ))}
                </span>
              </li>
            ))}
            {incidents.map((o) => (
              <li key={o.tag} className="text-[13px] border border-line text-ink-3 px-2 py-1" title={o.note}>
                One-off · {TAG_MAP[o.tag]?.label ?? o.tag}
              </li>
            ))}
          </ul>
        </section>
      )}

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
          {average ? (
            <span className="text-[11px] text-ink-3 flex items-center gap-1.5">
              <span className="inline-block w-[6px] h-[12px] border border-ink bg-paper" /> your average
            </span>
          ) : null}
        </div>
        <ScoreBars scores={ai.scores} previous={prev?.scores ?? null} average={average ?? null} />
      </section>

      {/* Footer: xp, streak, next */}
      <section className="hairline-strong pt-5 grid grid-cols-3 gap-3 md:gap-4 min-w-0">
        {xpEarned !== undefined && <Metric label="XP" value={`+${xpEarned}`} />}
        {streak !== undefined && <Metric label="Streak" value={String(streak)} unit={streak === 1 ? "day" : "days"} />}
        <div className={clsx("min-w-0", xpEarned === undefined && streak === undefined ? "col-span-3" : "col-span-1")}>
          <div className="label">Next focus</div>
          <div className="font-display text-[18px] leading-tight mt-2">{nextSkill?.name ?? "—"}</div>
          {coach?.reason && <div className="text-[12px] text-ink-2 mt-1">{coach.reason}</div>}
          {!coach?.reason && nextDrillName && <div className="text-[12px] text-ink-3 mt-1 truncate">{nextDrillName}</div>}
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
