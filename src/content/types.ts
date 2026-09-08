export type BranchId =
  | "voice"
  | "clarity"
  | "structure"
  | "spontaneity"
  | "story"
  | "presence"
  | "engagement"
  | "conversation"
  | "stage"
  | "roleplay";

export interface Branch {
  id: BranchId;
  name: string;
  /** ≤ 8 words */
  tagline: string;
  order: number;
}

export interface Skill {
  id: string;
  branch: BranchId;
  name: string;
  /** ≤ 10 words. Shown under the node. */
  blurb: string;
  /** 1 = foundations … 5 = elite */
  tier: 1 | 2 | 3 | 4 | 5;
  prereqs: string[];
  /** One-line coaching cue Vero repeats while you practice. */
  cue: string;
}

export type DrillPhase = "warmup" | "main";

export type MaterialKind =
  | "none"
  | "passage"
  | "twisters"
  | "topic"
  | "object"
  | "question"
  | "words"
  | "statements"
  | "line"
  | "paragraph"
  | "story-prompt"
  | "expert"
  /** A DECA / FBLA case: situation, role, performance indicators, judge questions */
  | "case"
  /** Performance indicators only, as flashcards */
  | "pis";

export interface Material {
  kind: MaterialKind;
  /** Which set to draw from (e.g. question set id, topic category) */
  set?: string;
  count?: number;
  intervalSec?: number;
  text?: string;
}

export interface Drill {
  id: string;
  phase: DrillPhase;
  name: string;
  skillIds: string[];
  /** Approximate wall-clock minutes */
  minutes: number;
  /** ≤ 4 lines, ≤ 10 words each */
  steps: string[];
  material: Material;
  frameworkId?: string;
  prepSeconds?: number;
  speakSeconds?: number;
  minSpeakSeconds?: number;
  /** Warmups are guided but not recorded. Mains are recorded + analyzed. */
  record: boolean;
  /** What Vero should weigh most for this drill */
  evalFocus: string[];
  /** Vero's one-liner intro, ≤ 14 words */
  intro: string;
}

export interface FrameworkStep {
  label: string;
  hint: string;
}

export interface Framework {
  id: string;
  name: string;
  short: string;
  steps: FrameworkStep[];
  useWhen: string;
  example: string;
  source: string;
}

export type TopicCategory =
  | "object"
  | "abstract"
  | "opinion"
  | "memory"
  | "explain"
  | "sell"
  | "wouldyourather"
  | "story"
  | "news";

export interface Topic {
  text: string;
  category: TopicCategory;
  /** 1 easy … 3 hard */
  level: 1 | 2 | 3;
}

export interface Passage {
  id: string;
  title: string;
  source: string;
  text: string;
}
