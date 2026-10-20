"use client";
import { useSyncExternalStore } from "react";
import { PRACTICE_DRAFTS_KEY, emptyPracticeDrafts, isPracticeDrafts, editPracticeDraft, type PracticeDraft } from "./practiceDrafts";
const server = { state: emptyPracticeDrafts(), error: "" };
let snapshot = server;
let loaded = false;
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }
function read() {
  try {
    const raw = localStorage.getItem(PRACTICE_DRAFTS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : emptyPracticeDrafts();
    if (!isPracticeDrafts(value)) throw new Error("Invalid drafts");
    snapshot = { state: value, error: "" };
  } catch { snapshot = { ...snapshot, error: "Drafts could not be read. Keep a copy of your notes before leaving." }; }
}
function getSnapshot() { if (!loaded && typeof window !== "undefined") { loaded = true; read(); } return snapshot; }
function external(event: StorageEvent) { if ((event.key === PRACTICE_DRAFTS_KEY || event.key === null) && !snapshot.error) { read(); emit(); } }
function subscribe(fn: () => void) { if (!listeners.size && loaded && !snapshot.error) read(); listeners.add(fn); if (listeners.size === 1) window.addEventListener("storage", external); return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener("storage", external); }; }
export const usePracticeDrafts = () => useSyncExternalStore(subscribe, getSnapshot, () => server);
export const getPracticeDraftsBackup = () => { getSnapshot(); if (!listeners.size && !snapshot.error) read(); return snapshot.state; };
export function reloadPracticeDrafts() { loaded = true; read(); emit(); }
function persist(state: typeof server.state) {
  let error = "";
  try { localStorage.setItem(PRACTICE_DRAFTS_KEY, JSON.stringify(state)); } catch { error = "Draft is only in this tab. Copy your notes or export a full backup before closing."; }
  snapshot = { state, error }; emit();
}
export function updatePracticeDraft(key: string, patch: Partial<PracticeDraft>) {
  const previous = getSnapshot().state;
  const next = editPracticeDraft(previous, key, patch, Date.now());
  if (next === previous) { snapshot = { ...snapshot, error: "Draft limit reached or invalid input. Copy your notes before leaving." }; emit(); return; }
  persist(next);
}
export function clearPracticeDraft(key: string) {
  const entries = { ...getSnapshot().state.entries }; delete entries[key];
  persist({ version: 1, entries });
}
