"use client";

// Shared derived gamification state for the LifeOS workspace pages (/journey/,
// /coach/, /progress/). Mirrors the derivation GamificationPanel performs in a
// single hook so every page shows the same XP, level and badges.

import { useEffect, useMemo } from "react";
import {
  useHighlightsStore,
  useQuizStore,
  useReflectionsStore,
  useStreakStore,
} from "./activity.ts";
import {
  badgesFor,
  computeXp,
  levelFor,
  type Badge,
  type GamificationState,
  type LevelInfo,
} from "./gamification.ts";
import { useProgressStore } from "./progress.ts";
import { localToday } from "./dates.ts";

const BADGES_KEY = "levelup-badges-v1";

function readBadges(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(BADGES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export interface UseGamification {
  state: GamificationState;
  xp: number;
  level: LevelInfo;
  badges: Badge[];
}

export function useGamification(): UseGamification {
  const progress = useProgressStore();
  const highlights = useHighlightsStore();
  const quiz = useQuizStore();
  const reflections = useReflectionsStore();
  const streak = useStreakStore();

  const state: GamificationState = useMemo(
    () => ({
      completedSlugs: Object.keys(progress).filter((s) => progress[s]?.complete),
      quizResults: quiz,
      highlightCount: highlights.length,
      reflectionCount: Object.keys(reflections).length,
      streak,
    }),
    [progress, highlights, quiz, reflections, streak],
  );

  const xp = useMemo(() => computeXp(state), [state]);
  const level = useMemo(() => levelFor(xp), [xp]);
  const { badges, store, changed } = useMemo(
    () => badgesFor(state, readBadges(), localToday()),
    [state],
  );

  useEffect(() => {
    if (!changed) return;
    try {
      window.localStorage.setItem(BADGES_KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable */
    }
  }, [changed, store]);

  return { state, xp, level, badges };
}