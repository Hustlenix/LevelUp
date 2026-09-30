// Derived progression engine (read-only).
// Computes XP, levels, skills, streaks, records and history FROM the OS event
// log (lib/os) + gamification state. It never mutates anything and never
// invents XP: every point traces to a real completion event.

import type { Pillar } from "./types.ts";
import type { OSState, CompletionEventKind, TaskKind } from "./os/types.ts";
import type { GamificationState } from "./gamification.ts";

export const SKILLS = [
  { id: "focus", label: "Focus" },
  { id: "learning", label: "Learning" },
  { id: "fitness", label: "Fitness" },
  { id: "discipline", label: "Discipline" },
  { id: "confidence", label: "Confidence" },
  { id: "mind", label: "Mind" },
  { id: "career", label: "Career" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];

export const SKILL_BY_TASK_KIND: Record<TaskKind, SkillId> = {
  action: "discipline",
  study: "learning",
  focus: "focus",
  protocol: "discipline",
  review: "discipline",
  reflection: "mind",
  custom: "confidence",
};

export const SKILL_BY_PILLAR: Record<Pillar, SkillId> = {
  health: "fitness",
  wealth: "career",
  love: "mind",
  self: "learning",
};

// XP is only earned for real completed work. Session XP scales with focused
// minutes; completions and reviews add stable base values.
export const XP_RULES = {
  sessionPerMinute: 2,
  taskCompleted: 25,
  goalProgressed: 15,
  reviewCompleted: 20,
  interruptedPenalty: 0, // interruptions never subtract XP (no punishment)
} as const;

export const LEVEL_CURVE = [0, 80, 200, 400, 700, 1100, 1600, 2200, 3000, 4000] as const;
export const LEVEL_NAMES = [
  "Apprentice",
  "Practitioner",
  "Specialist",
  "Expert",
  "Master",
  "Grandmaster",
  "Sage",
  "Pioneer",
  "Legend",
  "Ascendant",
] as const;

export const HISTORY_DAYS = 42 as const;
export const WEEK_DAYS = 7 as const;

/** Companion evolution stages — driven by life level, not hardcoded sessions. */
export const COMPANION_STAGES = [
  { minLevel: 1, name: "Spark", blurb: "A small, curious companion that watches you begin." },
  { minLevel: 3, name: "Ember", blurb: "Warming up — habits are starting to catch." },
  { minLevel: 6, name: "Flame", blurb: "Steady momentum; the routine holds on its own." },
  { minLevel: 9, name: "Beacon", blurb: "You light the way for yourself and others." },
] as const;

export function levelForXp(xp: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_CURVE.length; i += 1) {
    if (xp >= LEVEL_CURVE[i]) level = i;
  }
  return level;
}

export function levelName(xp: number): string {
  return LEVEL_NAMES[levelForXp(xp)] ?? LEVEL_NAMES[LEVEL_NAMES.length - 1];
}

export function xpBounds(xp: number): { floor: number; next: number | null; into: number; pct: number } {
  const level = levelForXp(xp);
  const floor = LEVEL_CURVE[level];
  const next = level + 1 < LEVEL_CURVE.length ? LEVEL_CURVE[level + 1] : null;
  const into = xp - floor;
  const pct = next ? Math.min(100, Math.round((into / (next - floor)) * 100)) : 100;
  return { floor, next, into, pct };
}

export function unlockStage(level: number): (typeof COMPANION_STAGES)[number] {
  let stage: (typeof COMPANION_STAGES)[number] = COMPANION_STAGES[0];
  for (const candidate of COMPANION_STAGES) {
    if (level >= candidate.minLevel) stage = candidate;
  }
  return stage;
}

function parseDay(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to) - parseDay(from)) / 86400000);
}

export interface DayStat {
  date: string;
  xp: number;
  sessions: number;
  minutes: number;
}

