"use client";

import { useSyncExternalStore } from "react";
import { applyMissionCompletion } from "./engine.ts";
import { LIFE_SCHEMA_VERSION, LIFE_SKILLS, type DailyMission, type LifeProfile, type LifeSkill, type LifeState } from "./types.ts";

export const LIFE_STATE_KEY = "levelup-life-state-v1";

const emptySkillXp = (): Record<LifeSkill, number> => Object.fromEntries(LIFE_SKILLS.map((skill) => [skill, 0])) as Record<LifeSkill, number>;

export function createEmptyLifeState(now = "1970-01-01T00:00:00.000Z"): LifeState {
  return {
    schemaVersion: LIFE_SCHEMA_VERSION,
    profile: null,
    progression: { totalXp: 0, skillXp: emptySkillXp(), completions: [], streak: { current: 0, best: 0, lastDate: null } },
    preferences: { reducedMotion: false, sound: false, reminders: false },
    updatedAt: now,
  };
}

export function isLifeState(value: unknown): value is LifeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LifeState>;
  if (state.schemaVersion !== LIFE_SCHEMA_VERSION || !state.progression || !state.preferences) return false;
  const progression = state.progression;
  if (typeof progression.totalXp !== "number" || !Array.isArray(progression.completions)) return false;
  if (!progression.skillXp || !LIFE_SKILLS.every((skill) => typeof progression.skillXp[skill] === "number")) return false;
  if (state.profile !== null && (!state.profile || !Array.isArray(state.profile.goals) || typeof state.profile.name !== "string")) return false;
  return true;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function readLifeState(target: Pick<Storage, "getItem"> | null = storage()): LifeState {
  if (!target) return createEmptyLifeState();
  try {
    const raw = target.getItem(LIFE_STATE_KEY);
    if (!raw) return createEmptyLifeState(new Date().toISOString());
    const parsed: unknown = JSON.parse(raw);
    return isLifeState(parsed) ? parsed : createEmptyLifeState(new Date().toISOString());
  } catch {
    return createEmptyLifeState(new Date().toISOString());
  }
}

let cache: LifeState | null = null;
const listeners = new Set<() => void>();
const SERVER_STATE = Object.freeze(createEmptyLifeState());

function emit() { for (const listener of listeners) listener(); }
function write(next: LifeState) {
  cache = next;
  try { storage()?.setItem(LIFE_STATE_KEY, JSON.stringify(next)); } catch { /* local-only fallback */ }
  emit();
  return next;
}

export function getLifeStateSnapshot(): LifeState {
  if (!cache) cache = readLifeState();
  return cache;
}

export function useLifeStore(): LifeState {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, getLifeStateSnapshot, () => SERVER_STATE);
}

export function saveLifeProfile(input: Omit<LifeProfile, "createdAt" | "updatedAt">): LifeState {
  const current = getLifeStateSnapshot();
  const now = new Date().toISOString();
  return write({
    ...current,
    profile: { ...input, createdAt: current.profile?.createdAt ?? now, updatedAt: now },
    updatedAt: now,
  });
}

export function quickStartLife(): LifeState {
  return saveLifeProfile({ name: "", goals: ["focus", "discipline", "mind"], minutesPerDay: 30, intensity: "steady", consistency: "starting", wakeTime: null, sleepTime: null });
}

export function completeLifeMission(mission: DailyMission, proof = ""): LifeState {
  return write(applyMissionCompletion(getLifeStateSnapshot(), mission, new Date().toISOString(), proof));
}

export function updateLifePreferences(patch: Partial<LifeState["preferences"]>): LifeState {
  const current = getLifeStateSnapshot();
  const now = new Date().toISOString();
  return write({ ...current, preferences: { ...current.preferences, ...patch }, updatedAt: now });
}

export function resetLifeState(): LifeState {
  return write(createEmptyLifeState(new Date().toISOString()));
}

export function reloadLifeStateCache(): void {
  cache = null;
  emit();
}
