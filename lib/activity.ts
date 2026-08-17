"use client";

import { useSyncExternalStore } from "react";
import type { HighlightEntry } from "@/lib/highlights";
import type { QuizScore } from "@/lib/types";

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface StreakState {
  current: number;
  best: number;
  last: string;
}

const HIGHLIGHTS_KEY = "levelup-highlights-v1";
const QUIZ_KEY = "levelup-quiz-v1";
const REFLECTIONS_KEY = "levelup-reflections-v1";
const STREAK_KEY = "levelup-streak-v1";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  emit();
}

let highlightsCache: HighlightEntry[] | null = null;

export function getHighlightsSnapshot(): HighlightEntry[] {
  if (!highlightsCache) highlightsCache = readJson<HighlightEntry[]>(HIGHLIGHTS_KEY, []);
  return highlightsCache;
}

export function subscribeActivity(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useHighlightsStore(): HighlightEntry[] {
  return useSyncExternalStore(subscribeActivity, getHighlightsSnapshot, () => []);
}

export function addHighlight(entry: HighlightEntry) {
  const next = [...getHighlightsSnapshot(), entry];
  highlightsCache = next;
  writeJson(HIGHLIGHTS_KEY, next);
}

export function removeHighlight(id: string) {
  const next = getHighlightsSnapshot().filter((h) => h.id !== id);
  highlightsCache = next;
  writeJson(HIGHLIGHTS_KEY, next);
}

export function restoreHighlights(entries: HighlightEntry[]) {
  highlightsCache = entries;
  writeJson(HIGHLIGHTS_KEY, entries);
}

let quizCache: Record<string, QuizScore> | null = null;

export function getQuizSnapshot(): Record<string, QuizScore> {
  if (!quizCache) quizCache = readJson<Record<string, QuizScore>>(QUIZ_KEY, {});
  return quizCache;
}

export function useQuizStore(): Record<string, QuizScore> {
  return useSyncExternalStore(subscribeActivity, getQuizSnapshot, () => ({}));
}

export function saveQuizResult(slug: string, score: number, total: number) {
  const next = { ...getQuizSnapshot(), [slug]: { score, total, ts: Date.now() } };
  quizCache = next;
  writeJson(QUIZ_KEY, next);
  recordActivity();
}

export function restoreQuiz(scores: Record<string, QuizScore>) {
  quizCache = scores;
  writeJson(QUIZ_KEY, scores);
}

let reflectionsCache: Record<string, string> | null = null;

export function getReflectionsSnapshot(): Record<string, string> {
  if (!reflectionsCache) reflectionsCache = readJson<Record<string, string>>(REFLECTIONS_KEY, {});
  return reflectionsCache;
}

export function useReflectionsStore(): Record<string, string> {
  return useSyncExternalStore(subscribeActivity, getReflectionsSnapshot, () => ({}));
}

export function saveReflection(slug: string, text: string) {
  const next = { ...getReflectionsSnapshot(), [slug]: text };
  reflectionsCache = next;
  writeJson(REFLECTIONS_KEY, next);
}

export function restoreReflections(reflections: Record<string, string>) {
  reflectionsCache = reflections;
  writeJson(REFLECTIONS_KEY, reflections);
}

let streakCache: StreakState | null = null;

export function getStreakSnapshot(): StreakState {
  if (!streakCache) {
    streakCache = readJson<StreakState>(STREAK_KEY, { current: 0, best: 0, last: "" });
  }
  return streakCache;
}

export function useStreakStore(): StreakState {
  return useSyncExternalStore(subscribeActivity, getStreakSnapshot, () => ({
    current: 0,
    best: 0,
    last: "",
  }));
}

export function recordActivity(now: Date = new Date()) {
  const today = localDate(now);
  const cur = getStreakSnapshot();
  if (cur.last === today) return;
  const yesterday = localDate(new Date(now.getTime() - 86400000));
  const current = cur.last === yesterday ? cur.current + 1 : 1;
  const next: StreakState = { current, best: Math.max(cur.best, current), last: today };
  streakCache = next;
  writeJson(STREAK_KEY, next);
}

export function restoreStreak(streak: StreakState) {
  streakCache = streak;
  writeJson(STREAK_KEY, streak);
}
