// Builds src/content/cases.json from parsed official DECA / FBLA sample events.
//
// Inputs (produced by the scratch parsers, never committed): deca_cases.json, fbla_cases.json.
// Each raw situation is condensed by Gemini under strict instructions: keep every name, number,
// constraint and the exact ask; add nothing. The official PDF is linked from every case.
//
// Usage: node scripts/build-cases.mjs <dir-with-json>  (reads GEMINI_API_KEY from .env)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { GoogleGenAI, Type } from "@google/genai";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/build-cases.mjs <dir>");
for (const f of [".env", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const CDN = "https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/";
const urlByFile = Object.fromEntries(
  readFileSync(resolve(dir, "urls.txt"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((u) => [u.replace(/^[0-9a-f]+_/, ""), CDN + u]),
);

const EVENT_NAMES = {
  PBM: "Principles of Business Management and Administration",
  PEN: "Principles of Entrepreneurship",
  PFN: "Principles of Finance",
  PHT: "Principles of Hospitality and Tourism",
  PMK: "Principles of Marketing",
  ACT: "Accounting Applications Series",
  AAM: "Apparel and Accessories Marketing Series",
  ASM: "Automotive Services Marketing Series",
  BFS: "Business Finance Series",
  BSM: "Business Services Marketing Series",
  ENT: "Entrepreneurship Series",
  FMS: "Food Marketing Series",
  HLM: "Hotel and Lodging Management Series",
  HRM: "Human Resources Management Series",
  MCS: "Marketing Communications Series",
  QSRM: "Quick Serve Restaurant Management Series",
  RFSM: "Restaurant and Food Service Management Series",
  RMS: "Retail Merchandising Series",
  SEM: "Sports and Entertainment Marketing Series",
  PFL: "Personal Financial Literacy",
  BLTDM: "Business Law and Ethics Team Decision Making",
  BTDM: "Buying and Merchandising Team Decision Making",
  ETDM: "Entrepreneurship Team Decision Making",
  FTDM: "Financial Services Team Decision Making",
  HTDM: "Hospitality Services Team Decision Making",
  MTDM: "Marketing Management Team Decision Making",
  STDM: "Sports and Entertainment Marketing Team Decision Making",
  TTDM: "Travel and Tourism Team Decision Making",
};

function categoryFor(code) {
  if (/TDM$/.test(code)) return "team";
  if (code === "PFL") return "pfl";
  if (/^P(BM|EN|FN|HT|MK)$/.test(code)) return "principles";
  return "series";
}

const schema = {
  type: Type.OBJECT,
  required: ["title", "role", "judgeRole", "situation", "ask"],
  properties: {
    title: { type: Type.STRING, description: "≤ 8 words: COMPANY NAME plus the decision, e.g. 'STAGE BEAT: converting clicks to ticket sales'" },
    role: { type: Type.STRING, description: "The participant's role exactly as given, with the company and its one-line description. ≤ 30 words." },
    judgeRole: { type: Type.STRING, description: "The judge's title exactly as given, e.g. 'marketing director'." },
    situation: {
      type: Type.STRING,
      description: "A faithful condensation of the situation in second person, 90–140 words. Keep EVERY proper noun, number, price, percentage, date, deadline and constraint. Do not add facts, examples or advice. Do not include the final paragraph about where the role-play takes place.",
    },
    ask: { type: Type.STRING, description: "What the participant must deliver, in ≤ 35 words, using the source's wording." },
  },
};

async function condense(raw, hint) {
  const prompt = `You are condensing an official business-competition case for a study app. ${hint}\n\nRules: keep every name, number, dollar amount, percentage, date, deadline and constraint from the source; keep the participant role and judge role exactly; do not invent, infer or advise; second person ("You are..."). Return JSON only.\n\nSOURCE:\n${raw}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.15 },
      });
      return JSON.parse(res.text);
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

function tidyEvent(s) {
  return s
    .toLowerCase()
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/ Event$/, "");
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

// Page headers ("SEM-26 District Event 1") get glued into pypdf text; strip them.
const HEADER = /\s*[A-Z]{2,6}-\d\d\s+(?:District Event(?:\s+\d)?(?:\s+Sample)?|Sample(?: Event)?)\s*/g;
const strip = (s) => s.replace(HEADER, " ").replace(/\s{2,}/g, " ").trim();
const deca = JSON.parse(readFileSync(resolve(dir, "deca_cases.json"), "utf8"))
  .filter((c) => c.pis.length && c.situation)
  .map((c) => ({ ...c, situation: strip(c.situation), pis: c.pis.map(strip), questions: c.questions.map(strip) }));
const fbla = JSON.parse(readFileSync(resolve(dir, "fbla_cases.json"), "utf8")).filter((c) => c.pis.length && c.situation);

console.log(`DECA ${deca.length} cases, FBLA ${fbla.length} cases → condensing with ${MODEL}`);

const decaOut = await mapLimit(deca, 4, async (c) => {
  const codeM = c.code.match(/^([A-Z]+)-(\d\d)$/);
  const code = codeM ? codeM[1] : c.file.match(/DECA_([A-Z]+)_/)[1];
  const year = codeM ? `20${codeM[2]}` : c.file.match(/_(\d{4})_/)?.[1] ?? "";
  const category = categoryFor(code);
  const hint = `This is a DECA ${category === "team" ? "Team Decision Making case study" : "role-play"} (${EVENT_NAMES[code] ?? code}, instructional area: ${c.area}).`;
  const s = await condense(c.situation, hint);
  const id = `deca-${code.toLowerCase()}-${year.slice(2)}-${c.file.replace(/\.pdf$/, "").split("_").slice(3).join("").toLowerCase() || "x"}`;
  process.stdout.write(".");
  return {
    id,
    org: "DECA",
    category,
    event: EVENT_NAMES[code] ?? tidyEvent(c.event),
    eventCode: code,
    cluster: c.cluster,
    pathway: c.pathway,
    area: c.area,
    year,
    title: s.title,
    role: s.role,
    judgeRole: s.judgeRole,
    situation: s.situation,
    ask: s.ask,
    pis: c.pis,
    questions: c.questions,
    source: { label: `DECA ${year} district sample event (${code})`, url: urlByFile[c.file] ?? "https://www.deca.org/compete" },
  };
});

const FBLA_INDIVIDUAL = new Set(["Client Service", "Help Desk"]);
const fblaOut = await mapLimit(fbla, 4, async (c) => {
  const individual = FBLA_INDIVIDUAL.has(c.event);
  const hint = `This is an FBLA ${individual ? "individual role play" : "team case study"} (${c.event}). Include the "things to consider" list inside the situation if present.`;
  const s = await condense(c.situation + (c.instructions ? "\n\nPARTICIPANT INSTRUCTIONS: " + c.instructions : ""), hint);
  const slug = c.event.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
  process.stdout.write(".");
  const eventNow = { "Client Service": "Customer Service", "Global Business": "International Business", "Management Decision Making": "Business Management", "Hospitality Management": "Hospitality & Event Management", "Help Desk": "Technology Support & Services" }[c.event] ?? c.event;
  return {
    id: `fbla-${slug}-${c.source === "teachfbla" ? "t" : "g"}`,
    org: "FBLA",
    category: individual ? "fbla-individual" : "fbla-team",
    event: eventNow,
    eventCode: undefined,
    cluster: undefined,
    pathway: undefined,
    area: c.event,
    year: c.source === "teachfbla" ? "2019" : "2017",
    title: s.title,
    role: s.role,
    judgeRole: s.judgeRole,
    situation: s.situation,
    ask: s.ask,
    pis: c.pis,
    questions: c.questions,
    source: {
      label: c.source === "teachfbla" ? "FBLA sample case study (TeachFBLA, 2019)" : "FBLA Competitive Events Study Guide 2017–20 sample case",
      url:
        c.source === "teachfbla"
          ? `https://teachfbla.org/wp-content/uploads/2019/08/Sample-Role-Play-${c.event.replace(/ & /g, "-").replace(/ /g, "-")}.pdf`
          : "https://www.fbla.org/high-school/competitive-events/",
    },
  };
});

const all = [...decaOut, ...fblaOut];
writeFileSync(resolve("src/content/cases.json"), JSON.stringify(all, null, 1));
console.log(`\nwrote src/content/cases.json with ${all.length} cases`);
