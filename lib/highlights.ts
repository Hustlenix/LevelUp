export interface HighlightEntry {
  id: string;
  slug: string;
  text: string;
  color: string;
  ts: number;
}

export function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface TextMatch {
  start: number;
  end: number;
}

export function findTextMatch(html: string, text: string): TextMatch | null {
  const h = normalize(html);
  const t = normalize(text);
  if (!t) return null;
  const i = h.indexOf(t);
  return i < 0 ? null : { start: i, end: i + t.length };
}

export function prefixCandidates(text: string, words: number[]): string[] {
  const t = normalize(text);
  const parts = t.split(" ");
  const out: string[] = [];
  for (const n of words) {
    const cand = parts.slice(0, n).join(" ");
    if (cand && cand !== t && !out.includes(cand)) out.push(cand);
  }
  return out;
}