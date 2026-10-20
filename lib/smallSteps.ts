export const SMALL_STEPS_KEY = "levelup-small-steps-v1";
export type StepPhase = "ready" | "running" | "paused" | "ended";
export interface SavedAction { id: string; task: string; actions: string[]; current: number; minutes: number; restart: string; source: string }
export function isSavedAction(value: unknown): value is SavedAction {
  if (!value || typeof value !== "object") return false;
  const a = value as SavedAction;
  return text(a.id, 100) && !!a.id && text(a.task, 240) && !!a.task.trim() && Array.isArray(a.actions) && a.actions.length > 0 && a.actions.length <= 3 && a.actions.every(s => text(s, 240)) && Number.isInteger(a.current) && a.current >= 0 && a.current < a.actions.length && [2, 5, 10, 15].includes(a.minutes) && text(a.restart, 500) && text(a.source, 150) && (a.source === "" || /^\/(chapters\/[a-z0-9-]+|protocols)\/$/.test(a.source));
}
export interface StepAttempt { id: string; task: string; action: string; seconds: number; minutes: number; date: string; completedAt: number }
export interface SmallStepsState {
  version: 1; task: string; actions: string[]; current: number; minutes: number;
  phase: StepPhase; elapsed: number; startedAt: number | null; attemptId: string;
  later: string; restart: string; history: StepAttempt[];
  queue?: SavedAction[];
  source?: string;
}
export const emptySmallSteps = (): SmallStepsState => ({ version: 1, task: "", actions: [""], current: 0, minutes: 5, phase: "ready", elapsed: 0, startedAt: null, attemptId: "", later: "", restart: "", history: [] });
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const number = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export function isSmallSteps(v: unknown): v is SmallStepsState {
  if (!v || typeof v !== "object") return false;
  const s = v as SmallStepsState;
  if (s.queue !== undefined && (!Array.isArray(s.queue) || s.queue.length > 20 || !s.queue.every(isSavedAction) || new Set(s.queue.map(a => a.id)).size !== s.queue.length)) return false;
  if (s.source !== undefined && (typeof s.source !== "string" || (s.source !== "" && !/^\/(chapters\/[a-z0-9-]+|protocols)\/$/.test(s.source)))) return false;
  return s.version === 1 && text(s.task, 240) && Array.isArray(s.actions) && s.actions.length >= 1 && s.actions.length <= 3 && s.actions.every(a => text(a, 240)) && Number.isInteger(s.current) && s.current >= 0 && s.current < s.actions.length && [2, 5, 10, 15].includes(s.minutes) && ["ready", "running", "paused", "ended"].includes(s.phase) && number(s.elapsed, s.minutes * 60) && (s.startedAt === null || number(s.startedAt)) && (s.phase === "running" ? s.startedAt !== null && !!s.attemptId : s.startedAt === null) && text(s.attemptId, 100) && text(s.later, 2000) && text(s.restart, 500) && Array.isArray(s.history) && s.history.length <= 100 && s.history.every(h => h && text(h.id, 100) && !!h.id && text(h.task, 240) && text(h.action, 240) && number(h.seconds, 900) && [2, 5, 10, 15].includes(h.minutes) && h.seconds <= h.minutes * 60 && text(h.date, 10) && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && number(h.completedAt)) && new Set(s.history.map(h => h.id)).size === s.history.length;
}
export function elapsedSeconds(s: SmallStepsState, now: number) {
  return Math.min(s.minutes * 60, s.elapsed + (s.startedAt === null ? 0 : Math.max(0, (now - s.startedAt) / 1000)));
}
export function restoreSmallSteps(s: SmallStepsState): SmallStepsState {
  // Time away is never counted. Only the most recent saved foreground tick survives.
  return { ...s, phase: s.phase === "running" ? "paused" : s.phase, startedAt: null };
}
export type StepEvent =
  | { type: "queue/add"; action: SavedAction }
  | { type: "queue/remove"; id: string }
  | { type: "queue/first"; id: string }
  | { type: "queue/select"; id: string; parkedId: string }
  | { type: "edit"; patch: Partial<Pick<SmallStepsState, "task" | "actions" | "minutes" | "later" | "restart">> }
  | { type: "start"; now: number; id: string }
  | { type: "tick" | "pause" | "end"; now: number }
  | { type: "finish"; now: number; choice: "done" | "continue" | "later" };
