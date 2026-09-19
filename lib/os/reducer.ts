import { rebuildDerivedState } from "./derived.ts";
import type { CompletionEvent, OSAction, OSState, Session } from "./types.ts";

function withTimestamp(state: OSState, updatedAt: string): OSState {
  return { ...state, updatedAt };
}

function addEvent(state: OSState, event: CompletionEvent): OSState {
  if (state.completionEvents.some((candidate) => candidate.id === event.id)) return state;
  return { ...state, completionEvents: [...state.completionEvents, event] };
}

export function reduceOSState(state: OSState, action: OSAction): OSState {
  switch (action.type) {
    case "goal/add":
      if (state.goals[action.goal.id]) return state;
      return rebuildDerivedState({ ...state, goals: { ...state.goals, [action.goal.id]: action.goal }, updatedAt: action.goal.updatedAt });
    case "roadmap/add": {
      if (state.roadmaps[action.roadmap.id] || !state.goals[action.roadmap.goalId]) return state;
      const goal = state.goals[action.roadmap.goalId];
      const nextGoal = { ...goal, roadmapIds: [...new Set([...goal.roadmapIds, action.roadmap.id])], updatedAt: action.roadmap.updatedAt };
      return rebuildDerivedState({ ...state, goals: { ...state.goals, [goal.id]: nextGoal }, roadmaps: { ...state.roadmaps, [action.roadmap.id]: action.roadmap }, updatedAt: action.roadmap.updatedAt });
    }
    case "milestone/add": {
      if (state.milestones[action.milestone.id] || !state.roadmaps[action.milestone.roadmapId]) return state;
      const roadmap = state.roadmaps[action.milestone.roadmapId];
      const nextRoadmap = { ...roadmap, milestoneIds: [...new Set([...roadmap.milestoneIds, action.milestone.id])], updatedAt: action.milestone.updatedAt };
      return rebuildDerivedState({ ...state, roadmaps: { ...state.roadmaps, [roadmap.id]: nextRoadmap }, milestones: { ...state.milestones, [action.milestone.id]: action.milestone }, updatedAt: action.milestone.updatedAt });
    }
    case "task/add": {
      if (state.tasks[action.task.id] || !state.milestones[action.task.milestoneId]) return state;
      const milestone = state.milestones[action.task.milestoneId];
      const nextMilestone = { ...milestone, taskIds: [...new Set([...milestone.taskIds, action.task.id])], updatedAt: action.task.updatedAt };
      return rebuildDerivedState({ ...state, milestones: { ...state.milestones, [milestone.id]: nextMilestone }, tasks: { ...state.tasks, [action.task.id]: action.task }, updatedAt: action.task.updatedAt });
    }
    case "session/schedule": {
      if (state.sessions[action.session.id] || !state.tasks[action.session.taskId]) return state;
      const task = state.tasks[action.session.taskId];
      const nextTask = { ...task, sessionIds: [...new Set([...task.sessionIds, action.session.id])], updatedAt: action.session.updatedAt };
      return rebuildDerivedState({ ...state, tasks: { ...state.tasks, [task.id]: nextTask }, sessions: { ...state.sessions, [action.session.id]: action.session }, updatedAt: action.session.updatedAt });
    }
    case "session/start": {
      const session = state.sessions[action.sessionId];
      if (!session || session.status === "completed" || session.status === "skipped") return state;
      const nextSession: Session = { ...session, status: "in-progress", startedAt: session.startedAt ?? action.occurredAt, updatedAt: action.occurredAt };
      return rebuildDerivedState(withTimestamp({ ...state, sessions: { ...state.sessions, [session.id]: nextSession } }, action.occurredAt));
    }
    case "session/complete": {
      const session = state.sessions[action.sessionId];
      if (!session || session.status === "completed" || session.status === "skipped") return state;
      const nextSession: Session = { ...session, status: "completed", startedAt: session.startedAt ?? action.occurredAt, completedAt: action.occurredAt, note: action.note ?? session.note, updatedAt: action.occurredAt };
      const withSession = withTimestamp({ ...state, sessions: { ...state.sessions, [session.id]: nextSession } }, action.occurredAt);
      return rebuildDerivedState(addEvent(withSession, {
        id: `${session.id}:completed`,
        kind: "session-completed",
        occurredAt: action.occurredAt,
        taskId: session.taskId,
        sessionId: session.id,
        value: action.value,
        note: action.note,
      }));
    }
    case "task/complete": {
      const task = state.tasks[action.taskId];
      if (!task || task.status === "completed" || task.status === "cancelled") return state;
      const nextTask = { ...task, status: "completed" as const, updatedAt: action.occurredAt };
      const withTask = withTimestamp({ ...state, tasks: { ...state.tasks, [task.id]: nextTask } }, action.occurredAt);
      const goal = Object.values(state.roadmaps).map((roadmap) => state.goals[roadmap.goalId]).find((candidate) => candidate && roadmapForTask(state, task.id)?.goalId === candidate.id);
      return rebuildDerivedState(addEvent(withTask, {
        id: `${task.id}:completed`,
        kind: "task-completed",
        occurredAt: action.occurredAt,
        goalId: goal?.id,
        taskId: task.id,
        note: action.note,
      }));
    }
    case "goal/progress": {
      const goal = state.goals[action.goalId];
      if (!goal || !Number.isFinite(action.current)) return state;
      const current = Math.max(goal.baseline, action.current);
      const nextGoal = { ...goal, current, status: current >= goal.target ? "completed" as const : goal.status, updatedAt: action.occurredAt };
      const withGoal = withTimestamp({ ...state, goals: { ...state.goals, [goal.id]: nextGoal } }, action.occurredAt);
      return rebuildDerivedState(addEvent(withGoal, { id: `${goal.id}:progress:${action.occurredAt}`, kind: "goal-progressed", occurredAt: action.occurredAt, goalId: goal.id, value: current, note: action.note }));
    }
  }
}

function roadmapForTask(state: OSState, taskId: string) {
  const milestone = Object.values(state.milestones).find((candidate) => candidate.taskIds.includes(taskId));
  if (!milestone) return null;
  return Object.values(state.roadmaps).find((roadmap) => roadmap.milestoneIds.includes(milestone.id)) ?? null;
}
