import type {
  GoalMastery,
  GoalProgress,
  MasteryLevel,
  MilestoneProgress,
  OSState,
  ProgressState,
  SessionProgress,
  TaskProgress,
} from "./types.ts";

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function metricPct(current: number, baseline: number, target: number): number {
  if (target <= baseline) return current >= target ? 100 : 0;
  return clampPct(((current - baseline) / (target - baseline)) * 100);
}

function masteryLevel(score: number): MasteryLevel {
  if (score >= 100) return "mastery";
  if (score >= 75) return "established";
  if (score >= 50) return "developing";
  if (score > 0) return "emerging";
  return "unstarted";
}

function latest(values: Array<string | undefined>): string | null {
  return values.filter((value): value is string => !!value).sort().at(-1) ?? null;
}

export function rebuildDerivedState(state: OSState): OSState {
  const sessions: Record<string, SessionProgress> = {};
  for (const session of Object.values(state.sessions)) {
    sessions[session.id] = {
      status: session.status,
      completionPct: session.status === "completed" ? 100 : 0,
      completedAt: session.completedAt ?? null,
    };
  }

  const tasks: Record<string, TaskProgress> = {};
  for (const task of Object.values(state.tasks)) {
    const taskSessions = task.sessionIds.map((id) => state.sessions[id]).filter(Boolean);
    const completedSessions = taskSessions.filter((session) => session.status === "completed");
    tasks[task.id] = {
      totalSessions: taskSessions.length,
      completedSessions: completedSessions.length,
      completionPct: task.status === "completed"
        ? 100
        : taskSessions.length ? clampPct((completedSessions.length / taskSessions.length) * 100) : 0,
      lastCompletedAt: latest(completedSessions.map((session) => session.completedAt)),
    };
  }

  const milestones: Record<string, MilestoneProgress> = {};
  for (const milestone of Object.values(state.milestones)) {
    const milestoneTasks = milestone.taskIds.map((id) => state.tasks[id]).filter(Boolean);
    const completedTasks = milestoneTasks.filter((task) => task.status === "completed");
    milestones[milestone.id] = {
      totalTasks: milestoneTasks.length,
      completedTasks: completedTasks.length,
      completionPct: milestone.status === "completed"
        ? 100
        : milestoneTasks.length ? clampPct((completedTasks.length / milestoneTasks.length) * 100) : 0,
    };
  }

  const goals: Record<string, GoalProgress> = {};
  const masteryGoals: Record<string, GoalMastery> = {};
  for (const goal of Object.values(state.goals)) {
    const roadmaps = goal.roadmapIds.map((id) => state.roadmaps[id]).filter(Boolean);
    const goalMilestones = roadmaps.flatMap((roadmap) => roadmap.milestoneIds.map((id) => state.milestones[id]).filter(Boolean));
    const completedMilestones = goalMilestones.filter((milestone) => milestone.status === "completed");
    const milestonePct = goalMilestones.length ? clampPct((completedMilestones.length / goalMilestones.length) * 100) : 0;
    const metric = metricPct(goal.current, goal.baseline, goal.target);
    const goalEvents = state.completionEvents.filter((event) => event.goalId === goal.id || (event.taskId ? goalMilestones.some((milestone) => milestone.taskIds.includes(event.taskId as string)) : false));
    const lastEvidenceAt = latest(goalEvents.map((event) => event.occurredAt));
    const evidenceBoost = goalEvents.length ? Math.min(25, goalEvents.length * 25) : 0;
    const score = clampPct(Math.max(metric, milestonePct, evidenceBoost));
    goals[goal.id] = {
      totalMilestones: goalMilestones.length,
      completedMilestones: completedMilestones.length,
      milestonePct,
      baseline: goal.baseline,
      target: goal.target,
      current: goal.current,
      metricPct: metric,
      completionPct: score,
      lastCompletedAt: latest(completedMilestones.map((milestone) => milestone.updatedAt)),
    };
    masteryGoals[goal.id] = {
      score,
      level: masteryLevel(score),
      evidenceCount: goalEvents.length,
      lastEvidenceAt,
    };
  }

  const progress: ProgressState = { goals, milestones, tasks, sessions };
  return {
    ...state,
    progress,
    mastery: { goals: masteryGoals },
  };
}