export function transitionSmallSteps(s: SmallStepsState, event: StepEvent): SmallStepsState {
  const queue = s.queue ?? [];
  if (event.type === "queue/add") {
    if (!isSavedAction(event.action) || queue.length >= 20 || queue.some(a => a.id === event.action.id || (a.task === event.action.task && a.source === event.action.source))) return s;
    return { ...s, queue: [...queue, event.action] };
  }
  if (event.type === "queue/remove") return { ...s, queue: queue.filter(a => a.id !== event.id) };
  if (event.type === "queue/first") {
    const action = queue.find(a => a.id === event.id);
    return action ? { ...s, queue: [action, ...queue.filter(a => a.id !== event.id)] } : s;
  }
  if (event.type === "queue/select") {
    const action = queue.find(a => a.id === event.id);
    if (!action || s.phase !== "ready") return s;
    const nextQueue = queue.filter(a => a.id !== event.id);
    if (s.task.trim() || s.actions.some(action => action.trim()) || s.restart.trim()) {
      const parked = { id: event.parkedId, task: s.task.trim() ? s.task : "Untitled action", actions: s.actions, current: s.current, minutes: s.minutes, restart: s.restart, source: s.source ?? "" };
      if (!isSavedAction(parked) || nextQueue.some(a => a.id === parked.id)) return s;
      nextQueue.push(parked);
    }
    return { ...s, task: action.task, actions: action.actions, current: action.current, minutes: action.minutes, restart: action.restart, source: action.source, queue: nextQueue, elapsed: 0, attemptId: "", startedAt: null };
  }
  if (event.type === "edit") {
    const patch = { ...event.patch };
    if (s.phase !== "ready") { delete patch.task; delete patch.minutes; }
    const next = { ...s, ...patch };
    return isSmallSteps(next) ? next : s;
  }
  if (event.type === "start") {
    if (!s.task.trim() || !s.actions[s.current]?.trim() || s.phase === "running" || s.phase === "ended") return s;
    return { ...s, phase: "running", startedAt: event.now, attemptId: s.attemptId || event.id };
  }
  if (event.type === "finish") {
    if (s.phase !== "ended" && s.phase !== "paused") return s;
    const date = new Date(event.now);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const record: StepAttempt = { id: s.attemptId, task: s.task, action: s.actions[s.current], seconds: Math.floor(s.elapsed), minutes: s.minutes, date: day, completedAt: event.now };
    const history = record.seconds > 0 && record.id && !s.history.some(h => h.id === record.id) ? [record, ...s.history].slice(0, 100) : s.history;
    const next = { ...s, phase: "ready" as const, elapsed: 0, startedAt: null, attemptId: "", history };
    if (event.choice === "done") return s.current + 1 < s.actions.length ? { ...next, current: s.current + 1 } : { ...emptySmallSteps(), minutes: s.minutes, later: s.later, history, queue };
    return next;
  }
  if (s.phase !== "running" && event.type !== "end") return s;
  const elapsed = elapsedSeconds(s, event.now);
  const phase = event.type === "end" || elapsed >= s.minutes * 60 ? "ended" : event.type === "pause" ? "paused" : "running";
  return { ...s, elapsed, phase, startedAt: phase === "running" ? event.now : null };
}
export const STEP_EXAMPLES = [
  { task: "Start my homework", actions: ["Put the assignment in front of me", "Read the first question", "Write one thing I know about it"] },
  { task: "Read a little", actions: ["Open the page I want to read", "Read one paragraph", "Write a few words about it"] },
  { task: "Tidy my space", actions: ["Choose one small surface", "Put one item where it belongs", "Put away two more items"] },
  { task: "Reply to a message", actions: ["Open the message", "Write a rough first sentence", "Read it once and send when ready"] },
];
