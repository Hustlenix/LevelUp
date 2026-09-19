import { rebuildDerivedState } from "./derived.ts";
import {
  OS_SCHEMA_VERSION,
  type CompletionEvent,
  type Goal,
  type Milestone,
  type OSState,
  type Roadmap,
  type Session,
  type Task,
  type GoalStatus,
  type RoadmapStatus,
  type MilestoneStatus,
  type TaskStatus,
  type TaskKind,
  type SessionStatus,
} from "./types.ts";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function mapValues<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const object = record(value);
  return object ? Object.values(object) as T[] : [];
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeGoal(value: unknown): Goal | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.title !== "string") return null;
  const metric = record(input.metric);
  return {
    id: input.id,
    title: input.title,
    why: stringValue(input.why, ""),
    ...(typeof input.pillar === "string" ? { pillar: input.pillar as Goal["pillar"] } : {}),
    metric: metric && typeof metric.kind === "string" && typeof metric.label === "string" ? metric as unknown as Goal["metric"] : { kind: "count", label: "progress" },
    baseline: typeof input.baseline === "number" ? input.baseline : 0,
    target: typeof input.target === "number" ? input.target : 1,
    current: typeof input.current === "number" ? input.current : 0,
    deadline: typeof input.deadline === "string" ? input.deadline : null,
    nextAction: stringValue(input.nextAction, "Choose the next small action."),
    roadmapIds: Array.isArray(input.roadmapIds) ? input.roadmapIds.filter((id): id is string => typeof id === "string") : [],
    status: (input.status as GoalStatus) ?? "active",
    createdAt: stringValue(input.createdAt, "1970-01-01T00:00:00.000Z"),
    updatedAt: stringValue(input.updatedAt, "1970-01-01T00:00:00.000Z"),
  };
}

function normalizeRoadmap(value: unknown): Roadmap | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.goalId !== "string" || typeof input.title !== "string") return null;
  return { id: input.id, goalId: input.goalId, title: input.title, phase: typeof input.phase === "number" ? input.phase : 1, ...(typeof input.startDate === "string" ? { startDate: input.startDate } : {}), ...(typeof input.endDate === "string" ? { endDate: input.endDate } : {}), milestoneIds: Array.isArray(input.milestoneIds) ? input.milestoneIds.filter((id): id is string => typeof id === "string") : [], status: (input.status as RoadmapStatus) ?? "active", createdAt: stringValue(input.createdAt, "1970-01-01T00:00:00.000Z"), updatedAt: stringValue(input.updatedAt, "1970-01-01T00:00:00.000Z") };
}

function normalizeMilestone(value: unknown): Milestone | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.roadmapId !== "string" || typeof input.title !== "string") return null;
  return { id: input.id, roadmapId: input.roadmapId, title: input.title, ...(typeof input.description === "string" ? { description: input.description } : {}), order: typeof input.order === "number" ? input.order : 1, taskIds: Array.isArray(input.taskIds) ? input.taskIds.filter((id): id is string => typeof id === "string") : [], status: (input.status as MilestoneStatus) ?? "active", createdAt: stringValue(input.createdAt, "1970-01-01T00:00:00.000Z"), updatedAt: stringValue(input.updatedAt, "1970-01-01T00:00:00.000Z") };
}

function normalizeTask(value: unknown): Task | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.milestoneId !== "string" || typeof input.title !== "string") return null;
  return { id: input.id, milestoneId: input.milestoneId, title: input.title, ...(typeof input.description === "string" ? { description: input.description } : {}), kind: (input.kind as TaskKind) ?? "custom", order: typeof input.order === "number" ? input.order : 1, ...(typeof input.dueDate === "string" ? { dueDate: input.dueDate } : {}), ...(typeof input.estimatedMinutes === "number" ? { estimatedMinutes: input.estimatedMinutes } : {}), sessionIds: Array.isArray(input.sessionIds) ? input.sessionIds.filter((id): id is string => typeof id === "string") : [], status: (input.status as TaskStatus) ?? "todo", createdAt: stringValue(input.createdAt, "1970-01-01T00:00:00.000Z"), updatedAt: stringValue(input.updatedAt, "1970-01-01T00:00:00.000Z") };
}

function normalizeSession(value: unknown): Session | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.taskId !== "string" || typeof input.date !== "string") return null;
  return { id: input.id, taskId: input.taskId, date: input.date, plannedMinutes: typeof input.plannedMinutes === "number" ? input.plannedMinutes : 0, status: (input.status as SessionStatus) ?? "planned", ...(typeof input.startedAt === "string" ? { startedAt: input.startedAt } : {}), ...(typeof input.completedAt === "string" ? { completedAt: input.completedAt } : {}), ...(typeof input.note === "string" ? { note: input.note } : {}), createdAt: stringValue(input.createdAt, "1970-01-01T00:00:00.000Z"), updatedAt: stringValue(input.updatedAt, "1970-01-01T00:00:00.000Z") };
}

function emptyState(now: string): OSState {
  return { schemaVersion: OS_SCHEMA_VERSION, updatedAt: now, goals: {}, roadmaps: {}, milestones: {}, tasks: {}, sessions: {}, completionEvents: [], progress: { goals: {}, milestones: {}, tasks: {}, sessions: {} }, mastery: { goals: {} } };
}

