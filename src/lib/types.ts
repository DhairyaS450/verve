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
  driveFolderId?: string;
  driveEmail?: string;
  driveConnected?: boolean;
  sessionMinutes: 5 | 10 | 15;
  /** Set once the baseline session is analyzed */
  baselineSessionId?: string;
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

export interface PlanDoc {
  date: string;
  warmupId: string;
  drillId: string;
  focusSkillId: string;
  /** ≤ 14 words. Why today looks like this. */
  reason: string;
  generatedAt: number;
  sessionId?: string;
  completed: boolean;
}

export interface DrivePrivate {
  encRefreshToken: string;
  email?: string;
  connectedAt: number;
}
