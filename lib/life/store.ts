"use client";

import { useSyncExternalStore } from "react";
import {
  appendOperation,
  auditReplica,
  compactReplica,
  createEnvelope,
  createReplica,
  frontierFor,
  materializeLifeState,
  mergeEnvelope,
  mirrorReplica,
  readMirroredReplica,
  replicaIsValid,
  type NexusEnvelope,
  type NexusMergeResult,
  type NexusReplica,
} from "../nexus/index.ts";
import { applyMissionCompletion, missionIsComplete } from "./engine.ts";
import { createEmptyLifeState } from "./store-base.ts";
import { LIFE_SCHEMA_VERSION, LIFE_SKILLS, type DailyMission, type LifeProfile, type LifeState } from "./types.ts";

export { createEmptyLifeState } from "./store-base.ts";

export const LIFE_STATE_KEY = "levelup-life-state-v1";
export const NEXUS_REPLICA_KEY = "levelup-nexus-replica-v1";
const CHANNEL_NAME = "levelup-nexus-v1";

type ReplicaSource = "nexus" | "legacy" | "fresh";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
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

/** Reads the v1 materialized snapshot. Nexus remains the source of truth in the live store. */
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

function identifier(prefix: "workspace" | "replica"): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function withRuntimeIdentity(replica: NexusReplica): NexusReplica {
  const replicaId = identifier("replica");
  return {
    ...replica,
    replicaId,
    nextSequence: (frontierFor(replica)[replicaId] ?? 0) + 1,
    clock: { ...replica.clock, actor: replicaId },
  };
}

export function migrateLifeState(state: LifeState, replicaId: string, workspaceId: string): NexusReplica {
  const safeDate = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "1970-01-01T00:00:00.000Z";
  const stateUpdatedAt = safeDate(state.updatedAt);
  let replica = createReplica(replicaId, workspaceId, stateUpdatedAt);
  const events: Array<{ at: string; order: number; append: () => void }> = [];
  if (state.profile) {
    const profile = state.profile;
    events.push({
      at: safeDate(profile.updatedAt),
      order: 0,
      append: () => { replica = appendOperation(replica, { kind: "profile.set", entityId: "profile", payload: { profile } }, safeDate(profile.updatedAt)).replica; },
    });
  }
  for (const record of state.progression.completions) {
    events.push({
      at: safeDate(record.completedAt),
      order: 1,
      append: () => { replica = appendOperation(replica, { kind: "mission.complete", entityId: record.missionId, payload: { record } }, safeDate(record.completedAt)).replica; },
    });
  }
  events.push({
    at: stateUpdatedAt,
    order: 2,
    append: () => { replica = appendOperation(replica, { kind: "preferences.patch", entityId: "preferences", payload: { patch: state.preferences } }, stateUpdatedAt).replica; },
  });
  events.sort((left, right) => left.at.localeCompare(right.at) || left.order - right.order);
  for (const event of events) {
    try { event.append(); } catch { /* corrupt legacy entries are omitted instead of poisoning the new replica */ }
  }
  return replica;
}

function loadReplica(target: Pick<Storage, "getItem"> | null): { replica: NexusReplica; source: ReplicaSource } {
  if (!target) return { replica: createReplica("replica-server", "workspace-server"), source: "fresh" };
  try {
    const raw = target.getItem(NEXUS_REPLICA_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (replicaIsValid(parsed)) return { replica: withRuntimeIdentity(parsed), source: "nexus" };
    }
  } catch { /* fall through to the verified materialized snapshot */ }
  const legacy = readLifeState(target);
  const replicaId = identifier("replica");
  const workspaceId = identifier("workspace");
  const populated = Boolean(legacy.profile || legacy.progression.completions.length || Object.values(legacy.preferences).some(Boolean));
  return {
    replica: populated ? migrateLifeState(legacy, replicaId, workspaceId) : createReplica(replicaId, workspaceId, new Date().toISOString()),
    source: populated ? "legacy" : "fresh",
  };
}

