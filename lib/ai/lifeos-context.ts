// Adapts lifeOS state + progression into the Coach contract (AiContext).
// The coach contract is study-shaped, so we map adult, goal-driven usage onto
// it honestly: exams stay empty, mission/roadmap come from the OS plan, and
// the signals array carries lifeOS-specific context the prompts can use.

import type { AiContext } from "./contracts.ts";
import type { OSState } from "../os/types.ts";
import type { StudentProfile } from "../studentProfile.ts";
import type { GamificationState } from "../gamification.ts";
import { computeProgression, type Progression } from "../progression.ts";
import { buildDayMissions, greetingFor } from "../mission.ts";
import { aiSourceLabel } from "./contracts.ts";

export interface LifeosContextInput {
  date: string;
  os: OSState;
  profile: StudentProfile;
  gamification: GamificationState;
  hours?: number;
  progression?: Progression;
}

export function buildLifeosAiContext(input: LifeosContextInput): AiContext {
  const { date, os, profile, gamification } = input;
  const hours = input.hours ?? new Date(`${date}T12:00:00`).getHours();
  const progression = input.progression ?? computeProgression(os, gamification, date);
  const missions = buildDayMissions(os, date);

  const activeGoal = Object.values(os.goals ?? {}).find((goal) => goal.status === "active");
  const activeRoadmap = activeGoal ? (activeGoal.roadmapIds.map((id) => os.roadmaps?.[id]).find((r) => r?.status === "active") ?? null) : null;
  const activeMilestone = activeRoadmap
    ? activeRoadmap.milestoneIds
        .map((id) => os.milestones?.[id])
        .find((m) => m && (m.status === "active" || m.status === "completed")) ?? null
    : null;
  const topTask = missions.primary.source === "task" && missions.primary.taskId ? os.tasks?.[missions.primary.taskId] : null;

  const signals: string[] = [];
  if (progression.streak.current >= 7) signals.push(`You are on a ${progression.streak.current}-day streak.`);
  if (progression.weekSum.sessions > 0 && progression.prevWeekSum.sessions > 0) {
    const delta = progression.weekSum.sessions - progression.prevWeekSum.sessions;
    if (delta > 0) signals.push(`You completed ${delta} more sessions this week than last week.`);
    else if (delta < 0) signals.push(`You completed ${-delta} fewer sessions this week than last week.`);
  }
  if (missions.primary.source === "empty") signals.push("You have no active plan yet — the coach should help you set a first goal.");
  if (progression.dominantSkill) signals.push(`Your strongest skill is ${progression.dominantSkill}.`);
  const weakest = progression.skills[progression.skills.length - 1];
  if (weakest && weakest.xp === 0) signals.push(`You have not earned any XP in ${weakest.label} yet.`);
  signals.push(`Greeting tone: "${greetingFor(profile.identity.name || null, hours)}".`);

  return {
    date,
    profile: {
      name: profile.identity.name || "friend",
      ageTier: "adult",
      grade: "",
      board: null,
      subjects: [],
      weakSubjects: [],
      preferredMinutesPerDay: profile.schedule.preferredMinutesPerDay,
      preferredSessionMinutes: profile.schedule.preferredSessionMinutes,
    },
    progress: {
      totalChapters: 0,
      completedCount: 0,
      completionPct: 0,
      completedSlugs: [],
      nextChapterSlug: null,
      nextChapterTitle: null,
      quizWeaknesses: [],
    },
    exams: [],
    behavior: {
      streakCurrent: progression.streak.current,
      streakBest: progression.streak.best,
      lastActivity: progression.streak.last ?? "",
      highlightCount: gamification.highlightCount ?? 0,
      reflectionCount: gamification.reflectionCount ?? 0,
      highlightedChapterSlugs: [],
      reflectedChapterSlugs: [],
      focusMinutesLast7Days: progression.weekSum.minutes,
      focusSessionsLast7Days: progression.weekSum.sessions,
      todayFocusMinutes: progression.last7[progression.last7.length - 1]?.minutes ?? 0,
      todayFocusTaskNames: missions.primary.source === "task" && missions.primary.taskId ? [missions.primary.title] : [],
      pillarFloorsToday: {},
      missedSignals: [],
      calibrationOutcome: null,
    },
    mission: {
      label: missions.primary.title,
      type: "focus",
      minutes: missions.primary.minutes,
      subjectName: activeGoal?.title ?? null,
      revision: false,
      isOffDay: false,
    },
    roadmap: {
      phase: activeRoadmap?.phase ?? null,
      title: activeRoadmap?.title ?? null,
      focus: activeGoal?.title ?? null,
      milestone: activeMilestone?.title ?? null,
      items: topTask ? [topTask.title] : [],
    },
    signals,
  };
}

export { aiSourceLabel };