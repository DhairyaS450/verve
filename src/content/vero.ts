/** Vero's voice. Short lines only. Goldfish rule. */

export const VERO = {
  analyzing: [
    "Watching your tape.",
    "Counting the ums.",
    "Listening for melody.",
    "Checking the structure.",
    "Timing your pauses.",
    "Watching your hands.",
  ],
  uploading: ["Saving to your Drive.", "Keeping the tape safe."],
  warmupDone: ["Warm. Now the real thing.", "Good. Voice is awake.", "That's the hard part done."],
  recordReady: ["Eyes on the lens.", "Breathe low. Then go.", "Point first. Then talk."],
  streak: (n: number) => (n <= 1 ? "Day one." : n < 7 ? `${n} days in a row.` : n < 30 ? `${n} days. This is a habit now.` : `${n} days. Elite discipline.`),
  firstTime: "No pressure. I need a baseline, not a performance.",
  noCamera: "Camera blocked. I can still coach from audio.",
  empty: "Nothing here yet. Your first session changes that.",
  ready: "Ready when you are.",
};

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
