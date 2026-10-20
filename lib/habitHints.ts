import { formatLocalDate } from "./dates.ts";
import type { Habit } from "./habits.ts";

export interface HabitEvidence {
  focus: { date: string; completedAt: number; completedSeconds: number }[];
  sessions: { date: string; status: string; completedAt?: string; elapsedSeconds?: number }[];
  pillars?: { health: { done: boolean }; wealth: { done: boolean }; love: { done: boolean }; self: { done: boolean } };
  protocols: { date: string }[];
  quizzes: { ts: number; score: number; total: number }[];
  highlights: { ts: number }[];
  reviews: { date: string }[];
}

/** Suggestions only: callers must never turn evidence into automatic habit logs. */
export function habitHint(habit: Habit, today: string, evidence: HabitEvidence): { text: string; value?: number } | undefined {
  const onToday = (ts: number) => Number.isFinite(ts) && formatLocalDate(new Date(ts)) === today;
  if (habit.link === "focus") {
    const blocks = [
      ...evidence.focus.filter((s) => s.date === today).map((s) => ({ at: s.completedAt, seconds: s.completedSeconds })),
      ...evidence.sessions.filter((s) => s.date === today && s.status === "completed" && s.completedAt).map((s) => ({ at: Date.parse(s.completedAt!), seconds: s.elapsedSeconds ?? 0 })),
    ].filter((s) => Number.isFinite(s.at) && s.seconds > 0).sort((a, b) => b.at - a.at);
    const seconds = blocks[0]?.seconds ?? 0;
    if (seconds > 0) {
      const minutes = Math.floor(seconds / 60);
      // A sub-minute block is still real evidence, so report it in seconds rather
      // than dropping the hint. Pre-filling 0 would clear the entry, so omit `value`.
      const label = minutes > 0 ? `${minutes} min` : `${seconds} sec`;
      return { text: `Your latest focus block recorded ${label}. Log it when you're ready.`, value: minutes > 0 ? minutes : undefined };
    }
  }
  if (habit.link === "pillars" && evidence.pillars && [evidence.pillars.health, evidence.pillars.wealth, evidence.pillars.love, evidence.pillars.self].every((p) => p.done)) return { text: "All four pillar floors are checked today. Ready to mark this done?" };
  if (habit.link === "protocol" && evidence.protocols.some((p) => p.date === today)) return { text: "You recorded a protocol today. Confirm this habit if you followed through." };
  const quiz = evidence.quizzes.find((q) => onToday(q.ts));
  if (habit.link === "quiz" && quiz) return { text: `Quiz logged today — you scored ${quiz.score}/${quiz.total}. Confirm this habit when you're ready.` };
  // Legacy chapter reflections have no timestamp, so they cannot prove today's activity.
  if (habit.template === "reflect" && (evidence.highlights.some((h) => onToday(h.ts)) || evidence.reviews.some((r) => r.date === today))) return { text: "You saved a highlight or review today. Confirm this habit when you're ready." };
}
