import { readOSState } from "../os/store.ts";
import type { OSState } from "../os/types.ts";
import { deriveTimeOfDay, localDate } from "./behaviour.ts";
import { stepCompanion } from "./reducer.ts";
import { readCompanionSettings } from "./settings.ts";
import { browserStorage, readCompanionState, updateCompanionState } from "./store.ts";
import {
  COMPANION_PENDING_KEY,
  COMPANION_PENDING_MAX,
  type CompanionEvent,
  type CompanionEventKind,
  type CompanionReaction,
  type PumpResult,
  type StepContext,
  type StorageLike,
} from "./types.ts";
import type { Pillar } from "../types.ts";

export const COMPANION_EVENT_SIGNAL = "levelup:companion-event";
let pendingSeq = 0;

/** Emit a companion event into the pending queue (client-side adapters). */
export function emitCompanionEvent(
  kind: CompanionEventKind,
  options: { value?: number; note?: string; pillar?: Pillar } = {},
  storage: StorageLike | null = browserStorage()
): void {
  if (!storage) return;
  const event: CompanionEvent = { id: `${kind}:${Date.now()}:${pendingSeq++}`, kind, occurredAt: new Date().toISOString(), ...options };
  const queue = readPending(storage);
  queue.push(event);
  if (queue.length > COMPANION_PENDING_MAX) queue.splice(0, queue.length - COMPANION_PENDING_MAX);
  writePending(queue, storage);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COMPANION_EVENT_SIGNAL, { detail: { kind } }));
  }
}

function readPending(storage: StorageLike): CompanionEvent[] {
  try {
    const raw = storage.getItem(COMPANION_PENDING_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CompanionEvent =>
        !!entry &&
        typeof entry.id === "string" &&
        typeof entry.kind === "string" &&
        typeof entry.occurredAt === "string"
    );
  } catch {
    return [];
  }
}

function writePending(events: CompanionEvent[], storage: StorageLike): void {
  try {
    storage.setItem(COMPANION_PENDING_KEY, JSON.stringify(events.slice(-COMPANION_PENDING_MAX)));
  } catch {
    // non-fatal: pending events are transient
  }
}

function countCompletedMilestones(os: OSState): number {
  let count = 0;
  for (const milestone of Object.values(os.milestones)) if (milestone.status === "completed") count += 1;
  return count;
}

/** Map one OS completion journal entry into companion events (1-2 per entry). */
function mapOSCompletion(event: {
  id: string;
  kind: string;
  occurredAt: string;
  goalId?: string;
  taskId?: string;
  sessionId?: string;
  value?: number;
  note?: string;
}, os: OSState): CompanionEvent[] {
  const base = { occurredAt: event.occurredAt, ...(typeof event.note === "string" ? { note: event.note } : {}) };
  switch (event.kind) {
    case "session-completed": {
      const session = event.sessionId ? os.sessions[event.sessionId] : undefined;
      const minutes = session?.elapsedSeconds != null
        ? Math.max(1, Math.round(session.elapsedSeconds / 60))
        : typeof event.value === "number"
          ? Math.max(1, event.value)
          : 1;
      return [{ id: `os:${event.id}`, kind: "focus_completed", value: minutes, ...base }];
    }
    case "session-interrupted": {
      const session = event.sessionId ? os.sessions[event.sessionId] : undefined;
      return [{ id: `os:${event.id}`, kind: "focus_interrupted", ...(typeof event.value === "number" ? { value: event.value } : session?.interruptedSeconds != null ? { value: session.interruptedSeconds } : {}), ...base }];
    }
    case "recovery-started":
      return [{ id: `os:${event.id}`, kind: "session_recovered", ...base }];
    case "task-completed":
      return [{ id: `os:${event.id}`, kind: "task_completed", ...base }];
    case "goal-progressed": {
      const goal = event.goalId ? os.goals[event.goalId] : undefined;
      const out: CompanionEvent[] = [{ id: `os:${event.id}`, kind: "goal_progressed", ...(typeof event.value === "number" ? { value: event.value } : goal?.current != null ? { value: goal.current } : {}), ...base }];
      if (goal && typeof goal.target === "number" && goal.current >= goal.target) {
        out.push({ id: `os:${event.id}:goal-completed`, kind: "goal_completed", ...(typeof goal.pillar === "string" ? { pillar: goal.pillar } : {}), ...base });
      }
      return out;
    }
    case "review-completed":
      return [{ id: `os:${event.id}`, kind: "day_completed", ...base }];
    default:
      return [];
  }
}

