"use client";

import { useSyncExternalStore } from "react";

export interface ChapterProgress {
  complete: boolean;
  maxScroll: number;
  updatedAt: number;
}

export type ProgressMap = Record<string, ChapterProgress>;

const KEY = "levelup-progress-v1";

const listeners = new Set<() => void>();
let cache: ProgressMap | null = null;

function emit() {
  for (const l of listeners) l();
}

export function subscribeProgress(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getProgressSnapshot(): ProgressMap {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export function useProgressStore(): ProgressMap {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, () => ({}));
}

function write(map: ProgressMap) {
  cache = map;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function markComplete(slug: string, complete: boolean) {
  const map = { ...getProgressSnapshot() };
  const entry = map[slug] ?? { complete: false, maxScroll: 0, updatedAt: 0 };
  map[slug] = { ...entry, complete, updatedAt: Date.now() };
  write(map);
}

export function recordScroll(slug: string, maxScroll: number) {
  const map = { ...getProgressSnapshot() };
  const entry = map[slug] ?? { complete: false, maxScroll: 0, updatedAt: 0 };
  if (maxScroll > entry.maxScroll) {
    map[slug] = { ...entry, maxScroll, updatedAt: Date.now() };
    write(map);
  }
}

export function resetProgress() {
  write({});
}

export function restoreProgress(map: ProgressMap) {
  write(map);
}

export function overallStats(map: ProgressMap, total: number) {
  const done = Object.values(map).filter((p) => p.complete).length;
  const avgScroll = Object.values(map).length
    ? Object.values(map).reduce((s, p) => s + p.maxScroll, 0) / Object.values(map).length
    : 0;
  return { done, pct: total ? Math.round((done / total) * 100) : 0, avgScroll };
}