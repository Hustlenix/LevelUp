// Mission engine. Builds a deterministic daily mission set for the Today
// screen from OS state: one primary mission (the single most important task
// to start), plus 2–3 smaller secondary missions (other due tasks or daily
// rituals). Same day, same data → same missions (no randomness).

import type { OSState, Task, TaskKind } from "./os/types.ts";
import { SKILL_BY_TASK_KIND, SKILL_BY_PILLAR, XP_RULES, type SkillId } from "./progression.ts";

export type MissionDifficulty = 1 | 2 | 3;
export type MissionSource = "task" | "ritual" | "empty";

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  kind: TaskKind | "ritual";
  skill: SkillId;
  minutes: number;
  difficulty: MissionDifficulty;
  xpReward: number;
  source: MissionSource;
  taskId?: string;
  milestoneId?: string;
  goalId?: string;
  href: string;
  done: boolean;
}

export interface DayMissions {
  date: string;
  primary: Mission;
  secondary: Mission[];
  hasPlan: boolean; // true when the OS has an active task queue behind this
  nextAction: string | null;
}

export const RITUALS = [
  {
    id: "ritual-journal",
    kind: "ritual" as const,
    skill: "mind" as SkillId,
    title: "Journal 5 minutes",
    subtitle: "One win, one struggle, one next step",
    minutes: 5,
    href: "/focus/",
  },
  {
    id: "ritual-read",
    kind: "ritual" as const,
    skill: "learning" as SkillId,
    title: "Read one chapter",
    subtitle: "Keep the stack moving",
    minutes: 15,
    href: "/chapters/",
  },
  {
    id: "ritual-move",
    kind: "ritual" as const,
    skill: "fitness" as SkillId,
    title: "Move your body",
    subtitle: "Ten minutes of deliberate physical effort",
    minutes: 10,
    href: "/journey/",
  },
] as const;

function hashSeed(date: string): number {
  let hash = 2166136261;
  for (let i = 0; i < date.length; i += 1) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function difficultyFor(minutes: number): MissionDifficulty {
  if (minutes <= 25) return 1;
  if (minutes <= 45) return 2;
  return 3;
}

interface QueuedTask {
  task: Task;
  milestoneId: string;
  goalId: string;
}

/** All actionable tasks across active goals, ordered by due date then creation. */
export function queuedTasks(os: OSState): QueuedTask[] {
  const queue: QueuedTask[] = [];
  for (const goal of Object.values(os.goals ?? {})) {
    if (goal.status !== "active") continue;
    for (const roadmapId of goal.roadmapIds) {
      const roadmap = os.roadmaps?.[roadmapId];
      if (!roadmap || roadmap.status !== "active") continue;
      for (const milestoneId of roadmap.milestoneIds) {
        const milestone = os.milestones?.[milestoneId];
        if (!milestone || milestone.status !== "active" && milestone.status !== "completed") continue;
        for (const taskId of milestone.taskIds) {
          const task = os.tasks?.[taskId];
          if (!task || task.status !== "todo" && task.status !== "in-progress") continue;
          queue.push({ task, milestoneId, goalId: goal.id });
        }
      }
    }
  }
  queue.sort((a, b) => {
    const dueA = a.task.dueDate ?? "9999";
    const dueB = b.task.dueDate ?? "9999";
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    return a.task.createdAt < b.task.createdAt ? -1 : 1;
  });
  return queue;
}

export function taskIsDone(task: Task | undefined): boolean {
  return !!task && (task.status === "completed" || task.status === "cancelled");
}

function missionFromQueueItem(item: QueuedTask): Mission {
  const minutes = item.task.estimatedMinutes ?? 25;
  const skill = SKILL_BY_TASK_KIND[item.task.kind];
  return {
    id: `task-${item.task.id}`,
    title: item.task.title,
    subtitle: item.task.description ?? "Planned task from your journey",
    kind: item.task.kind,
    skill,
    minutes,
    difficulty: difficultyFor(minutes),
    xpReward: minutes * XP_RULES.sessionPerMinute + (item.task.status === "in-progress" ? XP_RULES.taskCompleted : 0),
    source: "task",
    taskId: item.task.id,
    milestoneId: item.milestoneId,
    goalId: item.goalId,
    href: "/focus/",
    done: false,
  };
}

function ritualMission(ritual: (typeof RITUALS)[number]): Mission {
  return {
    id: ritual.id,
    title: ritual.title,
    subtitle: ritual.subtitle,
    kind: "ritual",
    skill: ritual.skill,
    minutes: ritual.minutes,
    difficulty: 1,
    xpReward: ritual.minutes * XP_RULES.sessionPerMinute,
    source: "ritual",
    href: ritual.href,
    done: false,
  };
}

/** Builds the deterministic daily mission set for `date` (yyyy-mm-dd). */
export function buildDayMissions(os: OSState, date: string): DayMissions {
  const seed = hashSeed(date);
  const queue = queuedTasks(os);

  if (queue.length === 0) {
    const fallback: Mission = {
      id: "empty-set-goal",
      title: "Set your first goal",
      subtitle: "Your journey has no active plan yet — start one in 2 minutes",
      kind: "action",
      skill: "discipline",
      minutes: 5,
      difficulty: 1,
      xpReward: 10,
      source: "empty",
      href: "/journey/",
      done: false,
    };
    return {
      date,
      primary: fallback,
      // Two deterministic, always-distinct rituals (3 rituals, offsets 0 and 1).
      secondary: [
        ritualMission(RITUALS[seed % RITUALS.length]),
        ritualMission(RITUALS[(seed + 1) % RITUALS.length]),
      ],
      hasPlan: false,
      nextAction: null,
    };
  }

  const primary = missionFromQueueItem(queue[0]);
  const secondary: Mission[] = [];
  const usedTaskIds = new Set<string>([queue[0].task.id]);
  const usedMilestoneIds = new Set<string>([queue[0].milestoneId]);

  // Two more queue items, skipping same-milestone duplicates when possible.
  for (const item of queue.slice(1)) {
    if (secondary.length >= 2) break;
    if (usedTaskIds.has(item.task.id)) continue;
    if (usedMilestoneIds.has(item.milestoneId)) continue;
    secondary.push(missionFromQueueItem(item));
    usedTaskIds.add(item.task.id);
    usedMilestoneIds.add(item.milestoneId);
  }
  // Pad with a daily ritual so the day always has a light third option.
  let ritualIndex = 0;
  while (secondary.length < 3) {
    const ritual = ritualMission(RITUALS[(seed + ritualIndex) % RITUALS.length]);
    if (!secondary.some((m) => m.id === ritual.id)) secondary.push(ritual);
    ritualIndex += 1;
  }

  const nextAction = queue[1]?.task.title ?? null;
  return { date, primary, secondary, hasPlan: true, nextAction };
}

/** Greeting for the Today header, based on local time and profile name/tier. */
export function greetingFor(name: string | null, hours: number): string {
  const part = hours < 5 ? "Up late" : hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : hours < 22 ? "Good evening" : "Up late";
  return name ? `${part}, ${name}` : part;
}

/** Skill fallback for a goal (pillar → skill) used when a task has no kind mapping. */
export function skillForPillar(os: OSState, goalId: string | undefined): SkillId | null {
  if (!goalId) return null;
  const goal = os.goals?.[goalId];
  return goal?.pillar ? SKILL_BY_PILLAR[goal.pillar] : null;
}