export interface PumpOptions {
  now?: Date;
  osState?: OSState;
  storage?: StorageLike | null;
  pillarChapters?: StepContext["pillarChapters"];
  roadmap90dComplete?: boolean;
}

/**
 * Reconcile OS state + pending queue into the companion state.
 * Deterministic: same inputs, same seed => same result. Replay-safe by event id.
 */
export function pumpCompanion(options: PumpOptions = {}): PumpResult {
  const storage = options.storage ?? browserStorage();
  if (!storage) return { state: readCompanionState(null), reactions: [], events: [], skipped: true };

  const now = options.now ?? new Date();
  const settings = readCompanionSettings(storage);
  const state = readCompanionState(storage);
  const ctx: StepContext = { now, timeOfDay: deriveTimeOfDay(now), pillarChapters: options.pillarChapters, roadmap90dComplete: options.roadmap90dComplete };

  if (!settings.enabled) return { state, reactions: [], events: [], skipped: true };

  const os = options.osState ?? readOSState(storage);
  const events: CompanionEvent[] = [];

  // App open / reunion (once per local day).
  const today = localDate(now);
  if (state.adapter.lastAppOpenDate !== today) {
    const lastSeenMs = Date.parse(state.lastSeenAt);
    const gapHours = (now.getTime() - lastSeenMs) / (60 * 60 * 1000);
    if (!Number.isNaN(lastSeenMs) && gapHours >= 4) {
      events.push({ id: `returned_after_absence:${state.lastSeenAt}->${today}`, kind: "returned_after_absence", occurredAt: now.toISOString(), value: Math.floor(gapHours) });
    } else {
      events.push({ id: `app_opened:${today}`, kind: "app_opened", occurredAt: now.toISOString() });
    }
  }

  // New OS completion events since the last pump.
  const tail = os.completionEvents.slice(state.adapter.lastOSEventIndex);
  for (const completion of tail) events.push(...mapOSCompletion(completion, os));

  // Milestones completed since the last pump (id per milestone -> replay-safe).
  const completedMilestones = countCompletedMilestones(os);
  if (completedMilestones > state.adapter.seenMilestoneCount) {
    for (const milestone of Object.values(os.milestones)) {
      if (milestone.status !== "completed") continue;
      const id = `os:milestone:${milestone.id}`;
      if (state.journal.some((item) => item.id === id)) continue;
      events.push({ id, kind: "roadmap_milestone", occurredAt: milestone.updatedAt, value: completedMilestones });
    }
  }

  // Pending adapter events (chokepoints / interactions).
  const pending = readPending(storage);
  events.push(...pending);

  if (events.length === 0) return { state, reactions: [], events, skipped: false };

  // Reduce in merge order: app/reunion -> os tail -> milestones -> pending.
  let current = state;
  const reactions: CompanionReaction[] = [];
  for (const event of events) {
    const result = stepCompanion(current, event, ctx);
    current = result.state;
    reactions.push(...result.reactions);
  }

  // Advance the adapter so the same events never re-emit; write once, atomically.
  current = {
    ...current,
    adapter: {
      lastOSEventIndex: os.completionEvents.length,
      seenMilestoneCount: Math.max(state.adapter.seenMilestoneCount, completedMilestones),
      lastAppOpenDate: today,
    },
  };

  const filtered = reactions.filter((reaction) => {
    if (settings.motion === "off" && (reaction.kind === "pose" || reaction.kind === "emote")) return false;
    if (settings.motion === "reduced" && reaction.priority >= 5) return false;
    if (settings.dialogue === "off" && reaction.kind === "dialogue") return false;
    if (settings.dialogue === "minimal" && reaction.kind === "dialogue" && reaction.priority > 1) return false;
    return true;
  });

  const written = updateCompanionState(current, storage);
  if (written && pending.length > 0) writePending([], storage);

  return { state: current, reactions: filtered, events, skipped: false };
}