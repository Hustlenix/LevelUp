"use client";

// Client binding for the habit domain core. lib/habits.ts owns every rule about
// what a habit IS; this file only decides WHEN React hears about a new store,
// so the views never re-derive streaks, schedules or week rollups themselves.

import { useSyncExternalStore } from "react";
import {
  addHabit,
  archiveHabit,
  emptyHabitStore,
  HABITS_STORAGE_KEY,
  isHabitStore,
  loadHabitStore,
  removeHabit,
  restoreHabit,
  saveHabitStore,
  seedStarterStore,
  setDayLog,
  updateHabit,
  type Habit,
  type HabitDayLog,
  type HabitId,
  type HabitStore,
} from "./habits";

export type { Habit, HabitDayLog, HabitStore };

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Frozen so a prerender hands the same object to every subscriber and a stray
// write during prerender cannot repoint a field the others already read. The
// freeze is shallow: `.habits` and `.log` stay mutable, which is safe only
// because nothing in this module writes to the snapshot.
// Empty rather than "real" data, because the server has no localStorage and a
// store guessed at build time would hydrate as the user's habits and then swap.
const EMPTY_SNAPSHOT: HabitStore = Object.freeze(emptyHabitStore());

let cache: HabitStore | null = null;
let saveFailed = false;
const getSaveFailed = () => saveFailed;
const getServerSaveFailed = () => false;

function onStorage(event: StorageEvent) {
  if (event.key !== HABITS_STORAGE_KEY && event.key !== null) return;
  try {
    const next: unknown = event.newValue === null ? emptyHabitStore() : JSON.parse(event.newValue);
    if (!isHabitStore(next)) return;
    cache = next;
    saveFailed = false;
    emit();
  } catch { /* Never replace a valid live snapshot with a malformed cross-tab value. */ }
}

export function getHabitsSnapshot(): HabitStore {
  if (!cache) cache = loadHabitStore();
  return cache;
}

/** Export the latest persisted tab state, or preserve unsaved work after a quota failure. */
export function getHabitsBackupSnapshot(): HabitStore {
  return saveFailed ? getHabitsSnapshot() : loadHabitStore();
}

export function subscribeHabits(cb: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    if (!saveFailed) cache = loadHabitStore();
    window.addEventListener("storage", onStorage);
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useHabitsStore(): HabitStore {
  return useSyncExternalStore(subscribeHabits, getHabitsSnapshot, () => EMPTY_SNAPSHOT);
}

export function useHabitSaveFailed(): boolean {
  return useSyncExternalStore(subscribeHabits, getSaveFailed, getServerSaveFailed);
}

// The domain core hands back the SAME store for a genuine no-op — an unknown id,
// a patch that changes nothing, seeding a store that already has habits. Those
// must not emit: useSyncExternalStore compares snapshots by reference, so
// emitting an equal-but-fresh object re-renders every subscriber for nothing.
function commit(next: HabitStore): void {
  if (next === getHabitsSnapshot()) return;
  cache = next;
  saveFailed = !saveHabitStore(next);
  emit();
}

export function createHabit(input: Omit<Habit, "id" | "createdAt" | "archived">) {
  const habit: Habit = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    archived: false,
  };
  commit(addHabit(getHabitsSnapshot(), habit));
}

export function editHabit(id: HabitId, patch: Partial<Omit<Habit, "id">>) {
  commit(updateHabit(getHabitsSnapshot(), id, patch));
}

export function archive(id: HabitId) {
  commit(archiveHabit(getHabitsSnapshot(), id));
}

export function restore(id: HabitId) {
  commit(restoreHabit(getHabitsSnapshot(), id));
}

export function remove(id: HabitId) {
  commit(removeHabit(getHabitsSnapshot(), id));
}

export function setLog(habitId: HabitId, dateKey: string, log: HabitDayLog | null) {
  commit(setDayLog(getHabitsSnapshot(), habitId, dateKey, log));
}

export function seedStarterSet() {
  // Wrapped instead of handing `crypto.randomUUID` over directly: the domain
  // core calls the callback detached, where the method loses its receiver.
  commit(seedStarterStore(getHabitsSnapshot(), () => crypto.randomUUID()));
}

// Deliberately NOT routed through commit. Backup import rewrites localStorage
// from outside this module, so the imported reference has to be adopted as the
// snapshot and re-persisted whatever it compares like, and the snapshot has to be
// re-announced for subscribers to read the new one. A store the guard rejects is
// ignored outright: adopting it would restore the wipe this module exists to
// prevent, and the next load would answer it with an empty store anyway.
// Import calls this right after restoreBackupAtomatically; `undefined` means the
// backup carried no habits.
export function restoreHabits(store: HabitStore | undefined) {
  if (store !== undefined && !isHabitStore(store)) return;
  const next = store ?? emptyHabitStore();
  cache = next;
  saveFailed = !saveHabitStore(next);
  emit();
}
