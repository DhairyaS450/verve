"use client";

import { useState } from "react";
import clsx from "clsx";

const FILLERS = new Set(["um", "uh", "uhm", "er", "erm", "ah", "hmm", "like", "basically", "literally", "actually", "so", "right", "okay", "ok"]);
const PHRASES = ["you know", "kind of", "sort of", "i mean", "you see"];

/** Transcript with fillers highlighted. Collapsed by default. */
export function Transcript({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const tokens = highlight(text);
  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="label-ink min-h-[44px] flex items-center gap-2" aria-expanded={open}>
        Transcript <span className="text-ink-3">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <p className="mt-2 text-[15px] leading-[1.7] text-ink-2 rise">
          {tokens.map((t, i) =>
            t.filler ? (
              <mark key={i} className="bg-accent-soft text-ink px-[3px] rounded-none">
                {t.text}
              </mark>
            ) : (
              <span key={i}>{t.text}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}

function highlight(text: string): { text: string; filler: boolean }[] {
  const out: { text: string; filler: boolean }[] = [];
  let rest = text;
  const lowerPhrases = PHRASES;
  while (rest.length) {
    let matched = false;
    for (const ph of lowerPhrases) {
      const re = new RegExp(`^(${ph})(?=[\\s,.!?]|$)`, "i");
      const m = rest.match(re);
      if (m) {
        out.push({ text: m[1], filler: true });
        rest = rest.slice(m[1].length);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const m = rest.match(/^([A-Za-z']+|[^A-Za-z']+)/);
    if (!m) break;
    const tok = m[1];
    const clean = tok.toLowerCase().replace(/[^a-z]/g, "");
    out.push({ text: tok, filler: /^[A-Za-z']+$/.test(tok) && FILLERS.has(clean) && clean !== "so" });
    rest = rest.slice(tok.length);
  }
  return out;
}

export function Notes({ value, onChange, onSave, saving, className }: { value: string; onChange: (v: string) => void; onSave?: () => void; saving?: boolean; className?: string }) {
  return (
    <div className={className}>
      <label className="label-ink block" htmlFor="notes">
        Your notes
      </label>
      <textarea
        id="notes"
        className={clsx("field mt-1")}
        rows={3}
        placeholder="What did you notice? One line is enough."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
      />
      {saving && <span className="text-[11px] text-ink-3">Saving…</span>}
    </div>
  );
}
