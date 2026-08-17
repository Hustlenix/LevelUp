export interface StreakState {
  current: number;
  best: number;
  last: string;
}

export interface GamificationState {
  completedSlugs: string[];
  quizResults: Record<string, { score: number; total: number }>;
  highlightCount: number;
  reflectionCount: number;
  streak: StreakState;
}

export interface LevelInfo {
  index: number;
  name: string;
  xp: number;
  next: number | null;
  progress: number;
}

export interface Badge {
  id: string;
  name: string;
  blurb: string;
  rule: string;
  unlocked: boolean;
  unlockDate?: string;
}

export const LEVELS = [
  { xp: 0, name: "Apprentice" },
  { xp: 100, name: "Practitioner" },
  { xp: 250, name: "Specialist" },
  { xp: 500, name: "Expert" },
  { xp: 900, name: "Master" },
  { xp: 1500, name: "Grandmaster" },
] as const;

export const BADGES = [
  {
    id: "first-chapter",
    name: "First Step",
    blurb: "You finished your first chapter.",
    rule: "Complete 1 chapter",
  },
  {
    id: "halfway",
    name: "Halfway",
    blurb: "Fourteen chapters in.",
    rule: "Complete 14 chapters",
  },
  {
    id: "finisher",
    name: "Finisher",
    blurb: "All 28 chapters complete.",
    rule: "Complete all 28 chapters",
  },
  {
    id: "quiz-master",
    name: "Quiz Master",
    blurb: "Every knowledge check passed.",
    rule: "Score 70% or higher on all 28 quizzes",
  },
  {
    id: "streak-3",
    name: "Three Days",
    blurb: "Back for three days running.",
    rule: "Reach a 3-day streak",
  },
  {
    id: "streak-7",
    name: "One Week",
    blurb: "A full week of daily reading.",
    rule: "Reach a 7-day streak",
  },
  {
    id: "streak-30",
    name: "One Month",
    blurb: "Thirty days, no gaps.",
    rule: "Reach a 30-day streak",
  },
  {
    id: "bibliophile",
    name: "Bibliophile",
    blurb: "Ten passages highlighted.",
    rule: "Highlight 10 passages",
  },
  {
    id: "scribe",
    name: "Scribe",
    blurb: "Five reflections written.",
    rule: "Write 5 reflections",
  },
] as const;

export function quizPct(score: number, total: number): number {
  return total > 0 ? (score / total) * 100 : 0;
}

export function computeXp(s: GamificationState): number {
  let quizXp = 0;
  for (const r of Object.values(s.quizResults)) {
    const pct = quizPct(r.score, r.total);
    if (pct >= 70) quizXp += 25;
    if (pct >= 100) quizXp += 10;
  }
  return (
    s.completedSlugs.length * 50 +
    quizXp +
    s.highlightCount * 2 +
    s.reflectionCount * 5
  );
}

export function levelFor(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) idx = i;
  }
  const cur = LEVELS[idx];
  const next = idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;
  const progress = next ? Math.min(1, (xp - cur.xp) / (next.xp - cur.xp)) : 1;
  return { index: idx, name: cur.name, xp: cur.xp, next: next ? next.xp : null, progress };
}

export function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function advanceStreak(prev: StreakState, todayISO: string): StreakState {
  if (prev.last === todayISO) return prev;
  const current = prev.last === shiftISO(todayISO, -1) ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), last: todayISO };
}

export function badgesFor(
  state: GamificationState,
  stored: Record<string, string>,
  nowISO: string
): { badges: Badge[]; store: Record<string, string>; changed: boolean } {
  const quizScores = Object.values(state.quizResults);
  const rules: Record<string, boolean> = {
    "first-chapter": state.completedSlugs.length >= 1,
    "halfway": state.completedSlugs.length >= 14,
    "finisher": state.completedSlugs.length >= 28,
    "quiz-master":
      quizScores.length >= 28 && quizScores.every((r) => quizPct(r.score, r.total) >= 70),
    "streak-3": state.streak.best >= 3,
    "streak-7": state.streak.best >= 7,
    "streak-30": state.streak.best >= 30,
    "bibliophile": state.highlightCount >= 10,
    "scribe": state.reflectionCount >= 5,
  };
  const store = { ...stored };
  let changed = false;
  const badges = BADGES.map((b) => {
    const unlocked = rules[b.id];
    let unlockDate = stored[b.id];
    if (unlocked && !unlockDate) {
      unlockDate = nowISO;
      store[b.id] = nowISO;
      changed = true;
    }
    return { ...b, unlocked, unlockDate };
  });
  return { badges, store, changed };
}