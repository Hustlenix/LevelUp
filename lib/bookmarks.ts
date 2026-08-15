"use client";

import { useSyncExternalStore } from "react";

const KEY = "levelup-bookmarks-v1";

const listeners = new Set<() => void>();
let cache: Set<string> | null = null;

function emit() {
  for (const l of listeners) l();
}

export function subscribeBookmarks(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getRaw(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getBookmarksSnapshot(): Set<string> {
  if (cache) return cache;
  cache = new Set(getRaw());
  return cache;
}

export function useBookmarksStore(): Set<string> {
  return useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, () => new Set());
}

function write(slugs: string[]) {
  cache = new Set(slugs);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function toggleBookmark(slug: string) {
  const set = getBookmarksSnapshot();
  const next = new Set(set);
  if (next.has(slug)) {
    next.delete(slug);
  } else {
    next.add(slug);
  }
  write([...next]);
}