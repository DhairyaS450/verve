/**
 * Roleplay / case-competition prep for DECA and FBLA.
 * Formats, clocks and rubrics below are transcribed from official documents:
 * - DECA Guide 2024-25 (Individual Series overview), DECA 2025 and 2026 district sample events
 *   and their Judge's Evaluation Forms.
 * - FBLA 2025-2026 Competitive Events Guidelines (Customer Service; Sports & Entertainment
 *   Management) and their Role Play Presentation Rating Sheets.
 */

export type RoleplayOrg = "DECA" | "FBLA";
export type CaseCategory = "principles" | "series" | "team" | "pfl" | "fbla-individual" | "fbla-team";

export interface RoleplayFormat {
  id: string;
  org: RoleplayOrg;
  category: CaseCategory;
  name: string;
  participants: string;
  prepSeconds: number;
  presentSeconds: number;
  /** DECA judges ask after the solution; FBLA judges interrupt during the presentation. */
  questions: "end" | "during";
  /** For "during": seconds into the presentation when a judge question arrives. */
  questionAt?: number[];
  official: boolean;
  /** ≤ 14 words */
  note: string;
}

export const FORMATS: Record<string, RoleplayFormat> = {
  "deca-series": {
    id: "deca-series",
    org: "DECA",
    category: "series",
    name: "DECA Individual Series",
    participants: "1",
    prepSeconds: 600,
    presentSeconds: 600,
    questions: "end",
    official: true,
    note: "10 min prep, up to 10 min with the judge. 5 indicators, then questions.",
  },
  "deca-principles": {
    id: "deca-principles",
    org: "DECA",
    category: "principles",
    name: "DECA Principles of Business Administration",
    participants: "1",
    prepSeconds: 600,
    presentSeconds: 600,
    questions: "end",
    official: true,
    note: "10 min prep, up to 10 min with the judge. 4 indicators, then questions.",
  },
  "deca-team": {
    id: "deca-team",
    org: "DECA",
    category: "team",
    name: "DECA Team Decision Making",
    participants: "2",
    prepSeconds: 1800,
    presentSeconds: 900,
    questions: "end",
    official: true,
    note: "30 min prep, up to 15 min with the judge. Practise solo, cover both roles.",
  },
  "deca-pfl": {
    id: "deca-pfl",
    org: "DECA",
    category: "pfl",
    name: "DECA Personal Financial Literacy",
    participants: "1",
    prepSeconds: 600,
    presentSeconds: 600,
    questions: "end",
    official: true,
    note: "10 min prep, up to 10 min with the judge. 3 indicators, then questions.",
  },
  "fbla-individual": {
    id: "fbla-individual",
    org: "FBLA",
    category: "fbla-individual",
    name: "FBLA Individual Role Play",
    participants: "1",
    prepSeconds: 1200,
    presentSeconds: 420,
    questions: "during",
    questionAt: [150, 300],
    official: true,
    note: "20 min prep, 7 min role play. Judges ask questions as you go.",
  },
  "fbla-team": {
    id: "fbla-team",
    org: "FBLA",
    category: "fbla-team",
    name: "FBLA Team Role Play",
    participants: "1–3",
    prepSeconds: 1200,
    presentSeconds: 420,
    questions: "during",
    questionAt: [150, 300],
    official: true,
    note: "20 min prep, 7 min role play, two notecards. Practise solo, cover every role.",
  },
  quick: {
    id: "quick",
    org: "DECA",
    category: "series",
    name: "Quick case",
    participants: "1",
    prepSeconds: 300,
    presentSeconds: 240,
    questions: "end",
    official: false,
    note: "Verve's short form: same case, 5 min prep, 4 min talk, one question.",
  },
};

export function formatForCategory(category: CaseCategory): RoleplayFormat {
  switch (category) {
    case "principles":
      return FORMATS["deca-principles"];
    case "team":
      return FORMATS["deca-team"];
    case "pfl":
      return FORMATS["deca-pfl"];
    case "fbla-individual":
      return FORMATS["fbla-individual"];
    case "fbla-team":
      return FORMATS["fbla-team"];
    default:
      return FORMATS["deca-series"];
  }
}

// ---------------------------------------------------------------------------
// Rubrics. Each item: max points and the upper bound of the four scoring bands.
// ---------------------------------------------------------------------------
export interface RubricSpec {
  id: string;
  label: string;
  max: number;
  /** Upper bound of each band: [level1, level2, level3, level4] */
  bands: [number, number, number, number];
  group: "pi" | "solution" | "skill" | "delivery" | "overall";
}

