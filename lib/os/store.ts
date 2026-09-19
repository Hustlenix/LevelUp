"use client";

import { useSyncExternalStore } from "react";
import { createEmptyOSState, migrateOSState, validateOSState } from "./migrations.ts";
import { reduceOSState } from "./reducer.ts";
import type { OSAction, OSState } from "./types.ts";

export const OS_STATE_KEY = "levelup-os-state-v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readOSState(storage: StorageLike | null = browserStorage()): OSState {
  if (!storage) return createEmptyOSState("1970-01-01T00:00:00.000Z");
  try {
    const raw = storage.getItem(OS_STATE_KEY);
    if (!raw) return createEmptyOSState();
    const migrated = migrateOSState(JSON.parse(raw));
    if (!migrated.ok) return createEmptyOSState();
    if (migrated.migrated) writeOSState(migrated.state, storage);
    return migrated.state;
  } catch {
    return createEmptyOSState();
  }
}

export function writeOSState(state: OSState, storage: StorageLike | null = browserStorage()): boolean {
  const checked = validateOSState(state);
  if (!storage || !checked.ok || !checked.state) return false;
  try {
    storage.setItem(OS_STATE_KEY, JSON.stringify(checked.state));
    return true;
  } catch {
    return false;
  }
}

export function restoreOSState(value: unknown, storage: StorageLike | null = browserStorage()): { ok: boolean; errors: string[]; state?: OSState } {
  const migrated = migrateOSState(value);
  if (!migrated.ok || !storage) return { ok: false, errors: migrated.errors.length ? migrated.errors : ["Local storage is unavailable."] };
  try {
    storage.setItem(OS_STATE_KEY, JSON.stringify(migrated.state));
    return { ok: true, errors: [], state: migrated.state };
  } catch {
    return { ok: false, errors: ["Unable to write the LevelUp operating state safely."] };
  }
}

const listeners = new Set<() => void>();
let cache: OSState | null = null;

export function subscribeOSState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function getOSStateSnapshot(): OSState {
  if (!cache) cache = readOSState();
  return cache;
}

const SERVER_EMPTY_STATE = Object.freeze(createEmptyOSState("1970-01-01T00:00:00.000Z"));

export function useOSStore(): OSState {
  return useSyncExternalStore(subscribeOSState, getOSStateSnapshot, () => SERVER_EMPTY_STATE);
}

export function dispatchOS(action: OSAction): OSState {
  const current = getOSStateSnapshot();
  const next = reduceOSState(current, action);
  if (next !== current && writeOSState(next)) {
    cache = next;
    emit();
  }
  return cache ?? current;
}

export function reloadOSStateCache(): void {
  cache = null;
  emit();
}
