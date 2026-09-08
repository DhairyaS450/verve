"use client";

import clsx from "clsx";
import type { RoleplayCase } from "@/content/cases";
import { CATEGORY_LABELS } from "@/content/cases";
import { DECA_STRUCTURE, FBLA_STRUCTURE, PREP_PROMPTS, bandNamesFor, bandOf, rubricFor, type RoleplayFormat } from "@/content/roleplay";
import type { RubricResult } from "@/lib/types";
import { mmss } from "@/lib/format";

/** The case as the competitor reads it: role, judge, situation, ask, indicators. */
export function CaseBrief({ c, format, compact, className }: { c: RoleplayCase; format?: RoleplayFormat; compact?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label">
          {c.org} · {c.event}
          {c.area ? ` · ${c.area}` : ""}
        </span>
        <span className="label text-ink-3">{[CATEGORY_LABELS[c.category], c.year].filter(Boolean).join(" · ")}</span>
      </div>
      <h2 className="font-display font-medium text-[26px] md:text-[36px] leading-[1.05] tracking-[-0.03em] mt-2">{c.title}</h2>
      {format && <p className="mt-2 text-[13px] text-ink-2">{format.note}</p>}

      <dl className="mt-5 grid md:grid-cols-2 gap-x-8 gap-y-3">
        <div className="border-t border-line pt-2">
          <dt className="label">You</dt>
          <dd className="text-[15px] mt-1">{c.role}</dd>
        </div>
        <div className="border-t border-line pt-2">
          <dt className="label">Judge</dt>
          <dd className="text-[15px] mt-1">{c.judgeRole}</dd>
        </div>
      </dl>

      {!compact && (
        <div className="mt-5 border-t border-line pt-3">
          <p className="label">Situation</p>
          <p className="mt-2 text-[16px] leading-[1.6] whitespace-pre-line">{c.situation}</p>
          <p className="mt-3 text-[15px] font-medium border-l-2 border-accent pl-3">{c.ask}</p>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-3">
        <p className="label">Performance indicators</p>
        <ol className="mt-2 space-y-1.5">
          {c.pis.map((p, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="num text-[11px] text-ink-3 mt-[5px]">{String(i + 1).padStart(2, "0")}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </div>

      {!compact && (
        <p className="mt-4 text-[11px] text-ink-3">
          Condensed from the official sample.{" "}
          <a href={c.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {c.source.label}
          </a>
        </p>
      )}
    </div>
  );
}

/** Structure template + notes. DECA allows notes made in prep; FBLA gives two notecards. */
export function PrepPad({ org, value, onChange, className }: { org: "DECA" | "FBLA"; value: string; onChange: (v: string) => void; className?: string }) {
  const structure = org === "FBLA" ? FBLA_STRUCTURE : DECA_STRUCTURE;
  return (
    <div className={className}>
      <p className="label">Run of show</p>
      <ol className="mt-2 space-y-1">
        {structure.map((s, i) => (
          <li key={i} className="flex gap-3 text-[13.5px] text-ink-2">
            <span className="num text-[11px] text-ink-3 mt-[3px]">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <label className="label-ink block mt-6" htmlFor="prep-notes">
        Your notes
      </label>
      <textarea
        id="prep-notes"
        className="field mt-1 min-h-[180px]"
        placeholder={PREP_PROMPTS.join("\n")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <p className="mt-1 text-[11px] text-ink-3">{org === "FBLA" ? "Two notecards, both sides." : "One sheet of notes, made now. No props."}</p>
    </div>
  );
}

/** Tap an indicator as you cover it. Keeps you honest on the clock. */
export function PiChecklist({ pis, checked, onToggle, className }: { pis: string[]; checked: number[]; onToggle: (i: number) => void; className?: string }) {
  return (
    <ol className={clsx("flex flex-wrap gap-1.5", className)}>
      {pis.map((p, i) => {
        const on = checked.includes(i + 1);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onToggle(i + 1)}
              aria-pressed={on}
              title={p}
              className={clsx("min-h-[36px] px-2.5 text-[12px] border flex items-center gap-2 max-w-[260px]", on ? "bg-ink text-paper border-ink" : "border-line text-ink-2 hover:border-ink")}
            >
              <span className="num font-display">{i + 1}</span>
              <span className="truncate">{p.length > 34 ? p.slice(0, 33) + "…" : p}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** A judge question, live. */
export function JudgeQuestion({
  q,
  index,
  total,
  isPractice,
  onNext,
  nextLabel,
  className,
}: {
  q: string;
  index: number;
  total: number;
  isPractice?: boolean;
  onNext: () => void;
  nextLabel: string;
  className?: string;
}) {
  return (
    <div className={clsx("border-l-2 border-accent pl-3", className)}>
      <div className="flex items-baseline justify-between">
        <span className="label text-accent">Judge asks</span>
        <span className="num text-[12px] text-ink-3">
          {index + 1} / {total}
          {isPractice ? " · practice probe" : ""}
        </span>
      </div>
      <p className="font-display text-[20px] md:text-[26px] leading-tight tracking-[-0.02em] mt-1">{q}</p>
      <button type="button" className="btn-ghost btn-sm mt-3" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

const GROUP_LABELS: Record<string, string> = { pi: "Performance indicators", solution: "Solution", skill: "Career competencies", delivery: "Delivery", overall: "Overall" };

/** The judge's score sheet, Swiss-tabled. */
export function RubricView({ rubric, className }: { rubric: RubricResult; className?: string }) {
  const spec = rubricFor(rubric.category, rubric.items.filter((i) => i.id.startsWith("pi")).map((i) => i.label));
  const specById = new Map(spec.map((s) => [s.id, s]));
  const names = bandNamesFor(rubric.category);
  const pct = rubric.max ? rubric.total / rubric.max : 0;
  const overallBand = pct >= 0.85 ? names[3] : pct >= 0.7 ? names[2] : pct >= 0.5 ? names[1] : names[0];
  const groups = ["pi", "solution", "skill", "delivery", "overall"].filter((g) => rubric.items.some((i) => (specById.get(i.id)?.group ?? "pi") === g));
  const groupLabel = (g: string) => (g === "skill" && (rubric.category === "series" || rubric.category === "pfl") ? "21st Century Skills" : GROUP_LABELS[g]);
  return (
    <section className={className}>
      <div className="flex items-end justify-between gap-4 hairline-strong pt-5">
        <div>
          <p className="label">Judge&apos;s score</p>
          <p className="metric text-[64px] md:text-[88px] mt-1">
            {rubric.total}
            <span className="text-[22px] text-ink-3 ml-1">/ {rubric.max}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="label">{rubric.org}</p>
          <p className={clsx("font-display text-[18px] leading-tight mt-1", pct >= 0.85 ? "text-good" : pct < 0.5 ? "text-accent" : "text-ink")}>{overallBand}</p>
        </div>
      </div>
      {rubric.missed.length > 0 && (
        <div className="mt-4 border border-accent p-3">
          <p className="label text-accent">Never addressed</p>
          <ul className="mt-1 space-y-1">
            {rubric.missed.map((m) => (
              <li key={m} className="text-[14px]">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
      {groups.map((g) => (
        <div key={g} className="mt-5">
          <p className="label">{groupLabel(g)}</p>
          <ol className="mt-2 divide-y divide-line border-t border-line">
            {rubric.items
              .filter((i) => (specById.get(i.id)?.group ?? "pi") === g)
              .map((i) => {
                const s = specById.get(i.id);
                const band = s ? bandOf(s, i.points) : 3;
                return (
                  <li key={i.id} className="py-2.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 items-start">
                    <span className="text-[14px] leading-snug">{i.label}</span>
                    <span className={clsx("num font-display text-[18px] text-right whitespace-nowrap", band === 3 ? "text-good" : band === 0 ? "text-accent" : "text-ink")}>
                      {i.points}
                      <span className="text-[12px] text-ink-3"> / {i.max}</span>
                    </span>
                    <span className="col-span-2 h-[4px] bg-paper-3">
                      <span className={clsx("block h-full", band === 3 ? "bg-good" : band === 0 ? "bg-accent" : "bg-ink")} style={{ width: `${(i.points / i.max) * 100}%` }} />
                    </span>
                    {i.note && <span className="col-span-2 text-[12px] text-ink-2">{i.note}</span>}
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </section>
  );
}

export function clockLabel(seconds: number) {
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : mmss(seconds);
}
