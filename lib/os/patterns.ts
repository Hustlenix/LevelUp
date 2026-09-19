import type { OSState } from "./types";

export interface LocalPattern { id: string; title: string; detail: string; action: string; severity: "neutral" | "attention"; }
export function deriveLocalPatterns(state: OSState, date: string): LocalPattern[] {
  const sessions = Object.values(state.sessions);
  const today = Date.parse(`${date}T12:00:00`);
  const last7 = sessions.filter((session) => { const timestamp = Date.parse(`${session.date}T12:00:00`); return timestamp <= today && timestamp >= today - (6 * 86400000); });
  const planned = sessions.filter((session) => session.date <= date).length;
  const completed = sessions.filter((session) => session.date <= date && session.status === "completed").length;
  const planned7 = last7.length;
  const completed7 = last7.filter((session) => session.status === "completed").length;
  const overdue = sessions.filter((session) => session.date < date && session.status !== "completed" && session.status !== "skipped").length;
  const patterns: LocalPattern[] = [{ id: "planned-vs-completed", title: "Planned versus completed", detail: `${completed7} of ${planned7} sessions in the last seven days are complete (${completed} of ${planned} overall).`, action: completed7 < planned7 ? "Protect one smaller block next." : "Keep the current block size.", severity: completed7 < planned7 ? "attention" : "neutral" }];
  const activeGoals = Object.values(state.goals).filter((goal) => goal.status === "active");
  const masteryGaps = activeGoals.filter((goal) => (state.mastery.goals[goal.id]?.score ?? 0) < 50);
  patterns.push({ id: "mastery-gaps", title: "Mastery gaps", detail: masteryGaps.length ? `${masteryGaps.length} active goal${masteryGaps.length === 1 ? " has" : "s have"} less than half of its evidence recorded.` : "No active goal is currently below half of its evidence target.", action: masteryGaps.length ? "Choose the smallest next task for the weakest goal." : "Keep collecting evidence before increasing scope.", severity: masteryGaps.length ? "attention" : "neutral" });
  const recoveryCount = state.completionEvents.filter((event) => event.kind === "recovery-started" && event.occurredAt >= `${date.slice(0, 8)}01`).length;
  patterns.push({ id: "recovery-speed", title: "Recovery trend", detail: overdue ? `${overdue} unfinished session${overdue === 1 ? "" : "s"} need a recovery decision; ${recoveryCount} recovery restart${recoveryCount === 1 ? "" : "s"} are recorded this month.` : `${recoveryCount} recovery restart${recoveryCount === 1 ? "" : "s"} recorded this month with no current backlog.`, action: overdue ? "Open Review and restart one block." : "Use Review before adding more work.", severity: overdue ? "attention" : "neutral" });
  return patterns;
}
