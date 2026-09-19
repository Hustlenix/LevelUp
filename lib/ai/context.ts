import type { Chapter, SiteData } from "../types.ts";
import type { FocusBlockSession, PillarFloorCheck } from "../actionTools.ts";
import type { HighlightEntry } from "../highlights.ts";
import type { ProgressMap } from "../progress.ts";
import type { QuizScore } from "../types.ts";
import type { StreakState } from "../gamification.ts";
import {
  daysUntil,
  getProfileAgeTier,
  nearestExam,
  todayMission,
  type StudentProfile,
} from "../studentProfile.ts";
import { AI_LIMITS, type AiContext } from "./contracts.ts";

export interface AiContextInput {
  date: string;
  profile: StudentProfile;
  progress: ProgressMap;
  quiz: Record<string, QuizScore>;
  highlights: HighlightEntry[];
  reflections: Record<string, string>;
  streak: StreakState;
  focusSessions: FocusBlockSession[];
  pillars: Record<string, PillarFloorCheck>;
  todayCalibration?: { primaryOutcome?: string; completed?: boolean };
  siteData: Pick<SiteData, "chapters" | "roadmap">;
}

function localDateNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function withinLastDays(date: string, end: string, days: number): boolean {
  const distance = Math.floor((localDateNumber(end) - localDateNumber(date)) / 86400000);
  return distance >= 0 && distance < days;
}

export function buildAiContext(input: AiContextInput): AiContext {
  const { date, profile, progress, quiz, highlights, reflections, streak, focusSessions, pillars, siteData } = input;
  const chapters = siteData.chapters;
  const completedSlugs = Object.keys(progress).filter((slug) => progress[slug]?.complete);
  const nextChapter = chapters.find((chapter) => !progress[chapter.slug]?.complete) ?? null;
  const completionPct = chapters.length ? Math.round((completedSlugs.length / chapters.length) * 100) : 0;
  const quizWeaknesses = chapters
    .filter((chapter) => {
      const score = quiz[chapter.slug];
      return score && score.total > 0 && score.score / score.total < 0.7;
    })
    .slice(0, 4)
    .map((chapter) => chapter.title);
  const currentDate = new Date(`${date}T12:00:00`);
  const exams = profile.exams
    .filter((exam) => exam.date)
    .map((exam) => ({
      subjectName: profile.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "your subject",
      date: exam.date as string,
      daysUntil: daysUntil(exam.date as string, currentDate),
    }))
    .filter((exam) => exam.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);
  const focusLast7 = focusSessions.filter((session) => withinLastDays(session.date, date, 7));
  const focusToday = focusSessions.filter((session) => session.date === date);
  const todayPillars = pillars[date];
  const pillarFloorsToday: Record<string, boolean> = todayPillars
    ? {
        health: !!todayPillars.health?.done,
        wealth: !!todayPillars.wealth?.done,
        love: !!todayPillars.love?.done,
        self: !!todayPillars.self?.done,
      }
    : {};
  const nearest = nearestExam(profile, currentDate);
  const mission = todayMission(profile, currentDate);
  const roadmapIndex = completionPct < 34 ? 0 : completionPct < 67 ? 1 : 2;
  const roadmapPhase = siteData.roadmap.phases[roadmapIndex] ?? null;
  const missedSignals: string[] = [];
  if (streak.last && streak.last !== date && streak.current === 0) missedSignals.push("The current streak is paused after a missed active day.");
  if (focusLast7.length === 0) missedSignals.push("No completed focus session is recorded in the last seven days.");
  if (todayPillars && Object.values(pillarFloorsToday).some((done) => !done)) missedSignals.push("At least one non-zero pillar floor is still open today.");

  const context: AiContext = {
    date,
    profile: {
      name: profile.identity.name,
      ageTier: getProfileAgeTier(profile),
      grade: profile.identity.grade,
      board: profile.identity.board,
      subjects: profile.subjects.slice(0, 12).map((subject) => subject.name),
      weakSubjects: profile.subjects.filter((subject) => subject.isWeak).slice(0, 6).map((subject) => subject.name),
      preferredMinutesPerDay: profile.schedule.preferredMinutesPerDay,
      preferredSessionMinutes: profile.schedule.preferredSessionMinutes,
    },
    progress: {
      totalChapters: chapters.length,
      completedCount: completedSlugs.length,
      completionPct,
      completedSlugs: completedSlugs.slice(0, 30),
      nextChapterSlug: nextChapter?.slug ?? null,
      nextChapterTitle: nextChapter?.title ?? null,
      quizWeaknesses,
    },
    exams,
    behavior: {
      streakCurrent: streak.current,
      streakBest: streak.best,
      lastActivity: streak.last,
      highlightCount: highlights.length,
      reflectionCount: Object.keys(reflections).length,
      highlightedChapterSlugs: [...new Set(highlights.slice(-6).map((highlight) => highlight.slug))].slice(0, 6),
      reflectedChapterSlugs: Object.keys(reflections).slice(0, 6),
      focusMinutesLast7Days: focusLast7.reduce((total, session) => total + Math.round(session.completedSeconds / 60), 0),
      focusSessionsLast7Days: focusLast7.length,
      todayFocusMinutes: focusToday.reduce((total, session) => total + Math.round(session.completedSeconds / 60), 0),
      todayFocusTaskNames: focusToday.slice(0, 4).map((session) => session.taskName),
      pillarFloorsToday,
      missedSignals,
      calibrationOutcome: input.todayCalibration?.completed ? input.todayCalibration.primaryOutcome?.slice(0, 180) ?? null : null,
    },
    mission: {
      label: mission.label,
      type: mission.type,
      minutes: mission.minutes,
      subjectName: mission.subjectName,
      revision: mission.revision,
      isOffDay: mission.isOffDay,
    },
    roadmap: {
      phase: roadmapPhase?.phase ?? null,
      title: roadmapPhase?.title ?? null,
      focus: roadmapPhase?.focus ?? null,
      milestone: roadmapPhase?.milestone ?? null,
      items: roadmapPhase?.items.slice(0, 5) ?? [],
    },
    signals: [],
  };

  const signals = context.signals;
  if (profile.subjects.length === 0) signals.push("No study subjects are configured yet.");
  if (profile.subjects.some((subject) => subject.isWeak)) signals.push(`Weak subjects: ${context.profile.weakSubjects.join(", ")}.`);
  if (nearest) signals.push(`Nearest exam: ${context.exams[0]?.subjectName ?? "subject"} in ${nearest.days} day(s).`);
  if (nextChapter) signals.push(`Next unread LevelUp chapter: ${nextChapter.title}.`);
  signals.push(`Manual completion is ${completionPct}%.`);
  signals.push(`Current streak is ${streak.current} day(s).`);
  signals.push(...missedSignals);
  return context;
}

