"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { listSessions } from "@/lib/db";
import type { SessionDoc } from "@/lib/types";
import { CASES, CATEGORY_LABELS, listEvents, parseCaseText, saveCustomCase, type RoleplayCase } from "@/content/cases";
import { FORMATS, ROLEPLAY_TIPS, type RoleplayOrg } from "@/content/roleplay";
import { VeroLine } from "@/components/VeroMark";
import { Vero } from "@/components/Vero";
import { Metric } from "@/components/Metrics";
import { clockLabel } from "@/components/Roleplay";

export default function RoleplayPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [org, setOrg] = useState<RoleplayOrg>("DECA");
  const [event, setEvent] = useState<string>("");
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [pasted, setPasted] = useState("");
  const [draft, setDraft] = useState<Partial<RoleplayCase> | null>(null);

  useEffect(() => {
    if (!profile) return;
    listSessions(profile.uid, 120).then((ss) => setSessions(ss.filter((s) => s.ai?.rubric)));
  }, [profile]);

  const events = useMemo(() => listEvents(org), [org]);
  const cases = useMemo(() => CASES.filter((c) => c.org === org && (!event || c.event === event)), [org, event]);
  const scores = sessions.map((s) => s.ai!.rubric!.total);
  const best = scores.length ? Math.max(...scores) : null;
  const last = sessions[0]?.ai?.rubric;

  const go = (drill: string, caseId?: string) => {
    const p = new URLSearchParams({ kind: "free", drill });
    if (caseId) p.set("case", caseId);
    else {
      p.set("org", org);
      if (event) p.set("event", event);
    }
    router.push(`/practice?${p.toString()}`);
  };

  const fullDrill = org === "FBLA" ? "m-rp-fbla" : "m-rp-deca";
  const quickDrill = org === "FBLA" ? "m-rp-fbla-quick" : "m-rp-quick";

  const parse = () => {
    const d = parseCaseText(pasted);
    setDraft({
      org: d.org ?? org,
      category: d.category ?? (org === "FBLA" ? "fbla-team" : "series"),
      event: d.event ?? "Your event",
      title: d.role ? `${d.role.split(" for ")[1]?.split(",")[0] ?? "Your case"}` : "Your case",
      role: d.role ?? "",
      judgeRole: d.judgeRole ?? "",
      situation: d.situation ?? pasted.slice(0, 2000),
      ask: "",
      pis: d.pis ?? [],
      questions: d.questions ?? [],
    });
  };

  const practiceDraft = (drill: string) => {
    if (!draft) return;
    const c: RoleplayCase = {
      id: "custom",
      org: draft.org ?? org,
      category: draft.category ?? "series",
      event: draft.event ?? "Your event",
      title: draft.title ?? "Your case",
      role: draft.role ?? "",
      judgeRole: draft.judgeRole ?? "the judge",
      situation: draft.situation ?? "",
      ask: draft.ask ?? "",
      pis: (draft.pis ?? []).filter(Boolean),
      questions: (draft.questions ?? []).filter(Boolean),
      source: { label: "Your pasted case", url: "" },
      custom: true,
    };
    saveCustomCase(c);
    router.push(`/practice?kind=free&drill=${drill}&case=custom`);
  };

  return (
    <div className="pb-16">
      <p className="label">Roleplay prep</p>
      <div className="md:grid md:grid-cols-[1fr_260px] md:gap-12 md:items-start">
        <div>
          <h1 className="font-display font-medium text-[38px] md:text-[60px] leading-[0.98] tracking-[-0.035em] mt-3">
            DECA and FBLA cases, judged like the real thing.
          </h1>
          <VeroLine className="mt-5" muted>
            {ROLEPLAY_TIPS[0]}
          </VeroLine>
        </div>
        <div className="mt-8 md:mt-0 grid grid-cols-3 md:grid-cols-1 gap-4">
          <Metric label="Judged runs" value={String(sessions.length)} />
          <Metric label="Best score" value={best === null ? "–" : String(best)} unit={best === null ? undefined : "/ 100"} />
          <Metric label="Last" value={last ? String(last.total) : "–"} unit={last ? "/ 100" : undefined} />
        </div>
      </div>

      {/* Org + event */}
      <section className="mt-10 hairline-strong pt-5">
        <div className="grid grid-cols-2 border border-ink max-w-[320px]">
          {(["DECA", "FBLA"] as RoleplayOrg[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                setOrg(o);
                setEvent("");
              }}
              aria-pressed={org === o}
              className={clsx("min-h-[48px] font-display text-[16px] border-r border-ink last:border-r-0", org === o ? "bg-ink text-paper" : "")}
            >
              {o}
            </button>
          ))}
        </div>
        <label className="label-ink block mt-6" htmlFor="event">
          Event
        </label>
        <select id="event" className="field mt-1 max-w-[560px] bg-transparent" value={event} onChange={(e) => setEvent(e.target.value)}>
          <option value="">Any {org} event ({cases.length} cases)</option>
          {events.map((e) => (
            <option key={e.event} value={e.event}>
              {e.event} · {CATEGORY_LABELS[e.category]} · {e.count}
            </option>
          ))}
        </select>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-[760px]">
          <button type="button" className="btn-accent min-h-[60px] flex-col gap-0" onClick={() => go(fullDrill)}>
            <span>Full simulation</span>
            <span className="text-[10px] tracking-[0.08em] opacity-80">{clockLabel(FORMATS[org === "FBLA" ? "fbla-team" : "deca-series"].prepSeconds)} prep · {clockLabel(FORMATS[org === "FBLA" ? "fbla-team" : "deca-series"].presentSeconds)} talk</span>
          </button>
          <button type="button" className="btn min-h-[60px] flex-col gap-0" onClick={() => go(quickDrill)}>
            <span>Quick case</span>
            <span className="text-[10px] tracking-[0.08em] opacity-80">{org === "FBLA" ? "6 prep · 4 talk" : "5 prep · 4 talk"}</span>
          </button>
          <button type="button" className="btn-ghost min-h-[60px] flex-col gap-0" onClick={() => go("m-rp-qa")}>
            <span>Judge questions</span>
            <span className="text-[10px] tracking-[0.08em] text-ink-3">3 questions · 5 min</span>
          </button>
          <button type="button" className="btn-ghost min-h-[60px] flex-col gap-0" onClick={() => go("m-rp-pi-lightning")}>
            <span>Indicator lightning</span>
            <span className="text-[10px] tracking-[0.08em] text-ink-3">5 indicators · 4 min</span>
          </button>
        </div>
        {org === "DECA" && (
          <button type="button" className="mt-3 label-ink min-h-[44px] flex items-center gap-2" onClick={() => go("m-rp-deca-team")}>
            Team decision making, solo run <span className="text-ink-3">· 30 prep · 15 talk</span>
          </button>
        )}
      </section>

      {/* Case list */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between hairline-strong pt-3">
          <h2 className="font-display text-[22px] font-medium">Cases</h2>
          <span className="label">{cases.length} official samples</span>
        </div>
        <ol className="divide-y divide-line border-b border-line">
          {cases.slice(0, 80).map((c) => (
            <li key={c.id} className="py-3 grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <p className="font-display text-[16px] leading-tight truncate">{c.title}</p>
                <p className="text-[12px] text-ink-3 mt-0.5 truncate">
                  {c.event}
                  {c.area ? ` · ${c.area}` : ""}
                  {c.year ? ` · ${c.year}` : ""} · {c.pis.length} indicators
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={() => go(c.category === "team" ? "m-rp-deca-team" : c.org === "FBLA" ? "m-rp-fbla-quick" : "m-rp-quick", c.id)}>
                  Quick
                </button>
                <button type="button" className="btn btn-sm" onClick={() => go(c.category === "team" ? "m-rp-deca-team" : c.org === "FBLA" ? "m-rp-fbla" : "m-rp-deca", c.id)}>
                  Full
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Paste your own */}
      <section className="mt-12 hairline-strong pt-5 md:grid md:grid-cols-[1fr_1fr] md:gap-10">
        <div>
          <h2 className="font-display text-[22px] font-medium">Bring your own case</h2>
          <p className="mt-2 text-[14px] text-ink-2">Paste the text of any official role-play PDF. Vero judges it on the same rubric.</p>
          <textarea className="field mt-4 min-h-[160px]" placeholder="Paste the whole event: performance indicators, event situation, judge questions if you have them." value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <button type="button" className="btn btn-sm mt-3" disabled={pasted.trim().length < 80} onClick={parse}>
            Read it
          </button>
        </div>
        {draft && (
          <div className="mt-8 md:mt-0">
            <p className="label">Check the fields</p>
            <Field label="Your role" value={draft.role ?? ""} onChange={(v) => setDraft({ ...draft, role: v })} />
            <Field label="Judge" value={draft.judgeRole ?? ""} onChange={(v) => setDraft({ ...draft, judgeRole: v })} />
            <Field label="Event" value={draft.event ?? ""} onChange={(v) => setDraft({ ...draft, event: v })} />
            <Field label="Situation" value={draft.situation ?? ""} onChange={(v) => setDraft({ ...draft, situation: v })} rows={6} />
            <Field label="The ask (one line)" value={draft.ask ?? ""} onChange={(v) => setDraft({ ...draft, ask: v })} />
            <Field label="Performance indicators, one per line" value={(draft.pis ?? []).join("\n")} onChange={(v) => setDraft({ ...draft, pis: v.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={5} />
            <Field label="Judge questions, one per line (optional)" value={(draft.questions ?? []).join("\n")} onChange={(v) => setDraft({ ...draft, questions: v.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={3} />
            <div className="mt-4 flex gap-3">
              <button type="button" className="btn btn-sm" disabled={!(draft.pis?.length && draft.situation)} onClick={() => practiceDraft(draft.org === "FBLA" ? "m-rp-fbla" : draft.category === "team" ? "m-rp-deca-team" : "m-rp-deca")}>
                Full simulation
              </button>
              <button type="button" className="btn-ghost btn-sm" disabled={!(draft.pis?.length && draft.situation)} onClick={() => practiceDraft(draft.org === "FBLA" ? "m-rp-fbla-quick" : "m-rp-quick")}>
                Quick case
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Formats */}
      <section className="mt-12 hairline-strong pt-5">
        <h2 className="font-display text-[22px] font-medium">Official clocks</h2>
        <ol className="mt-3 divide-y divide-line border-t border-line max-w-[720px]">
          {Object.values(FORMATS)
            .filter((f) => f.official)
            .map((f) => (
              <li key={f.id} className="py-2.5 grid grid-cols-[1fr_auto] gap-4">
                <span className="text-[14px]">{f.name}</span>
                <span className="num text-[13px] text-ink-2 whitespace-nowrap">
                  {clockLabel(f.prepSeconds)} prep · {clockLabel(f.presentSeconds)} talk
                </span>
              </li>
            ))}
        </ol>
        <p className="mt-3 text-[11px] text-ink-3">
          Sources: DECA Guide and 2025–26 sample events; FBLA 2025–26 Competitive Events Guidelines. Rubrics follow the judge&apos;s evaluation forms and rating sheets.
        </p>
      </section>

      <div className="mt-12 flex items-end gap-4">
        <Vero pose="perched" size={96} />
        <Link href="/skills" className="text-[13px] underline underline-offset-4 text-ink-2 pb-2">
          Back to the skill tree
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block mt-3">
      <span className="label-ink">{label}</span>
      {rows ? (
        <textarea className="field mt-1" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