export const DECA_BAND_NAMES = ["Little/No Value", "Below Expectations", "Meets Expectations", "Exceeds Expectations"] as const;
export const DECA_NEW_BAND_NAMES = ["Novice", "Developing", "Proficient", "Exemplary"] as const;
export const FBLA_BAND_NAMES = ["Not Demonstrated", "Below Expectations", "Meets Expectations", "Exceeds Expectations"] as const;

const pi = (i: number, label: string, max: number, bands: [number, number, number, number]): RubricSpec => ({ id: `pi${i + 1}`, label, max, bands, group: "pi" });

export function rubricFor(category: CaseCategory, pis: string[]): RubricSpec[] {
  switch (category) {
    case "principles":
      return [
        ...pis.slice(0, 4).map((p, i) => pi(i, p, 12, [3, 7, 11, 12])),
        { id: "unique", label: "Unique: original thinking, fresh perspectives, an insightful approach", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "practical", label: "Practical: an actionable, viable solution in a real-world context", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "effective", label: "Effective: a solution that achieves relevant outcomes", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "critical", label: "Critical thinking: think critically to understand and solve problems", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "communication", label: "Communication: communicate clearly, effectively and with reason", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "decision", label: "Decision making: consider the impacts of decisions", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "overall", label: "Overall career readiness: professionalism, poise and confidence", max: 10, bands: [3, 6, 9, 10], group: "overall" },
      ];
    case "team":
      return [
        ...pis.slice(0, 5).map((p, i) => pi(i, p, 10, [3, 6, 9, 10])),
        { id: "unique", label: "Unique: original thinking, fresh perspectives, an insightful approach", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "practical", label: "Practical: an actionable, viable solution in a real-world context", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "effective", label: "Effective: a solution that achieves relevant outcomes", max: 8, bands: [2, 5, 7, 8], group: "solution" },
        { id: "critical", label: "Critical thinking: think critically to understand and solve problems", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "communication", label: "Communication: communicate clearly, effectively and with reason", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "decision", label: "Decision making: consider the impacts of decisions", max: 6, bands: [1, 3, 5, 6], group: "skill" },
        { id: "overall", label: "Overall career readiness: professionalism, poise and confidence", max: 8, bands: [2, 5, 7, 8], group: "overall" },
      ];
    case "pfl":
      return [
        ...pis.slice(0, 3).map((p, i) => pi(i, p, 24, [8, 13, 18, 24])),
        { id: "reason", label: "Reason effectively and use systems thinking", max: 7, bands: [1, 3, 5, 7], group: "skill" },
        { id: "communicate", label: "Communicate clearly", max: 7, bands: [1, 3, 5, 7], group: "skill" },
        { id: "creativity", label: "Show evidence of creativity", max: 7, bands: [1, 3, 5, 7], group: "skill" },
        { id: "overall", label: "Overall impression and responses to the judge's questions", max: 7, bands: [1, 3, 5, 7], group: "overall" },
      ];
    case "fbla-individual":
      return [
        { id: "understanding", label: "Demonstrates understanding of the role play and defines the problem(s)", max: 10, bands: [0, 6, 8, 10], group: "pi" },
        { id: "position", label: "Communicates a position on the scenario", max: 10, bands: [0, 6, 8, 10], group: "pi" },
        { id: "solution", label: "Identifies a logical solution and aspects of implementation", max: 10, bands: [0, 6, 8, 10], group: "solution" },
        { id: "empathy", label: "Displays empathy and diplomacy", max: 20, bands: [0, 9, 16, 20], group: "pi" },
        { id: "closure", label: "Demonstrates conflict resolution and closure", max: 20, bands: [0, 9, 16, 20], group: "solution" },
        { id: "organized", label: "Statements are well organized and clearly stated", max: 10, bands: [0, 6, 8, 10], group: "delivery" },
        { id: "confidence", label: "Confidence, poised body language, engaging eye contact, effective voice projection", max: 10, bands: [0, 6, 8, 10], group: "delivery" },
        { id: "questions", label: "Effectively answers the judges' questions", max: 10, bands: [0, 6, 8, 10], group: "overall" },
      ];
    case "fbla-team":
      return [
        { id: "understanding", label: "Demonstrates understanding of the role play and defines the problem(s)", max: 10, bands: [0, 6, 8, 10], group: "pi" },
        { id: "alternatives", label: "Identifies alternatives and the pros and cons of each", max: 20, bands: [0, 9, 16, 20], group: "solution" },
        { id: "solution", label: "Identifies a logical solution and aspects of implementation", max: 20, bands: [0, 9, 16, 20], group: "solution" },
        { id: "knowledge", label: "Demonstrates knowledge of the event's knowledge areas", max: 20, bands: [0, 9, 16, 20], group: "pi" },
        { id: "organized", label: "Statements are well organized and clearly stated", max: 10, bands: [0, 6, 8, 10], group: "delivery" },
        { id: "confidence", label: "Confidence, poised body language, engaging eye contact, effective voice projection", max: 10, bands: [0, 6, 8, 10], group: "delivery" },
        { id: "questions", label: "Effectively answers the judges' questions", max: 10, bands: [0, 6, 8, 10], group: "overall" },
      ];
    case "series":
    default:
      return [
        ...pis.slice(0, 5).map((p, i) => pi(i, p, 14, [4, 8, 11, 14])),
        { id: "reason", label: "Reason effectively and use systems thinking", max: 6, bands: [1, 3, 4, 6], group: "skill" },
        { id: "judgment", label: "Make judgments and decisions, and solve problems", max: 6, bands: [1, 3, 4, 6], group: "skill" },
        { id: "communicate", label: "Communicate clearly", max: 6, bands: [1, 3, 4, 6], group: "skill" },
        { id: "creativity", label: "Show evidence of creativity", max: 6, bands: [1, 3, 4, 6], group: "skill" },
        { id: "overall", label: "Overall impression and responses to the judge's questions", max: 6, bands: [1, 3, 4, 6], group: "overall" },
      ];
  }
}

