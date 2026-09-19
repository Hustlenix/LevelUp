import type { Pillar } from "../types.ts";

export const OS_SCHEMA_VERSION = 1 as const;

export type GoalStatus = "active" | "paused" | "completed" | "archived";
export type RoadmapStatus = "active" | "paused" | "completed" | "archived";
export type MilestoneStatus = "active" | "completed" | "skipped";
export type TaskStatus = "todo" | "in-progress" | "completed" | "cancelled";
export type TaskKind = "action" | "study" | "focus" | "protocol" | "review" | "reflection" | "custom";
export type SessionStatus = "planned" | "in-progress" | "completed" | "skipped";
export type MetricKind = "count" | "minutes" | "boolean" | "score";
export type MasteryLevel = "unstarted" | "emerging" | "developing" | "established" | "mastery";
export type CompletionEventKind = "session-completed" | "task-completed" | "goal-progressed";

export interface GoalMetric {
  kind: MetricKind;
  label: string;
  unit?: string;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  pillar?: Pillar;
  metric: GoalMetric;
  baseline: number;
  target: number;
  current: number;
  deadline: string | null;
  nextAction: string;
  roadmapIds: string[];
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Roadmap {
  id: string;
  goalId: string;
  title: string;
  phase: number;
  startDate?: string | null;
  endDate?: string | null;
  milestoneIds: string[];
  status: RoadmapStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  roadmapId: string;
  title: string;
  description?: string;
  order: number;
  taskIds: string[];
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  kind: TaskKind;
  order: number;
  dueDate?: string | null;
  estimatedMinutes?: number;
  sessionIds: string[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  taskId: string;
  date: string;
  plannedMinutes: number;
  status: SessionStatus;
  startedAt?: string;
  completedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompletionEvent {
  id: string;
  kind: CompletionEventKind;
  occurredAt: string;
  goalId?: string;
  taskId?: string;
  sessionId?: string;
  value?: number;
  note?: string;
}

export interface SessionProgress {
  status: SessionStatus;
  completionPct: number;
  completedAt: string | null;
}

export interface TaskProgress {
  totalSessions: number;
  completedSessions: number;
  completionPct: number;
  lastCompletedAt: string | null;
}

export interface MilestoneProgress {
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

export interface GoalProgress {
  totalMilestones: number;
  completedMilestones: number;
  milestonePct: number;
  baseline: number;
  target: number;
  current: number;
  metricPct: number;
  completionPct: number;
  lastCompletedAt: string | null;
}

export interface ProgressState {
  goals: Record<string, GoalProgress>;
  milestones: Record<string, MilestoneProgress>;
  tasks: Record<string, TaskProgress>;
  sessions: Record<string, SessionProgress>;
}

export interface GoalMastery {
  score: number;
  level: MasteryLevel;
  evidenceCount: number;
  lastEvidenceAt: string | null;
}

export interface MasteryState {
  goals: Record<string, GoalMastery>;
}

export interface OSState {
  schemaVersion: typeof OS_SCHEMA_VERSION;
  updatedAt: string;
  goals: Record<string, Goal>;
  roadmaps: Record<string, Roadmap>;
  milestones: Record<string, Milestone>;
  tasks: Record<string, Task>;
  sessions: Record<string, Session>;
  completionEvents: CompletionEvent[];
  progress: ProgressState;
  mastery: MasteryState;
}

export type OSAction =
  | { type: "goal/add"; goal: Goal }
  | { type: "roadmap/add"; roadmap: Roadmap }
  | { type: "milestone/add"; milestone: Milestone }
  | { type: "task/add"; task: Task }
  | { type: "session/schedule"; session: Session }
  | { type: "session/start"; sessionId: string; occurredAt: string }
  | { type: "session/complete"; sessionId: string; occurredAt: string; note?: string; value?: number }
  | { type: "task/complete"; taskId: string; occurredAt: string; note?: string }
  | { type: "goal/progress"; goalId: string; current: number; occurredAt: string; note?: string };

export function typeGoal(input: Omit<Goal, "roadmapIds"> & Partial<Pick<Goal, "roadmapIds">>): Goal {
  return { roadmapIds: [], ...input };
}

export function typeRoadmap(input: Roadmap): Roadmap {
  return input.milestoneIds ? input : { ...input, milestoneIds: [] };
}

export function typeMilestone(input: Milestone): Milestone {
  return input.taskIds ? input : { ...input, taskIds: [] };
}

export function typeTask(input: Task): Task {
  return input.sessionIds ? input : { ...input, sessionIds: [] };
}

export function typeSession(input: Session): Session {
  return { ...input };
}