let replicaCache: NexusReplica | null = null;
let stateCache: LifeState | null = null;
let transport: BroadcastChannel | null = null;
let transportReady = false;
let mirrorRecoveryStarted = false;
const listeners = new Set<() => void>();
const SERVER_STATE = Object.freeze(createEmptyLifeState());
const SERVER_REPLICA = Object.freeze(createReplica("replica-server", "workspace-server"));

function emit(): void {
  for (const listener of listeners) listener();
}

function persistLocal(replica: NexusReplica): void {
  const target = storage();
  if (!target) return;
  try {
    target.setItem(NEXUS_REPLICA_KEY, JSON.stringify(replica));
    target.setItem(LIFE_STATE_KEY, JSON.stringify(materializeLifeState(replica)));
  } catch { /* IndexedDB mirror and in-memory state remain available. */ }
}

function publish(replica: NexusReplica): void {
  try { transport?.postMessage(createEnvelope(replica)); } catch { /* storage events remain as a fallback */ }
}

function acceptReplica(next: NexusReplica, options: { announce?: boolean; mirror?: boolean } = {}): NexusReplica {
  replicaCache = next;
  stateCache = materializeLifeState(next);
  persistLocal(next);
  if (options.mirror !== false) void mirrorReplica(next).catch(() => undefined);
  if (options.announce) publish(next);
  emit();
  return next;
}

function replicaIsEmpty(replica: NexusReplica): boolean {
  return !replica.checkpoint && replica.operations.length === 0;
}

function acceptEnvelope(envelope: NexusEnvelope, announce = false): NexusMergeResult {
  const current = getNexusReplicaSnapshot();
  const result = mergeEnvelope(current, envelope, { adoptWorkspaceIfEmpty: replicaIsEmpty(current) });
  if (result.replica !== current && (result.accepted > 0 || result.replica.checkpoint?.digest !== current.checkpoint?.digest)) {
    acceptReplica(result.replica, { announce });
  }
  return result;
}

function ensureTransport(): void {
  if (transportReady || typeof window === "undefined") return;
  transportReady = true;
  if (typeof BroadcastChannel !== "undefined") {
    transport = new BroadcastChannel(CHANNEL_NAME);
    transport.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== "object") return;
      acceptEnvelope(event.data as NexusEnvelope);
    });
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== NEXUS_REPLICA_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (replicaIsValid(parsed)) acceptEnvelope(createEnvelope(parsed));
    } catch { /* ignore partial or malformed writes */ }
  });
}

function recoverFromMirrorIfNeeded(source: ReplicaSource): void {
  if (mirrorRecoveryStarted || typeof window === "undefined") return;
  mirrorRecoveryStarted = true;
  void readMirroredReplica().then((mirrored) => {
    const current = getNexusReplicaSnapshot();
    if (!mirrored) {
      void mirrorReplica(current).catch(() => undefined);
      return;
    }
    if (source === "fresh" && replicaIsEmpty(current)) {
      acceptReplica(withRuntimeIdentity(mirrored), { announce: true });
      return;
    }
    if (mirrored.workspaceId === current.workspaceId) acceptEnvelope(createEnvelope(mirrored));
    void mirrorReplica(getNexusReplicaSnapshot()).catch(() => undefined);
  }).catch(() => undefined);
}

function initialize(): NexusReplica {
  if (replicaCache) return replicaCache;
  const loaded = loadReplica(storage());
  replicaCache = loaded.replica;
  stateCache = materializeLifeState(loaded.replica);
  persistLocal(loaded.replica);
  ensureTransport();
  recoverFromMirrorIfNeeded(loaded.source);
  return loaded.replica;
}

function refreshFromWriteAheadLog(): NexusReplica {
  const current = initialize();
  const target = storage();
  if (!target) return current;
  try {
    const raw = target.getItem(NEXUS_REPLICA_KEY);
    if (!raw) return current;
    const parsed: unknown = JSON.parse(raw);
    if (replicaIsValid(parsed) && parsed.workspaceId === current.workspaceId) {
      const result = mergeEnvelope(current, createEnvelope(parsed));
      if (result.accepted || result.replica.checkpoint?.digest !== current.checkpoint?.digest) {
        replicaCache = result.replica;
        stateCache = materializeLifeState(result.replica);
        return result.replica;
      }
    }
  } catch { /* keep the validated in-memory replica */ }
  return current;
}

