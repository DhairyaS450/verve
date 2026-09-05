export function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return localDateStr(dt);
}

export function yesterdayStr(): string {
  return addDays(localDateStr(), -1);
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function fmt1(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "–";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function fmt0(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "–";
  return String(Math.round(n));
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function relativeDay(dateStr: string): string {
  const today = localDateStr();
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DOW[dt.getDay()]} ${d} ${MON[m - 1]}`;
}

export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MON[m - 1]}`;
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function firstName(name?: string | null): string {
  if (!name) return "";
  return name.split(" ")[0];
}
