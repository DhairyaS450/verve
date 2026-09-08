import raw from "./cases.json";
import type { CaseCategory, RoleplayOrg } from "./roleplay";

/**
 * Real DECA and FBLA cases. Every entry is condensed from an official sample event
 * (see scripts/build-cases.mjs) and links to the source PDF. Performance indicators
 * and judge questions are verbatim.
 */
export interface RoleplayCase {
  id: string;
  org: RoleplayOrg;
  category: CaseCategory;
  event: string;
  eventCode?: string;
  cluster?: string;
  pathway?: string;
  area?: string;
  year?: string;
  title: string;
  role: string;
  judgeRole: string;
  situation: string;
  ask: string;
  pis: string[];
  questions: string[];
  source: { label: string; url: string };
  custom?: boolean;
}

export const CASES: RoleplayCase[] = raw as RoleplayCase[];
export const CASE_MAP: Record<string, RoleplayCase> = Object.fromEntries(CASES.map((c) => [c.id, c]));

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  principles: "Principles",
  series: "Individual series",
  team: "Team decision making",
  pfl: "Personal financial literacy",
  "fbla-individual": "Individual role play",
  "fbla-team": "Team role play",
};

export interface EventGroup {
  event: string;
  org: RoleplayOrg;
  category: CaseCategory;
  count: number;
}

export function listEvents(org?: RoleplayOrg): EventGroup[] {
  const map = new Map<string, EventGroup>();
  for (const c of CASES) {
    if (org && c.org !== org) continue;
    const g = map.get(c.event) ?? { event: c.event, org: c.org, category: c.category, count: 0 };
    g.count += 1;
    map.set(c.event, g);
  }
  return [...map.values()].sort((a, b) => a.org.localeCompare(b.org) || a.category.localeCompare(b.category) || a.event.localeCompare(b.event));
}

const SET_CATEGORIES: Record<string, CaseCategory[]> = {
  deca: ["series", "principles", "pfl"],
  "deca-team": ["team"],
  fbla: ["fbla-individual", "fbla-team"],
  any: ["series", "principles", "pfl", "team", "fbla-individual", "fbla-team"],
};

export function pickCase(opts: { set?: string; org?: RoleplayOrg; category?: CaseCategory; event?: string; exclude?: string[] } = {}): RoleplayCase | undefined {
  let pool = CASES;
  if (opts.org) pool = pool.filter((c) => c.org === opts.org);
  if (opts.category) pool = pool.filter((c) => c.category === opts.category);
  else if (opts.set && SET_CATEGORIES[opts.set]) pool = pool.filter((c) => SET_CATEGORIES[opts.set!].includes(c.category));
  if (opts.event) pool = pool.filter((c) => c.event === opts.event);
  if (!pool.length) return undefined;
  const fresh = pool.filter((c) => !opts.exclude?.includes(c.id));
  const src = fresh.length ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}

// ---------------------------------------------------------------------------
// Bring your own case: paste the text of an official role-play PDF.
// ---------------------------------------------------------------------------
export const CUSTOM_CASE_KEY = "verve.customCase";

export function loadCustomCase(): RoleplayCase | null {
  try {
    const raw = sessionStorage.getItem(CUSTOM_CASE_KEY);
    return raw ? (JSON.parse(raw) as RoleplayCase) : null;
  } catch {
    return null;
  }
}

export function saveCustomCase(c: RoleplayCase) {
  try {
    sessionStorage.setItem(CUSTOM_CASE_KEY, JSON.stringify(c));
  } catch {}
}

function bulletsOrNumbers(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    const l = line.trim();
    const m = l.match(/^(?:[•▪●§*\-–]|\d+[.)])\s*(.+)$/);
    if (m) out.push(m[1].trim());
    else if (out.length && l && !/^[A-Z][A-Z' &]+$/.test(l)) out[out.length - 1] += " " + l;
  }
  return out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 3);
}

/** Best-effort parse of a pasted role-play. Everything stays editable afterwards. */
export function parseCaseText(text: string): Partial<RoleplayCase> {
  const t = text.replace(/\r/g, "").replace(/’/g, "'");
  const out: Partial<RoleplayCase> = {};
  const piBlock = t.match(/PERFORMANCE INDICATORS\s*\n([\s\S]*?)(?:\n\s*(?:EVENT SITUATION|CASE STUDY SITUATION|CASE STUDY|SCENARIO|SITUATION)\b|$)/i);
  if (piBlock) out.pis = bulletsOrNumbers(piBlock[1]);
  const sit = t.match(/(?:EVENT SITUATION|CASE STUDY SITUATION|CASE STUDY|SCENARIO)\s*\n([\s\S]*?)(?:\n\s*(?:JUDGE'?S? INSTRUCTIONS|JUDGES'? INSTRUCTIONS|SAMPLE JUDGES)|$)/i);
  if (sit) out.situation = sit[1].replace(/\n(?!\n)/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  const role = (out.situation ?? t).match(/You are to assume the role of (?:the |a |an )?([^.]+?)\./i);
  if (role) out.role = role[1].trim();
  const judge = (out.situation ?? t).match(/(?:The|the) ([a-z][a-z /&-]{2,40}?) \(judge\)/);
  if (judge) out.judgeRole = judge[1].trim();
  const qBlock = t.match(/(?:ask the following questions|Judges'? Questions)[^\n]*\n([\s\S]*?)(?:\n\s*(?:Once |After |You are not|There is no right|Feel free)|$)/i);
  if (qBlock) out.questions = bulletsOrNumbers(qBlock[1]);
  const org: RoleplayOrg = /DECA/i.test(t) || /EVENT SITUATION/i.test(t) ? "DECA" : "FBLA";
  out.org = org;
  const pisN = out.pis?.length ?? 0;
  out.category = org === "FBLA" ? "fbla-team" : /TEAM DECISION MAKING/i.test(t) ? "team" : /PERSONAL FINANCIAL LITERACY/i.test(t) ? "pfl" : /PRINCIPLES OF/i.test(t) || pisN === 4 ? "principles" : "series";
  const ev = t.match(/\n([A-Z][A-Z ,&/\-]+?(?:SERIES EVENT|DECISION MAKING EVENT|EVENT))\s*\n/);
  if (ev) out.event = ev[1].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Event$/, "");
  return out;
}