function appendLocal(input: Parameters<typeof appendOperation>[1], occurredAt: string): LifeState {
  const current = refreshFromWriteAheadLog();
  let next = appendOperation(current, input, occurredAt).replica;
  if (next.operations.length > 512) next = compactReplica(next, occurredAt);
  acceptReplica(next, { announce: true });
  return stateCache as LifeState;
}

export function getNexusReplicaSnapshot(): NexusReplica {
  return initialize();
}

export function getLifeStateSnapshot(): LifeState {
  initialize();
  return stateCache as LifeState;
}

function subscribe(listener: () => void): () => void {
  ensureTransport();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLifeStore(): LifeState {
  return useSyncExternalStore(subscribe, getLifeStateSnapshot, () => SERVER_STATE);
}

export function useNexusStore(): NexusReplica {
  return useSyncExternalStore(subscribe, getNexusReplicaSnapshot, () => SERVER_REPLICA as NexusReplica);
}

export function saveLifeProfile(input: Omit<LifeProfile, "createdAt" | "updatedAt">): LifeState {
  const current = getLifeStateSnapshot();
  const now = new Date().toISOString();
  const profile: LifeProfile = { ...input, createdAt: current.profile?.createdAt ?? now, updatedAt: now };
  return appendLocal({ kind: "profile.set", entityId: "profile", payload: { profile } }, now);
}

export function quickStartLife(): LifeState {
  return saveLifeProfile({ name: "", goals: ["focus", "discipline", "mind"], minutesPerDay: 30, intensity: "steady", consistency: "starting", wakeTime: null, sleepTime: null });
}

export function completeLifeMission(mission: DailyMission, proof = ""): LifeState {
  const current = getLifeStateSnapshot();
  if (missionIsComplete(current, mission.id)) return current;
  const now = new Date().toISOString();
  const projected = applyMissionCompletion(current, mission, now, proof);
  const record = projected.progression.completions.at(-1);
  if (!record) return current;
  return appendLocal({ kind: "mission.complete", entityId: mission.id, payload: { record } }, now);
}

export function updateLifePreferences(patch: Partial<LifeState["preferences"]>): LifeState {
  const clean = Object.fromEntries(Object.entries(patch).filter((entry): entry is [keyof LifeState["preferences"], boolean] => typeof entry[1] === "boolean"));
  if (!Object.keys(clean).length) return getLifeStateSnapshot();
  const now = new Date().toISOString();
  return appendLocal({ kind: "preferences.patch", entityId: "preferences", payload: { patch: clean } }, now);
}

export function mergeNexusEnvelope(envelope: NexusEnvelope): NexusMergeResult {
  return acceptEnvelope(envelope, true);
}

export function compactNexusStore(): NexusReplica {
  const next = compactReplica(refreshFromWriteAheadLog());
  return acceptReplica(next, { announce: true });
}

export function auditNexusStore() {
  return auditReplica(getNexusReplicaSnapshot());
}

export function resetLifeState(): LifeState {
  const now = new Date().toISOString();
  const next = createReplica(identifier("replica"), identifier("workspace"), now);
  acceptReplica(next, { announce: false });
  return stateCache as LifeState;
}

/** Backup restore is an explicit replacement, so its legacy snapshot starts a new workspace. */
export function reloadLifeStateCache(): void {
  const target = storage();
  try {
    const raw = target?.getItem(NEXUS_REPLICA_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (replicaIsValid(parsed)) {
        acceptReplica(withRuntimeIdentity(parsed), { announce: false });
        return;
      }
    }
  } catch { /* fall back to the materialized snapshot below */ }
  const restored = readLifeState(target);
  const now = new Date().toISOString();
  const next = isLifeState(restored)
    ? migrateLifeState(restored, identifier("replica"), identifier("workspace"))
    : createReplica(identifier("replica"), identifier("workspace"), now);
  acceptReplica(next, { announce: false });
}
