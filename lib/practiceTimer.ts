export interface PracticeTimerState {
  phase: "focus" | "break";
  round: number;
  focusMinutes: 10 | 25;
  remainingMs: number;
  deadline: number | null;
  started: boolean;
}

export function createPracticeTimer(focusMinutes: 10 | 25 = 25): PracticeTimerState {
  return { phase: "focus", round: 1, focusMinutes, remainingMs: focusMinutes * 60_000, deadline: null, started: false };
}

export function remainingTime(state: PracticeTimerState, now: number): number {
  return Math.max(0, state.deadline === null ? state.remainingMs : state.deadline - now);
}

export function startTimer(state: PracticeTimerState, now: number): PracticeTimerState {
  if (state.deadline !== null || state.remainingMs <= 0) return state;
  return { ...state, deadline: now + state.remainingMs, started: true };
}

export function pauseTimer(state: PracticeTimerState, now: number): PracticeTimerState {
  return { ...state, remainingMs: remainingTime(state, now), deadline: null };
}

/** A clock expiring never starts a new phase or awards completion automatically. */
export function nextTimerPhase(state: PracticeTimerState): PracticeTimerState {
  const phase = state.phase === "focus" ? "break" : "focus";
  const round = state.phase === "break" ? state.round + 1 : state.round;
  const minutes = phase === "focus" ? state.focusMinutes : state.round % 4 === 0 ? 15 : state.focusMinutes === 10 ? 2 : 5;
  return { ...state, phase, round, remainingMs: minutes * 60_000, deadline: null, started: false };
}
