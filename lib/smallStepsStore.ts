"use client";
import { useSyncExternalStore } from "react";
import { SMALL_STEPS_KEY, emptySmallSteps, isSmallSteps, restoreSmallSteps, transitionSmallSteps, type SmallStepsState, type StepEvent } from "./smallSteps";

const server = { state: emptySmallSteps(), error: "" };
let snapshot = server;
let loaded = false;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }
function read() {
  try {
    const raw = localStorage.getItem(SMALL_STEPS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : emptySmallSteps();
    if (!isSmallSteps(value)) throw new Error("Invalid saved data");
    snapshot = { state: restoreSmallSteps(value), error: "" };
  } catch { snapshot = { ...snapshot, error: "Saved steps could not be read. Export a recovery copy before leaving this page." }; }
}
function getSnapshot() {
  if (!loaded && typeof window !== "undefined") { loaded = true; read(); }
  return snapshot;
}
function external(event: StorageEvent) {
  if (event.key !== SMALL_STEPS_KEY && event.key !== null) return;
  // Never silently discard unsaved edits when storage is unavailable.
  if (snapshot.error) return;
  read(); emit();
}
function subscribe(fn: () => void) {
  if (!listeners.size && loaded && !snapshot.error) read();
  listeners.add(fn);
  if (listeners.size === 1) window.addEventListener("storage", external);
  return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener("storage", external); };
}
export function useSmallSteps() { return useSyncExternalStore(subscribe, getSnapshot, () => server); }
export function getSmallStepsBackup() { getSnapshot(); if (!listeners.size && !snapshot.error) read(); return snapshot.state; }
export function reloadSmallSteps() { read(); emit(); }
export function saveSmallSteps(state: SmallStepsState) {
  let error = "";
  try { localStorage.setItem(SMALL_STEPS_KEY, JSON.stringify(state)); }
  catch { error = "Changes are only in this tab. Storage is unavailable or full. Export a recovery copy before closing."; }
  snapshot = { state, error }; emit();
}
export function dispatchSmallSteps(event: StepEvent) {
  const previous = getSnapshot().state;
  const next = transitionSmallSteps(previous, event);
  if (next !== previous) saveSmallSteps(next);
}