export interface Progression {
  xp: number;
  level: number;
  name: string;
  bounds: { floor: number; next: number | null; into: number; pct: number };
  skillXp: Record<SkillId, number>;
  skills: { id: SkillId; label: string; xp: number; level: number; pct: number }[];
  dominantSkill: SkillId | null;
  title: string;
  totalSessions: number;
  totalMinutes: number;
  tasksCompleted: number;
  goalsCompleted: number;
  reviewsCompleted: number;
  streak: { current: number; best: number; last: string | null };
  last7: DayStat[];
  weekSum: { xp: number; sessions: number; minutes: number };
  prevWeekSum: { xp: number; sessions: number; minutes: number };
  history: DayStat[];
  records: {
    bestStreak: number;
    mostXpDay: string | null;
    mostSessionsDay: string | null;
    longestMinutesDay: number;
    topSkill: SkillId | null;
  };
  companion: { name: string; blurb: string };
}

function domainDate(now: string): string {
  return now.slice(0, 10);
}

/** Build the full derived progression from OS state + gamification. */
export function computeProgression(os: OSState, gamification: GamificationState, todayIso?: string): Progression {
  const today = todayIso ?? domainDate(new Date().toISOString());

  const skillXp: Record<SkillId, number> = { focus: 0, learning: 0, fitness: 0, discipline: 0, confidence: 0, mind: 0, career: 0 };
  const events = os.completionEvents ?? [];
  const dayMap = new Map<string, DayStat>();
  const activeDates = new Set<string>();
  let xp = 0;
  let totalSessions = 0;
  let totalMinutes = 0;
  let tasksCompleted = 0;
  let goalsCompleted = 0;
  let reviewsCompleted = 0;

  const eventSkill = (kind: CompletionEventKind, taskId?: string, goalId?: string): SkillId | null => {
    if (taskId) {
      const task = os.tasks[taskId];
      if (task) return SKILL_BY_TASK_KIND[task.kind];
    }
    if (goalId) {
      const goal = os.goals[goalId];
      if (goal?.pillar) return SKILL_BY_PILLAR[goal.pillar];
    }
    if (kind === "review-completed") return "discipline";
    return null;
  };

  for (const event of events) {
    const day = domainDate(event.occurredAt);
    const stat = dayMap.get(day) ?? { date: day, xp: 0, sessions: 0, minutes: 0 };
    const skill = eventSkill(event.kind, event.taskId, event.goalId);
    let gained = 0;

    switch (event.kind) {
      case "session-completed": {
        const minutes = Math.max(0, Math.round(event.value ?? 0));
        gained = minutes * XP_RULES.sessionPerMinute;
        stat.sessions += 1;
        stat.minutes += minutes;
        totalSessions += 1;
        totalMinutes += minutes;
        activeDates.add(day);
        break;
      }
      case "task-completed":
        gained = XP_RULES.taskCompleted;
        tasksCompleted += 1;
        activeDates.add(day);
        break;
      case "goal-progressed":
        gained = XP_RULES.goalProgressed;
        activeDates.add(day);
        break;
      case "review-completed":
        gained = XP_RULES.reviewCompleted;
        reviewsCompleted += 1;
        activeDates.add(day);
        break;
      default:
        break;
    }
    if (skill) skillXp[skill] += gained;
    xp += gained;
    stat.xp += gained;
    dayMap.set(day, stat);
  }

  // Goals completed are also tracked structurally (in case events were pruned).
  for (const goal of Object.values(os.goals ?? {})) {
    if (goal.status === "completed") goalsCompleted += 1;
  }

  const history: DayStat[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(parseDay(today) - i * 86400000).toISOString().slice(0, 10);
    history.push(dayMap.get(date) ?? { date, xp: 0, sessions: 0, minutes: 0 });
  }

  const last7 = history.slice(-WEEK_DAYS);
  const prevWeek = history.slice(-WEEK_DAYS * 2, -WEEK_DAYS);
  const sum = (days: DayStat[]) =>
    days.reduce(
      (acc, day) => ({ xp: acc.xp + day.xp, sessions: acc.sessions + day.sessions, minutes: acc.minutes + day.minutes }),
      { xp: 0, sessions: 0, minutes: 0 },
    );

  // Streaks: any meaningful activity counts as a "day", not just sessions.
  const dates = [...activeDates].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i += 1) {
    run = i > 0 && daysBetween(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const lastActive = dates.length ? dates[dates.length - 1] : null;
  let current = 0;
  if (lastActive && daysBetween(lastActive, today) <= 1) {
    current = 1;
    for (let i = dates.length - 2; i >= 0; i -= 1) {
      if (daysBetween(dates[i], dates[i + 1]) === 1) current += 1;
      else break;
    }
  }
  best = Math.max(best, current);

  const skillEntries = SKILLS.map(({ id, label }) => ({ id, label, xp: skillXp[id], level: levelForXp(skillXp[id]), pct: xpBounds(skillXp[id]).pct })).sort(
    (a, b) => b.xp - a.xp,
  );
  const topSkill = skillEntries.find((entry) => entry.xp > 0)?.id ?? null;
  const name = levelName(xp);
  const title = topSkill ? `${name} of ${SKILLS.find((s) => s.id === topSkill)?.label ?? "the Journey"}` : `${name} of the Journey`;

  const mostXpDay = [...dayMap.values()].sort((a, b) => b.xp - a.xp)[0] ?? null;
  const mostSessionsDay = [...dayMap.values()].sort((a, b) => b.sessions - a.sessions)[0] ?? null;
  const longestMinutesDay = [...dayMap.values()].reduce((max, day) => Math.max(max, day.minutes), 0);

  return {
    xp,
    level: levelForXp(xp),
    name,
    bounds: xpBounds(xp),
    skillXp,
    skills: skillEntries,
    dominantSkill: topSkill,
    title,
    totalSessions,
    totalMinutes,
    tasksCompleted,
    goalsCompleted,
    reviewsCompleted,
    streak: { current, best, last: lastActive },
    last7,
    weekSum: sum(last7),
    prevWeekSum: sum(prevWeek),
    history,
    records: {
      bestStreak: best,
      mostXpDay: mostXpDay?.date ?? null,
      mostSessionsDay: mostSessionsDay?.date ?? null,
      longestMinutesDay,
      topSkill,
    },
    companion: unlockStage(levelForXp(xp)),
  };
}

export interface LifeosBadge {
  id: string;
  name: string;
  blurb: string;
  rule: string;
  unlocked: boolean;
}

/** LifeOS-native achievements — derived from the same honest event log. */
export function computeLifeosBadges(p: Progression): LifeosBadge[] {
  return [
    {
      id: "first-session",
      name: "First Session",
      blurb: "One focused session done. Everything starts here.",
      rule: "Complete 1 focus session",
      unlocked: p.totalSessions >= 1,
    },
    {
      id: "ten-sessions",
      name: "Ten Against the Clock",
      blurb: "Ten real sessions. The routine is forming.",
      rule: "Complete 10 sessions",
      unlocked: p.totalSessions >= 10,
    },
    {
      id: "streak-7",
      name: "One Week On",
      blurb: "Seven days of showing up.",
      rule: "Reach a 7-day streak",
      unlocked: p.streak.best >= 7,
    },
    {
      id: "streak-30",
      name: "One Month On",
      blurb: "Thirty days. This is an identity now.",
      rule: "Reach a 30-day streak",
      unlocked: p.streak.best >= 30,
    },
    {
      id: "first-goal",
      name: "Goal Scored",
      blurb: "You finished a goal from your journey.",
      rule: "Complete 1 goal",
      unlocked: p.goalsCompleted >= 1,
    },
    {
      id: "task-25",
      name: "Quarter",
      blurb: "Twenty-five meaningful tasks checked off.",
      rule: "Complete 25 tasks",
      unlocked: p.tasksCompleted >= 25,
    },
    {
      id: "hour-10",
      name: "Ten Focused Hours",
      blurb: "Ten hours of deep, protected time.",
      rule: "Track 10 hours of focused sessions",
      unlocked: p.totalMinutes >= 600,
    },
    {
      id: "level-5",
      name: "Rising",
      blurb: "You reached level 5.",
      rule: "Reach level 5",
      unlocked: p.level >= 5,
    },
    {
      id: "balanced",
      name: "Balanced Build",
      blurb: "Every skill has earned at least some XP.",
      rule: "Train all 7 skills",
      unlocked: SKILLS.every((skill) => p.skillXp[skill.id] > 0),
    },
  ];
}