export function createEmptyOSState(now = new Date().toISOString()): OSState {
  return emptyState(now);
}

export function validateOSState(value: unknown): { ok: boolean; errors: string[]; state?: OSState } {
  const input = record(value);
  const errors: string[] = [];
  if (!input || input.schemaVersion !== OS_SCHEMA_VERSION) return { ok: false, errors: ["osState.schemaVersion is unsupported."] };
  for (const key of ["goals", "roadmaps", "milestones", "tasks", "sessions", "progress", "mastery"]) if (!record(input[key])) errors.push(`osState.${key} must be an object.`);
  if (!Array.isArray(input.completionEvents)) errors.push("osState.completionEvents must be an array.");
  if (typeof input.updatedAt !== "string") errors.push("osState.updatedAt must be a string.");
  const goals = record(input.goals);
  const roadmaps = record(input.roadmaps);
  const milestones = record(input.milestones);
  const tasks = record(input.tasks);
  const sessions = record(input.sessions);
  if (goals) {
    for (const [id, value] of Object.entries(goals)) {
      const goal = record(value);
      if (!goal || goal.id !== id || typeof goal.title !== "string" || !record(goal.metric) || !stringArray(goal.roadmapIds)) errors.push(`osState.goals.${id} has an invalid shape.`);
    }
  }
  if (roadmaps) {
    for (const [id, value] of Object.entries(roadmaps)) {
      const roadmap = record(value);
      if (!roadmap || roadmap.id !== id || typeof roadmap.goalId !== "string" || typeof roadmap.title !== "string" || !stringArray(roadmap.milestoneIds) || !goals?.[roadmap.goalId]) errors.push(`osState.roadmaps.${id} has an invalid shape.`);
    }
  }
  if (milestones) {
    for (const [id, value] of Object.entries(milestones)) {
      const milestone = record(value);
      if (!milestone || milestone.id !== id || typeof milestone.roadmapId !== "string" || typeof milestone.title !== "string" || !stringArray(milestone.taskIds) || !roadmaps?.[milestone.roadmapId]) errors.push(`osState.milestones.${id} has an invalid shape.`);
    }
  }
  if (tasks) {
    for (const [id, value] of Object.entries(tasks)) {
      const task = record(value);
      if (!task || task.id !== id || typeof task.milestoneId !== "string" || typeof task.title !== "string" || !stringArray(task.sessionIds) || !milestones?.[task.milestoneId]) errors.push(`osState.tasks.${id} has an invalid shape.`);
    }
  }
  if (sessions) {
    for (const [id, value] of Object.entries(sessions)) {
      const session = record(value);
      if (!session || session.id !== id || typeof session.taskId !== "string" || typeof session.date !== "string" || typeof session.plannedMinutes !== "number" || !tasks?.[session.taskId]) errors.push(`osState.sessions.${id} has an invalid shape.`);
    }
  }
  if (Array.isArray(input.completionEvents)) {
    for (const event of input.completionEvents) {
      const completion = record(event);
      if (!completion || typeof completion.id !== "string" || typeof completion.kind !== "string" || typeof completion.occurredAt !== "string") errors.push("osState.completionEvents has an invalid entry.");
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], state: rebuildDerivedState(input as unknown as OSState) };
}

export function migrateOSState(value: unknown, now = new Date().toISOString()): { ok: boolean; migrated: boolean; errors: string[]; state: OSState } {
  const current = validateOSState(value);
  if (current.ok && current.state) return { ok: true, migrated: false, errors: [], state: current.state };
  const input = record(value);
  if (input && (input.schemaVersion === 0 || input.schemaVersion === undefined)) {
    const state = emptyState(now);
    for (const goal of mapValues<unknown>(input.goals)) { const normalized = normalizeGoal(goal); if (normalized) state.goals[normalized.id] = normalized; }
    for (const roadmap of mapValues<unknown>(input.roadmaps)) { const normalized = normalizeRoadmap(roadmap); if (normalized) state.roadmaps[normalized.id] = normalized; }
    for (const milestone of mapValues<unknown>(input.milestones)) { const normalized = normalizeMilestone(milestone); if (normalized) state.milestones[normalized.id] = normalized; }
    for (const task of mapValues<unknown>(input.tasks)) { const normalized = normalizeTask(task); if (normalized) state.tasks[normalized.id] = normalized; }
    for (const session of mapValues<unknown>(input.sessions)) { const normalized = normalizeSession(session); if (normalized) state.sessions[normalized.id] = normalized; }
    state.completionEvents = mapValues<CompletionEvent>(input.completionEvents).filter((event) => typeof event.id === "string" && typeof event.occurredAt === "string");
    const normalizedState = rebuildDerivedState(state);
    const checked = validateOSState(normalizedState);
    return checked.ok && checked.state ? { ok: true, migrated: true, errors: [], state: checked.state } : { ok: false, migrated: true, errors: checked.errors, state: emptyState(now) };
  }
  return { ok: false, migrated: false, errors: current.errors, state: emptyState(now) };
}