export function contextToPromptData(context: AiContext): Omit<AiContext, "signals"> & { signals: string[] } {
  const value = {
    ...context,
    profile: { ...context.profile, name: context.profile.name.slice(0, 80) },
    signals: context.signals.slice(0, 12),
  };
  const serialized = JSON.stringify(value);
  if (serialized.length <= AI_LIMITS.contextChars) return value;
  return {
    ...value,
    progress: { ...value.progress, completedSlugs: value.progress.completedSlugs.slice(0, 10) },
    behavior: { ...value.behavior, todayFocusTaskNames: value.behavior.todayFocusTaskNames.slice(0, 2), missedSignals: value.behavior.missedSignals.slice(0, 2) },
    signals: value.signals.slice(0, 6),
  };
}

export function chapterReference(chapter: Chapter) {
  return {
    id: `ch:${chapter.slug}`,
    type: "Chapter",
    title: chapter.title,
    sub: `Chapter ${chapter.number} · ${chapter.pillar}`,
    teaser: chapter.teaser,
    url: `/chapters/${chapter.slug}/`,
    excerpt: chapter.body.slice(0, AI_LIMITS.referenceChars),
    keyConcepts: chapter.keyConcepts.slice(0, 8),
    protocols: chapter.protocols.slice(0, 6),
    evidenceGrades: chapter.studies.slice(0, 6).map((study) => study.grade),
    untrustedReference: true as const,
  };
}
