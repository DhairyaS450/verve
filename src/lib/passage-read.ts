/**
 * The transcript of a read-aloud take is the page itself, cut where the speaker stopped.
 *
 * `readTo` is Vero's anchor: the last words of the passage the speaker actually said. The spoken word count
 * breaks ties when the passage repeats a phrase, and stands in when the anchor cannot be found on the page.
 */
export function passageAsRead(text: string, reading: { finished?: boolean; readTo?: string } | undefined, spokenWords: number): { text: string; words: number } {
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.length;
  if (reading?.finished) return { text, words: total };
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const page = words.map(norm);
  const anchor = (reading?.readTo ?? "").split(/\s+/).map(norm).filter(Boolean);
  let end = -1;
  if (anchor.length >= 2) {
    const target = spokenWords > 0 ? spokenWords : total;
    for (let i = 0; i + anchor.length <= total; i++) {
      if (!anchor.every((a, k) => page[i + k] === a)) continue;
      const e = i + anchor.length;
      if (end < 0 || Math.abs(e - target) < Math.abs(end - target)) end = e;
    }
  }
  if (end < 0) end = Math.min(total, Math.max(0, Math.round(spokenWords)));
  // Within two words of the end is a finished read.
  if (end >= total - 2) return { text, words: total };
  return { text: end > 0 ? `${words.slice(0, end).join(" ")} …` : "", words: end };
}