export function bandNamesFor(category: CaseCategory): readonly string[] {
  if (category === "fbla-individual" || category === "fbla-team") return FBLA_BAND_NAMES;
  if (category === "principles" || category === "team") return DECA_NEW_BAND_NAMES;
  return DECA_BAND_NAMES;
}

export function bandOf(spec: RubricSpec, points: number): number {
  const idx = spec.bands.findIndex((b) => points <= b);
  return idx < 0 ? 3 : idx;
}

// ---------------------------------------------------------------------------
// How to run the room. Distilled from DECA's own judge advice and the rubrics.
// ---------------------------------------------------------------------------
export const DECA_STRUCTURE = [
  "Greet, shake hands, say your name and role. Confirm the ask in one line.",
  "Restate the problem. Give your recommendation in one sentence.",
  "Walk each performance indicator: define it, apply it to this company, tie it to your plan.",
  "Implementation: who, what, when, what it costs, how you'll measure it.",
  "Close: summarise, restate the recommendation, invite questions, thank the judge.",
];

export const FBLA_STRUCTURE = [
  "Greet and confirm the situation and who you're speaking to.",
  "Define the problem(s) clearly, in business language.",
  "Give alternatives with pros and cons, then your position.",
  "Recommend: solution, implementation steps, resources, timeline.",
  "Answer judge questions directly as they come, then return to your plan.",
  "Close with resolution and next steps. Thank the judges.",
];

/** One-line prep pad prompts. */
export const PREP_PROMPTS = [
  "My role / the judge's role:",
  "The ask, in one line:",
  "My recommendation, in one line:",
  "Each PI → how I'll cover it:",
  "Numbers, timeline, cost, how to measure:",
  "Closing line:",
];

/** Practice probes when a case ships without judge questions. Clearly not official. */
export const PRACTICE_PROBES: Record<RoleplayOrg, string[]> = {
  DECA: [
    "What would you do if the budget for this were cut in half?",
    "How will you know whether your plan worked?",
    "What is the biggest risk in your plan, and how would you handle it?",
    "Which part of your recommendation would you implement first, and why?",
    "How would you explain this change to the people it affects?",
  ],
  FBLA: [
    "What would you do if the customer refused your solution?",
    "How would you follow up after this conversation?",
    "What would you do differently if this happened again next week?",
    "Which alternative did you reject, and why?",
    "What resources would you need to make this work?",
  ],
};

export const ROLEPLAY_TIPS = [
  "Judges score from the indicator list. Say each one, define it, apply it.",
  "The greeting decides the mood. Name, role, handshake, eye contact.",
  "Specifics beat adjectives: who, when, how much, how you'll measure.",
  "Aim for 5–8 minutes. Leave room for questions.",
  "Answer the question asked. Then stop.",
];
