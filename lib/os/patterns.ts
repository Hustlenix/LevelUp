import type { OSState } from "./types";

export interface LocalPattern { id: string; title: string; detail: string; action: string; severity: "neutral" | "attention"; }
export function deriveLocalPatterns(state: OSState, date: string): LocalPattern[] {
  const sessions = Object.values(state.sessions);
  const planned = sessions.filter((session) => session.date <= date).length;
  const completed = sessions.filter((session) => session.date <= date && session.status === "completed").length;
  const overdue = sessions.filter((session) => session.date < date && session.status !== "completed" && session.status !== "skipped").length;
  const patterns: LocalPattern[] = [{ id: "planned-vs-completed", title: "Planned versus completed", detail: `${completed} of ${planned} recorded sessions are complete.`, action: completed < planned ? "Protect one smaller block next." : "Keep the current block size.", severity: completed < planned ? "attention" : "neutral" }];
  const activeGoals = Object.values(state.goals).filter((goal) => goal.status === "active");
  const masteryGaps = activeGoals.filter((goal) => (state.mastery.goals[goal.id]?.score ?? 0) < 50);
  patterns.push({ id: "mastery-gaps", title: "Mastery gaps", detail: masteryGaps.length ? `${masteryGaps.length} active goal${masteryGaps.length === 1 ? " has" : "s have"} less than half of its evidence recorded.` : "No active goal is currently below half of its evidence target.", action: masteryGaps.length ? "Choose the smallest next task for the weakest goal." : "Keep collecting evidence before increasing scope.", severity: masteryGaps.length ? "attention" : "neutral" });
  patterns.push({ id: "recovery-speed", title: "Recovery speed", detail: overdue ? `${overdue} unfinished session${overdue === 1 ? "" : "s"} need a recovery decision.` : "No unfinished sessions are waiting for recovery.", action: overdue ? "Open Review and restart one block." : "Use Review before adding more work.", severity: overdue ? "attention" : "neutral" });
  return patterns;
}
