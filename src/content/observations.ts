/**
 * Observation tags. Vero tags what it sees with these; the coach counts them
 * across sessions so patterns, not one-off slips, decide what you train next.
 */
export type Dimension = "clarity" | "structure" | "vocalVariety" | "energy" | "presence" | "engagement";

export interface ObservationTag {
  tag: string;
  /** ≤ 4 words, shown to the user */
  label: string;
  dimension: Dimension | "incident";
  /** Skill that fixes it; null for pure incidents */
  skillId: string | null;
  /** One line for Vero: when to use this tag */
  hint: string;
}

export const OBSERVATION_TAGS: ObservationTag[] = [
  // clarity
  { tag: "fillers", label: "Filler words", dimension: "clarity", skillId: "fillers", hint: "um, uh, like, you know at 4+ per minute" },
  { tag: "mumbling", label: "Mumbling", dimension: "clarity", skillId: "over-articulation", hint: "words blur together, low articulation" },
  { tag: "dropped-endings", label: "Dropped word endings", dimension: "clarity", skillId: "consonants", hint: "final consonants disappear" },
  { tag: "unfinished-sentences", label: "Trailing off", dimension: "clarity", skillId: "sentence-endings", hint: "sentences repeatedly fade instead of landing (NOT a single cut-off at the timer)" },
  { tag: "hedging", label: "Hedging words", dimension: "clarity", skillId: "precision", hint: "kind of, sort of, basically, I think, maybe" },
  // voice
  { tag: "monotone", label: "Monotone", dimension: "vocalVariety", skillId: "pitch", hint: "pitch barely moves; melody flat" },
  { tag: "rushed", label: "Rushed pace", dimension: "vocalVariety", skillId: "rate", hint: "consistently over ~170 wpm or no rate changes" },
  { tag: "dragging", label: "Dragging pace", dimension: "vocalVariety", skillId: "rate", hint: "consistently under ~110 wpm" },
  { tag: "no-pauses", label: "No pauses", dimension: "vocalVariety", skillId: "pause", hint: "runs sentences together, no silence at periods" },
  { tag: "flat-emphasis", label: "No emphasis", dimension: "vocalVariety", skillId: "emphasis", hint: "no word is stressed; everything weighted the same" },
  { tag: "quiet", label: "Too quiet", dimension: "energy", skillId: "volume", hint: "low volume, sounds tentative" },
  { tag: "low-energy", label: "Low energy", dimension: "energy", skillId: "tonality", hint: "flat affect, no vitality, sounds bored" },
  { tag: "flat-tone", label: "Flat tone", dimension: "energy", skillId: "tonality", hint: "emotion in words not carried by the voice" },
  // structure
  { tag: "no-point-first", label: "Buried the point", dimension: "structure", skillId: "prep", hint: "main point arrives late or never" },
  { tag: "rambling", label: "Rambling", dimension: "structure", skillId: "three-two-one", hint: "wanders across ideas, no spine" },
  { tag: "no-signposts", label: "No signposting", dimension: "structure", skillId: "signposting", hint: "listener can't tell where they are" },
  { tag: "no-example", label: "No example", dimension: "structure", skillId: "prep", hint: "claims without a concrete example" },
  { tag: "weak-close", label: "Weak ending", dimension: "structure", skillId: "close-strong", hint: "ends with 'so yeah' or just stops, when time remained" },
  { tag: "framework-skipped", label: "Framework skipped", dimension: "structure", skillId: "prep", hint: "the required framework steps were skipped" },
  // story
  { tag: "reporting-not-reliving", label: "Reporting, not reliving", dimension: "engagement", skillId: "relive", hint: "past-tense summary, no dialogue or present tense" },
  { tag: "no-sensory", label: "No sensory detail", dimension: "engagement", skillId: "vaks", hint: "nothing to see, hear or feel" },
  { tag: "no-stakes", label: "No stakes", dimension: "engagement", skillId: "stakes", hint: "nothing could be lost" },
  { tag: "no-landing", label: "No lesson", dimension: "engagement", skillId: "landing", hint: "story ends without a one-line point" },
  // presence
  { tag: "eyes-off-lens", label: "Eyes off the lens", dimension: "presence", skillId: "eye-contact", hint: "looking at self-view, down, or away" },
  { tag: "no-gestures", label: "No gestures", dimension: "presence", skillId: "gestures", hint: "hands hidden or frozen" },
  { tag: "fidgeting", label: "Fidgeting", dimension: "presence", skillId: "stillness", hint: "swaying, touching face, shifting" },
  { tag: "flat-face", label: "Flat face", dimension: "presence", skillId: "facial-expression", hint: "no expression change" },
  { tag: "slouched", label: "Slouched", dimension: "presence", skillId: "posture", hint: "collapsed chest, head forward" },
  // engagement
  { tag: "no-hook", label: "No hook", dimension: "engagement", skillId: "hook", hint: "opens with 'so, um, today I'll talk about'" },
  { tag: "no-analogy", label: "No analogy", dimension: "engagement", skillId: "analogies", hint: "abstract explanation, nothing familiar to hold on to" },
  { tag: "generic", label: "Generic content", dimension: "engagement", skillId: "so-what", hint: "true but obvious; no 'so what' for the listener" },
  { tag: "no-questions", label: "No questions asked", dimension: "engagement", skillId: "rhetorical-questions", hint: "never invites the listener to think" },
  // incidents (situational; never become a focus)
  { tag: "cut-off-by-timer", label: "Cut off by timer", dimension: "incident", skillId: null, hint: "the clock ended the recording mid-sentence; not a habit" },
  { tag: "lost-train", label: "Lost train of thought", dimension: "incident", skillId: "wheel-60", hint: "a single blank moment; mark incident unless it recurs" },
  { tag: "tech-noise", label: "Audio issue", dimension: "incident", skillId: null, hint: "background noise, mic problems" },
];

export const TAG_MAP: Record<string, ObservationTag> = Object.fromEntries(OBSERVATION_TAGS.map((t) => [t.tag, t]));
export const TAG_IDS = OBSERVATION_TAGS.map((t) => t.tag);

/** Skills to try, in order, when a dimension is the weak spot. */
export const DIMENSION_SKILLS: Record<Dimension, string[]> = {
  clarity: ["fillers", "over-articulation", "consonants", "sentence-endings", "precision"],
  structure: ["prep", "rule-of-three", "three-two-one", "what-so-what", "signposting"],
  vocalVariety: ["pitch", "pause", "rate", "emphasis", "tonality"],
  energy: ["volume", "tonality", "energy-match", "vocal-archetypes"],
  presence: ["eye-contact", "gestures", "posture", "facial-expression", "stillness"],
  engagement: ["hook", "analogies", "so-what", "open-strong", "close-strong"],
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  clarity: "Clarity",
  structure: "Structure",
  vocalVariety: "Vocal variety",
  energy: "Energy",
  presence: "Presence",
  engagement: "Engagement",
};

export const DIMENSIONS: Dimension[] = ["clarity", "structure", "vocalVariety", "energy", "presence", "engagement"];
