import type { Branch, Skill } from "./types";

export const BRANCHES: Branch[] = [
  { id: "voice", name: "Voice", tagline: "Rate, volume, pitch, tone, pause.", order: 1 },
  { id: "clarity", name: "Clarity", tagline: "Every word lands. No fillers.", order: 2 },
  { id: "structure", name: "Structure", tagline: "Frameworks that kill rambling.", order: 3 },
  { id: "spontaneity", name: "On the spot", tagline: "Any topic. Zero prep. Coherent.", order: 4 },
  { id: "story", name: "Story", tagline: "Relive it. Make them feel it.", order: 5 },
  { id: "presence", name: "Presence", tagline: "Body, face, eyes, stillness.", order: 6 },
  { id: "engagement", name: "Engagement", tagline: "Analogies, rhetoric, persuasion.", order: 7 },
  { id: "conversation", name: "Conversation", tagline: "Threads, questions, listening.", order: 8 },
  { id: "stage", name: "Stage", tagline: "From a toast to a keynote.", order: 9 },
];

export const SKILLS: Skill[] = [
  // ---------------- VOICE ----------------
  { id: "breath", branch: "voice", tier: 1, prereqs: [], name: "Breath support", blurb: "Low, slow breath powers every other skill.", cue: "Breathe into your belly. Speak on the exhale." },
  { id: "volume", branch: "voice", tier: 1, prereqs: ["breath"], name: "Volume dial", blurb: "Speak at 6 or 7 out of 10.", cue: "Fill the room. Aim for a 7, not a 4." },
  { id: "pause", branch: "voice", tier: 1, prereqs: [], name: "The pause", blurb: "Silence is authority. Use it on purpose.", cue: "Stop at every period. Count one." },
  { id: "rate", branch: "voice", tier: 2, prereqs: ["pause"], name: "Rate control", blurb: "Slow for weight. Fast for excitement.", cue: "Slow down on the point. Speed up on the story." },
  { id: "pitch", branch: "voice", tier: 2, prereqs: ["breath"], name: "Pitch & melody", blurb: "Move your pitch. Flat voices bore.", cue: "Let the sentence rise and fall like a siren." },
  { id: "emphasis", branch: "voice", tier: 2, prereqs: ["pitch"], name: "Emphasis", blurb: "Land the one word that matters.", cue: "Pick one word per sentence. Hit it." },
  { id: "tonality", branch: "voice", tier: 3, prereqs: ["pitch", "volume"], name: "Tonality", blurb: "Your face sets the tone; your voice carries it.", cue: "Feel the emotion first. Then speak." },
  { id: "resonance", branch: "voice", tier: 3, prereqs: ["breath"], name: "Resonance", blurb: "Warm, full sound from the chest.", cue: "Hum first. Feel the buzz in your lips." },
  { id: "vocal-archetypes", branch: "voice", tier: 4, prereqs: ["tonality", "rate"], name: "Vocal archetypes", blurb: "Friend, Motivator, Educator, Coach — on demand.", cue: "Open as a Friend. Finish as a Coach." },

  // ---------------- CLARITY ----------------
  { id: "articulators", branch: "clarity", tier: 1, prereqs: [], name: "Warm articulators", blurb: "Wake up lips, tongue, jaw.", cue: "Big mouth shapes. Loose jaw." },
  { id: "fillers", branch: "clarity", tier: 1, prereqs: [], name: "Filler control", blurb: "Replace um with silence.", cue: "When you feel an um coming, close your mouth." },
  { id: "over-articulation", branch: "clarity", tier: 1, prereqs: ["articulators"], name: "Over-articulation", blurb: "Exaggerate every sound, then relax into precision.", cue: "Chew the words. Every consonant." },
  { id: "tongue-twisters", branch: "clarity", tier: 2, prereqs: ["articulators"], name: "Twisters", blurb: "Speed with precision.", cue: "Slow and perfect beats fast and sloppy." },
  { id: "vowels", branch: "clarity", tier: 2, prereqs: ["over-articulation"], name: "Open vowels", blurb: "Wider mouth, clearer words.", cue: "Drop the jaw on every vowel." },
  { id: "consonants", branch: "clarity", tier: 2, prereqs: ["over-articulation"], name: "Crisp endings", blurb: "Finish every word.", cue: "Hit the last consonant of every word." },
  { id: "sentence-endings", branch: "clarity", tier: 2, prereqs: ["fillers"], name: "Finish sentences", blurb: "End with a period. No trailing off.", cue: "Land the sentence. Then breathe." },
  { id: "precision", branch: "clarity", tier: 3, prereqs: ["fillers", "sentence-endings"], name: "Word precision", blurb: "Fewer words. Exact words. No hedging.", cue: "Cut 'kind of', 'sort of', 'basically'." },

  // ---------------- STRUCTURE ----------------
  { id: "prep", branch: "structure", tier: 1, prereqs: [], name: "PREP", blurb: "Point, Reason, Example, Point.", cue: "Say the point first. Then earn it." },
  { id: "three-two-one", branch: "structure", tier: 1, prereqs: [], name: "3-2-1", blurb: "Three steps, two types, one thing.", cue: "Count out loud. Numbers stop rambling." },
  { id: "what-so-what", branch: "structure", tier: 2, prereqs: ["prep"], name: "What / So what / Now what", blurb: "Lead anyone to an action.", cue: "Why does this matter to them?" },
  { id: "rule-of-three", branch: "structure", tier: 2, prereqs: ["prep"], name: "Rule of three", blurb: "Three points. Never four.", cue: "Announce three. Deliver three. Stop." },
  { id: "problem-solution-benefit", branch: "structure", tier: 2, prereqs: ["what-so-what"], name: "Problem → Solution → Benefit", blurb: "The persuasion default.", cue: "Make the problem hurt before you solve it." },
  { id: "past-present-future", branch: "structure", tier: 2, prereqs: ["three-two-one"], name: "Past / Present / Future", blurb: "Time is a structure everyone follows.", cue: "Where were we, where are we, where next." },
  { id: "contrast", branch: "structure", tier: 3, prereqs: ["rule-of-three"], name: "Contrast", blurb: "It's not this. It's that.", cue: "Name the wrong idea, then the right one." },
  { id: "add", branch: "structure", tier: 3, prereqs: ["prep"], name: "ADD for Q&A", blurb: "Answer, Detail, Describe the value.", cue: "One-sentence answer first. Always." },
  { id: "golden-circle", branch: "structure", tier: 3, prereqs: ["problem-solution-benefit"], name: "Why → How → What", blurb: "Start with why.", cue: "Belief first. Method second. Product last." },
  { id: "para", branch: "structure", tier: 3, prereqs: ["problem-solution-benefit"], name: "PARA", blurb: "Point, Action, Result, Ask.", cue: "End with a clear ask." },
  { id: "signposting", branch: "structure", tier: 4, prereqs: ["rule-of-three", "contrast"], name: "Signposting", blurb: "Tell them where you're going.", cue: "'First…', 'The key point…', 'Finally…'" },

  // ---------------- SPONTANEITY ----------------
  { id: "wheel-60", branch: "spontaneity", tier: 1, prereqs: [], name: "60-second wheel", blurb: "Any topic. One minute. No rambling.", cue: "Pick one angle. Ignore the rest." },
  { id: "word-association", branch: "spontaneity", tier: 1, prereqs: [], name: "Word association", blurb: "Kill the filter.", cue: "First word. No judging." },
  { id: "yes-and", branch: "spontaneity", tier: 2, prereqs: ["word-association"], name: "Yes, and", blurb: "Accept the offer. Build on it.", cue: "Never block. Add one detail." },
  { id: "wheel-120", branch: "spontaneity", tier: 2, prereqs: ["wheel-60", "prep"], name: "Two-minute wheel", blurb: "Structure under pressure.", cue: "Framework first. Then talk." },
  { id: "expert-interview", branch: "spontaneity", tier: 2, prereqs: ["yes-and"], name: "Instant expert", blurb: "Commit with total confidence.", cue: "Certainty is a choice. Choose it." },
  { id: "sell-me-this", branch: "spontaneity", tier: 3, prereqs: ["wheel-120"], name: "Sell me this", blurb: "Desire before features.", cue: "Who is it for and what changes for them?" },
  { id: "explain-simply", branch: "spontaneity", tier: 3, prereqs: ["wheel-120"], name: "Explain simply", blurb: "If a child gets it, everyone does.", cue: "Short words. One analogy." },
  { id: "devils-advocate", branch: "spontaneity", tier: 3, prereqs: ["expert-interview"], name: "Devil's advocate", blurb: "Argue what you don't believe.", cue: "Find the strongest version of the other side." },
  { id: "bridge", branch: "spontaneity", tier: 4, prereqs: ["add", "wheel-120"], name: "Bridging", blurb: "From any question to your message.", cue: "'What matters here is…'" },
  { id: "no-prep-2min", branch: "spontaneity", tier: 4, prereqs: ["sell-me-this", "explain-simply"], name: "Cold two minutes", blurb: "Zero prep. Full structure.", cue: "Open with the point. Close with the point." },

  // ---------------- STORY ----------------
  { id: "story-formula", branch: "story", tier: 1, prereqs: [], name: "Story formula", blurb: "Incident. Details. The reason I'm telling you this.", cue: "Finish with: 'the reason I'm telling you this is…'" },
  { id: "hook", branch: "story", tier: 2, prereqs: ["story-formula"], name: "The hook", blurb: "Start inside the action.", cue: "No 'so, last week'. Start in the moment." },
  { id: "relive", branch: "story", tier: 2, prereqs: ["story-formula"], name: "Relive, don't report", blurb: "Present tense. Real dialogue.", cue: "'She looks at me and says…'" },
  { id: "vaks", branch: "story", tier: 2, prereqs: ["story-formula"], name: "Sensory detail", blurb: "See it, hear it, feel it, smell it.", cue: "One sight, one sound, one feeling." },
  { id: "stakes", branch: "story", tier: 3, prereqs: ["relive"], name: "Stakes", blurb: "What could be lost?", cue: "Tell us what happens if it goes wrong." },
  { id: "story-spine", branch: "story", tier: 3, prereqs: ["hook"], name: "Story spine", blurb: "Until one day… because of that…", cue: "Every beat causes the next beat." },
  { id: "abt", branch: "story", tier: 3, prereqs: ["stakes"], name: "And, But, Therefore", blurb: "Setup, conflict, resolution.", cue: "The 'but' is where the story starts." },
  { id: "landing", branch: "story", tier: 3, prereqs: ["vaks", "relive"], name: "The landing", blurb: "One lesson. One sentence.", cue: "End on the lesson, not the details." },
  { id: "sparkline", branch: "story", tier: 4, prereqs: ["landing"], name: "What is / what could be", blurb: "Duarte's shape of great talks.", cue: "Alternate reality and possibility." },
  { id: "story-bank", branch: "story", tier: 4, prereqs: ["landing", "hook"], name: "Signature stories", blurb: "Five stories, always ready.", cue: "Childhood, failure, win, mentor, turning point." },
  { id: "humor-callback", branch: "story", tier: 5, prereqs: ["story-bank"], name: "Humor & callbacks", blurb: "Plant early. Pay off late.", cue: "Bring back a detail from the opening." },

  // ---------------- PRESENCE ----------------
  { id: "posture", branch: "presence", tier: 1, prereqs: [], name: "Posture", blurb: "String from the crown of your head.", cue: "Shoulders down. Chest open. Feet planted." },
  { id: "eye-contact", branch: "presence", tier: 1, prereqs: [], name: "Eye contact", blurb: "The lens is a person.", cue: "Look at the lens, not at yourself." },
  { id: "gestures", branch: "presence", tier: 2, prereqs: ["posture"], name: "Power sphere", blurb: "Gestures between belly and eyes.", cue: "Gesture on the key word. Then rest." },
  { id: "facial-expression", branch: "presence", tier: 2, prereqs: ["eye-contact"], name: "Expressive face", blurb: "Your face is a volume knob for emotion.", cue: "Eyebrows move. Smile early." },
  { id: "nerves", branch: "presence", tier: 2, prereqs: ["posture"], name: "Nerves protocol", blurb: "Burn adrenaline. Breathe low.", cue: "Move first. Then breathe. Then speak." },
  { id: "stillness", branch: "presence", tier: 3, prereqs: ["gestures"], name: "Stillness", blurb: "No fidgeting. No swaying.", cue: "Plant your feet. Hands rest when silent." },
  { id: "movement", branch: "presence", tier: 4, prereqs: ["stillness"], name: "Purposeful movement", blurb: "Move on transitions only.", cue: "New point, new position." },
  { id: "executive-presence", branch: "presence", tier: 5, prereqs: ["movement", "facial-expression", "volume"], name: "Executive presence", blurb: "Loud, paused, big, steady.", cue: "Volume 7. Pause 2 seconds. Big gestures." },

  // ---------------- ENGAGEMENT ----------------
  { id: "analogies", branch: "engagement", tier: 2, prereqs: ["wheel-60"], name: "Analogies", blurb: "A is to B as C is to D.", cue: "Explain the new with the familiar." },
  { id: "so-what", branch: "engagement", tier: 2, prereqs: ["what-so-what"], name: "The so-what test", blurb: "Why should they care?", cue: "After every fact, answer 'so what?'" },
  { id: "rhetorical-questions", branch: "engagement", tier: 3, prereqs: ["so-what"], name: "Rhetorical questions", blurb: "Make them think before you tell.", cue: "Ask, pause, then answer." },
  { id: "tricolon", branch: "engagement", tier: 3, prereqs: ["rule-of-three"], name: "Rhetorical devices", blurb: "Tricolon, anaphora, antithesis.", cue: "Repeat the opening words three times." },
  { id: "open-strong", branch: "engagement", tier: 3, prereqs: ["hook"], name: "Open strong", blurb: "Question, story, or bold claim. Never 'hi'.", cue: "First sentence earns the second." },
  { id: "close-strong", branch: "engagement", tier: 3, prereqs: ["landing"], name: "Close strong", blurb: "Last line is the one they remember.", cue: "Plan the last sentence first." },
  { id: "ethos-pathos-logos", branch: "engagement", tier: 4, prereqs: ["so-what", "stakes"], name: "Ethos, pathos, logos", blurb: "Credibility, emotion, logic. All three.", cue: "One proof, one feeling, one fact." },
  { id: "monroe", branch: "engagement", tier: 4, prereqs: ["problem-solution-benefit", "close-strong"], name: "Motivated sequence", blurb: "Attention, need, satisfaction, vision, action.", cue: "Make them see the future before the ask." },
  { id: "callbacks", branch: "engagement", tier: 5, prereqs: ["close-strong", "humor-callback"], name: "Callbacks", blurb: "Close by returning to the opening.", cue: "Your ending was hidden in your opening." },

  // ---------------- CONVERSATION ----------------
  { id: "threading", branch: "conversation", tier: 1, prereqs: [], name: "Conversational threading", blurb: "Every answer offers three threads.", cue: "Give them three things to pull on." },
  { id: "questions", branch: "conversation", tier: 2, prereqs: ["threading"], name: "Better questions", blurb: "And what else?", cue: "Ask 'what else?' before you respond." },
  { id: "paraphrase", branch: "conversation", tier: 2, prereqs: ["threading"], name: "Paraphrase", blurb: "What I'm hearing is…", cue: "Reflect it back before you add." },
  { id: "anecdotes", branch: "conversation", tier: 3, prereqs: ["story-formula", "threading"], name: "30-second anecdotes", blurb: "Stories sized for conversation.", cue: "One scene, one line of dialogue, one point." },
  { id: "disagree", branch: "conversation", tier: 3, prereqs: ["paraphrase"], name: "Disagree gracefully", blurb: "Acknowledge, reframe, offer.", cue: "'I see it differently, here's why.'" },
  { id: "tough-questions", branch: "conversation", tier: 4, prereqs: ["add", "disagree"], name: "Tough questions", blurb: "Calm answers to hostile questions.", cue: "Breathe. Answer the fair version of it." },
  { id: "energy-match", branch: "conversation", tier: 4, prereqs: ["tonality", "questions"], name: "Energy matching", blurb: "Meet their energy, then lead it.", cue: "Match for ten seconds. Then lift." },

  // ---------------- STAGE ----------------
  { id: "toast", branch: "stage", tier: 3, prereqs: ["anecdotes", "landing"], name: "The toast", blurb: "Sixty seconds everyone remembers.", cue: "One story. One wish. Raise the glass." },
  { id: "throughline", branch: "stage", tier: 3, prereqs: ["signposting", "landing"], name: "Throughline", blurb: "One sentence the whole talk serves.", cue: "Say it at the start. Return at the end." },
  { id: "talk-131", branch: "stage", tier: 4, prereqs: ["throughline", "tricolon"], name: "1-3-1 talk", blurb: "One idea, three themes, one conclusion.", cue: "Promise, three parts, tie-back." },
  { id: "qa-lightning", branch: "stage", tier: 4, prereqs: ["tough-questions", "bridge"], name: "Q&A under fire", blurb: "Five questions, thirty seconds each.", cue: "Short answer. Then stop talking." },
  { id: "five-minute-talk", branch: "stage", tier: 4, prereqs: ["talk-131", "gestures"], name: "Five-minute talk", blurb: "A full talk with body and voice.", cue: "Own the space. Own the pauses." },
  { id: "keynote", branch: "stage", tier: 5, prereqs: ["five-minute-talk", "vocal-archetypes", "story-bank"], name: "Ten-minute keynote", blurb: "Stories, structure, and stage.", cue: "Friend, Motivator, Educator, Coach, Friend." },
  { id: "signature-talk", branch: "stage", tier: 5, prereqs: ["keynote", "executive-presence", "callbacks"], name: "Signature talk", blurb: "The talk you could give tomorrow, anywhere.", cue: "This is who you are on stage." },
];

export const SKILL_MAP: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const BRANCH_MAP: Record<string, Branch> = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));

export function skillsInBranch(branch: string): Skill[] {
  return SKILLS.filter((s) => s.branch === branch).sort((a, b) => a.tier - b.tier);
}

/** Level thresholds per skill (XP). Level 5 = Elite. */
export const SKILL_LEVEL_XP = [0, 30, 100, 250, 500, 900];

export function skillLevel(xp: number): number {
  let lvl = 0;
  for (let i = 1; i < SKILL_LEVEL_XP.length; i++) if (xp >= SKILL_LEVEL_XP[i]) lvl = i;
  return lvl;
}

export const LEVEL_NAMES = ["Untrained", "Aware", "Practicing", "Capable", "Strong", "Elite"];
