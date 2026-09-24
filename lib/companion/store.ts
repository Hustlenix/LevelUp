"use client";

import { useSyncExternalStore } from "react";
import { createEmptyCompanionState, migrateCompanionState, validateCompanionState } from "./migrations.ts";
import { COMPANION_KEY, type CompanionState, type StorageLike } from "./types.ts";

export { type StorageLike };

export function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCompanionState(storage: StorageLike | null = browserStorage()): CompanionState {
  if (!storage) return createEmptyCompanionState("1970-01-01T00:00:00.000Z");
  try {
    const raw = storage.getItem(COMPANION_KEY);
    if (!raw) return createEmptyCompanionState();
    const migrated = migrateCompanionState(JSON.parse(raw));
    if (!migrated.ok) return createEmptyCompanionState();
    if (migrated.migrated) writeCompanionState(migrated.state, storage);
    return migrated.state;
  } catch {
    return createEmptyCompanionState();
  }
}

export function writeCompanionState(state: CompanionState, storage: StorageLike | null = browserStorage()): boolean {
  const checked = validateCompanionState(state);
  if (!storage || !checked.ok || !checked.state) return false;
  try {
    storage.setItem(COMPANION_KEY, JSON.stringify(checked.state));
    return true;
  } catch {
    return false;
  }
}

export function restoreCompanionState(value: unknown, storage: StorageLike | null = browserStorage()): { ok: boolean; errors: string[]; state?: CompanionState } {
  const migrated = migrateCompanionState(value);
  if (!migrated.ok || !storage) return { ok: false, errors: migrated.errors.length ? migrated.errors : ["Local storage is unavailable."] };
  try {
    storage.setItem(COMPANION_KEY, JSON.stringify(migrated.state));
    return { ok: true, errors: [], state: migrated.state };
  } catch {
    return { ok: false, errors: ["Unable to write the companion state safely."] };
  }
}

const listeners = new Set<() => void>();
let cache: CompanionState | null = null;

export function subscribeCompanionState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function getCompanionStateSnapshot(): CompanionState {
  if (!cache) cache = readCompanionState();
  return cache;
}

const SERVER_EMPTY_STATE = Object.freeze(createEmptyCompanionState("1970-01-01T00:00:00.000Z"));

export function useCompanionStore(): CompanionState {
  return useSyncExternalStore(subscribeCompanionState, getCompanionStateSnapshot, () => SERVER_EMPTY_STATE);
}

/** Write to storage and refresh the React-visible snapshot. Used by the pump. */
export function updateCompanionState(next: CompanionState, storage: StorageLike | null = browserStorage()): boolean {
  const written = writeCompanionState(next, storage);
  if (written) {
    cache = next;
    emit();
  }
  return written;
}

export function reloadCompanionStateCache(): void {
  cache = null;
  emit();
}