export type Goal = "stage" | "spot" | "story" | "confidence";

export interface Streak {
  count: number;
  lastDate: string | null;
  best: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  goal?: Goal;
  onboarded: boolean;
  createdAt: number;
  streak: Streak;
  xp: number;
  totalSessions: number;
  focusSkillId?: string;
  focus?: FocusBlock;
  driveFolderId?: string;
  driveEmail?: string;
  driveConnected?: boolean;
  sessionMinutes: 5 | 10 | 15;
  /** Set once the baseline session is analyzed */
  baselineSessionId?: string;
  /** Display only; the key itself lives encrypted in private/gemini */
  geminiKeyLast4?: string;
}

export interface AudioMetrics {
  durationSec: number;
  speakingRatio: number;
  pauseCount: number;
  longestPauseSec: number;
  meanPauseSec: number;
  pitchMedianHz: number;
  pitchSpreadSemitones: number;
  /** 0–100, from pitch spread + volume range */
  varietyScore: number;
  volumeMeanDb: number;
  volumeRangeDb: number;
  monotone: boolean;
  /** ~160-point RMS envelope for waveform display */
  envelope: number[];
}

export interface FillerStat {
  word: string;
  count: number;
}

export interface Scores {
  clarity: number;
  structure: number;
  vocalVariety: number;
  energy: number;
  presence: number;
  engagement: number;
  overall: number;
}

export interface Moment {
  t: number;
  kind: "good" | "fix";
  note: string;
}

/** One thing Vero saw. Incidents are situational and never drive the plan. */
export interface Observation {
  tag: string;
  skillId: string | null;
  severity: 1 | 2 | 3;
  incident: boolean;
  note: string;
  t?: number;
}

export interface CoachEvidence {
  kind: "pattern" | "dimension" | "keep" | "vero" | "goal" | "explore";
  tag?: string;
  count?: number;
  of?: number;
  dimension?: string;
  avg?: number;
  day?: number;
}

export interface CoachDecision {
  skillId: string;
  /** ≤ 14 words, shown on Today and after a session */
  reason: string;
  evidence: CoachEvidence;
}

/** The current training block: one focus, held for ~3 sessions unless it improves. */
export interface FocusBlock {
  skillId: string;
  since: string;
  sessions: number;
  startAvg?: number;
  startFillers?: number;
  reason?: string;
  evidence?: CoachEvidence;
}

export interface VeroAnalysis {
  transcript: string;
  wordCount: number;
  wpm: number;
  fillers: { total: number; perMin: number; top: FillerStat[] };
  scores: Scores;
  topFix: { skillId: string; title: string; why: string; how: string };
  win: { title: string; detail: string };
  framework?: { followed: boolean; missing: string[] };
  moments: Moment[];
  observations?: Observation[];
  nextFocusSkillId: string;
  oneLiner: string;
  model: string;
  analyzedAt: number;
}

export type SessionStatus =
  | "recording"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "failed";

export interface SessionDoc {
  id: string;
  uid: string;
  createdAt: number;
  date: string;
  kind: "daily" | "free" | "baseline";
  warmupId?: string;
  /** 1-based position within a multi-drill session, and how many drills the session had */
  blockIndex?: number;
  blockCount?: number;
  drillId: string;
  drillName: string;
  skillIds: string[];
  focusSkillId?: string;
  frameworkId?: string;
  prompt?: string;
  promptExtra?: string[];
  recording?: {
    driveFileId: string;
    mimeType: string;
    bytes: number;
    durationSec: number;
    webViewLink?: string;
  };
  audio?: AudioMetrics;
  ai?: VeroAnalysis;
  /** What decided the next focus after this session */
  coach?: CoachDecision;
  endedBy?: "timer" | "user";
  notes?: string;
  selfRating?: number;
  status: SessionStatus;
  error?: string;
  xp?: number;
  isNewDrill?: boolean;
}

export interface SkillState {
  id: string;
  xp: number;
  level: number;
  sessions: number;
  lastPracticedAt?: number;
  lastScore?: number;
  bestScore?: number;
}

export interface PlanBlock {
  drillId: string;
  focusSkillId: string;
  /** ≤ 14 words. Why this block. */
  reason: string;
}

export interface PlanDoc {
  date: string;
  warmupId: string;
  /** First (or only) drill block */
  drillId: string;
  focusSkillId: string;
  /** ≤ 14 words. Why today looks like this. */
  reason: string;
  /** Extra drill blocks for longer sessions, each with a different focus */
  second?: PlanBlock;
  third?: PlanBlock;
  /** The session length this plan was built for; a change regenerates the plan */
  minutes?: number;
  generatedAt: number;
  sessionId?: string;
  completed: boolean;
}

export interface DrivePrivate {
  encRefreshToken: string;
  email?: string;
  connectedAt: number;
}

/** A user's own Gemini key, encrypted server-side. Only its ciphertext ever touches Firestore. */
export interface GeminiPrivate {
  encKey: string;
  last4: string;
  addedAt: number;
}
