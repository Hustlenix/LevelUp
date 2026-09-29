import { createEmptyLifeState } from "../life/store-base.ts";
import { LIFE_SKILLS, type LifePreferences, type LifeProfile, type LifeState, type MissionRecord } from "../life/types.ts";
import {
  NEXUS_PROTOCOL_VERSION,
  NEXUS_SCHEMA_VERSION,
  type HybridLogicalClock,
  type NexusAudit,
  type NexusCheckpoint,
  type NexusEnvelope,
  type NexusMergeResult,
  type NexusOperation,
  type NexusProjection,
  type NexusReplica,
  type RegisterCell,
  type RejectedOperation,
  type VersionVector,
} from "./types.ts";

export type NexusOperationInput =
  | { kind: "profile.set"; entityId: "profile"; payload: Extract<NexusOperation, { kind: "profile.set" }>['payload'] }
  | { kind: "preferences.patch"; entityId: "preferences"; payload: Extract<NexusOperation, { kind: "preferences.patch" }>['payload'] }
  | { kind: "mission.complete"; entityId: string; payload: Extract<NexusOperation, { kind: "mission.complete" }>['payload'] };

export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

const SHA256_ROUND = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** Synchronous SHA-256 for canonical protocol digests. AES-GCM authenticates exported packets. */
export function checksum(value: unknown): string {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }
    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + SHA256_ROUND[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
  return [...state].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function isClock(value: unknown, actor?: string): value is HybridLogicalClock {
  if (!isRecord(value)) return false;
  return Number.isSafeInteger(value.wallTime)
    && (value.wallTime as number) >= 0
    && (value.wallTime as number) <= 8_640_000_000_000_000
    && Number.isSafeInteger(value.logical)
    && (value.logical as number) >= 0
    && typeof value.actor === "string"
    && value.actor.length > 0
    && value.actor.length <= 160
    && (!actor || value.actor === actor);
}

function isVector(value: unknown): value is VersionVector {
  return isRecord(value) && Object.entries(value).every(([actor, sequence]) => actor.length > 0
    && actor.length <= 160
    && Number.isSafeInteger(sequence)
    && (sequence as number) >= 0);
}

function isProfile(value: unknown): value is LifeProfile {
  if (!isRecord(value)) return false;
  return typeof value.name === "string"
    && value.name.length <= 40
    && Array.isArray(value.goals)
    && value.goals.length > 0
    && value.goals.length <= LIFE_SKILLS.length
    && value.goals.every((skill) => LIFE_SKILLS.includes(skill as (typeof LIFE_SKILLS)[number]))
    && Number.isFinite(value.minutesPerDay)
    && (value.minutesPerDay as number) >= 5
    && (value.minutesPerDay as number) <= 1_440
    && ["gentle", "steady", "ambitious"].includes(String(value.intensity))
    && ["starting", "sometimes", "consistent"].includes(String(value.consistency))
    && (value.wakeTime === null || typeof value.wakeTime === "string")
    && (value.sleepTime === null || typeof value.sleepTime === "string")
    && isIsoDate(value.createdAt)
    && isIsoDate(value.updatedAt);
}

function isMissionRecord(value: unknown): value is MissionRecord {
  if (!isRecord(value)) return false;
  const validDate = typeof value.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && Number.isFinite(Date.parse(`${value.date}T00:00:00.000Z`))
    && new Date(`${value.date}T00:00:00.000Z`).toISOString().slice(0, 10) === value.date;
  return typeof value.id === "string"
    && value.id.length > 0
    && value.id.length <= 300
    && typeof value.missionId === "string"
    && value.missionId.length > 0
    && value.missionId.length <= 240
    && typeof value.title === "string"
    && value.title.length > 0
    && value.title.length <= 160
    && LIFE_SKILLS.includes(value.skill as (typeof LIFE_SKILLS)[number])
    && Number.isFinite(value.minutes)
    && (value.minutes as number) >= 0
    && (value.minutes as number) <= 1_440
    && Number.isFinite(value.xp)
    && (value.xp as number) >= 0
    && (value.xp as number) <= 100_000
    && validDate
    && isIsoDate(value.completedAt)
    && typeof value.proof === "string"
    && value.proof.length <= 280;
}

function payloadIsValid(operation: Record<string, unknown>): boolean {
  if (!isRecord(operation.payload)) return false;
  if (operation.kind === "profile.set") return operation.entityId === "profile" && isProfile(operation.payload.profile);
  if (operation.kind === "preferences.patch") {
    if (operation.entityId !== "preferences" || !isRecord(operation.payload.patch)) return false;
    const allowed = new Set(["reducedMotion", "sound", "reminders"]);
    return Object.entries(operation.payload.patch).every(([key, value]) => allowed.has(key) && typeof value === "boolean");
  }
  if (operation.kind === "mission.complete") {
    return isMissionRecord(operation.payload.record) && operation.entityId === operation.payload.record.missionId;
  }
  return false;
}

function withoutDigest<T extends { digest: string }>(value: T): Omit<T, "digest"> {
  const rest: Record<string, unknown> = { ...value };
  delete rest.digest;
  return rest as Omit<T, "digest">;
}

export function compareClock(left: HybridLogicalClock, right: HybridLogicalClock): number {
  if (left.wallTime !== right.wallTime) return left.wallTime > right.wallTime ? 1 : -1;
  if (left.logical !== right.logical) return left.logical > right.logical ? 1 : -1;
  return left.actor.localeCompare(right.actor);
}

function newer<T>(left: RegisterCell<T> | undefined | null, right: RegisterCell<T> | undefined | null): RegisterCell<T> | null {
  if (!left) return right ?? null;
  if (!right) return left;
  const order = compareClock(left.clock, right.clock);
  if (order !== 0) return order > 0 ? left : right;
  return left.operationId.localeCompare(right.operationId) >= 0 ? left : right;
}

export function emptyProjection(): NexusProjection {
  return { profile: null, preferences: {}, completions: {} };
}

export function frontierFor(replica: Pick<NexusReplica, "operations" | "checkpoint">): VersionVector {
  const frontier = { ...(replica.checkpoint?.frontier ?? {}) };
  for (const operation of replica.operations) frontier[operation.actor] = Math.max(frontier[operation.actor] ?? 0, operation.sequence);
  return frontier;
}

function tickClock(current: HybridLogicalClock, actor: string, wallTime: number): HybridLogicalClock {
  const wall = Math.max(current.wallTime, wallTime);
  return { wallTime: wall, logical: wall === current.wallTime ? current.logical + 1 : 0, actor };
}

function observeClock(current: HybridLogicalClock, operations: NexusOperation[]): HybridLogicalClock {
  let next = current;
  for (const operation of operations) {
    if (compareClock(operation.clock, next) > 0) next = { ...operation.clock, actor: current.actor };
  }
  return next;
}

function headFor(replica: NexusReplica, actor: string): string | null {
  const own = replica.operations.filter((operation) => operation.actor === actor).sort((a, b) => b.sequence - a.sequence)[0];
  return own?.digest ?? replica.checkpoint?.heads[actor] ?? null;
}

export function createReplica(replicaId: string, workspaceId: string, now = new Date().toISOString()): NexusReplica {
  return {
    schemaVersion: NEXUS_SCHEMA_VERSION,
    protocolVersion: NEXUS_PROTOCOL_VERSION,
    workspaceId,
    replicaId,
    nextSequence: 1,
    clock: { wallTime: 0, logical: 0, actor: replicaId },
    operations: [],
    checkpoint: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function appendOperation(replica: NexusReplica, input: NexusOperationInput, occurredAt = new Date().toISOString()): { replica: NexusReplica; operation: NexusOperation } {
  const wallTime = Number.isFinite(Date.parse(occurredAt)) ? Date.parse(occurredAt) : Date.now();
  const clock = tickClock(replica.clock, replica.replicaId, wallTime);
  const base = {
    schemaVersion: NEXUS_SCHEMA_VERSION,
    id: `${replica.replicaId}:${replica.nextSequence}`,
    workspaceId: replica.workspaceId,
    actor: replica.replicaId,
    sequence: replica.nextSequence,
    clock,
    dependencies: frontierFor(replica),
    kind: input.kind,
    entityId: input.entityId,
    payload: input.payload,
    previousDigest: headFor(replica, replica.replicaId),
  } as Omit<NexusOperation, "digest">;
  const operation = { ...base, digest: checksum(base) } as NexusOperation;
  if (!operationIsValid(operation)) throw new Error(`Invalid ${input.kind} operation payload.`);
  return {
    operation,
    replica: {
      ...replica,
      nextSequence: replica.nextSequence + 1,
      clock,
      operations: [...replica.operations, operation],
      updatedAt: occurredAt,
    },
  };
}

export function operationIsValid(value: unknown): value is NexusOperation {
  if (!isRecord(value)) return false;
  const operation = value as Record<string, unknown>;
  if (operation.schemaVersion !== NEXUS_SCHEMA_VERSION
    || typeof operation.workspaceId !== "string"
    || operation.workspaceId.length === 0
    || operation.workspaceId.length > 160
    || typeof operation.actor !== "string"
    || operation.actor.length === 0
    || operation.actor.length > 160
    || typeof operation.id !== "string"
    || operation.id !== `${operation.actor}:${operation.sequence}`
    || !Number.isSafeInteger(operation.sequence)
    || (operation.sequence as number) <= 0
    || !isClock(operation.clock, operation.actor)
    || !isVector(operation.dependencies)
    || typeof operation.entityId !== "string"
    || operation.entityId.length === 0
    || operation.entityId.length > 240
    || (operation.previousDigest !== null && typeof operation.previousDigest !== "string")
    || typeof operation.digest !== "string"
    || !payloadIsValid(operation)) return false;
  try {
    return checksum(withoutDigest(value as unknown as NexusOperation)) === operation.digest;
  } catch {
    return false;
  }
}

export function applyOperation(projection: NexusProjection, operation: NexusOperation): NexusProjection {
  if (operation.kind === "profile.set") {
    const candidate = { value: operation.payload.profile, clock: operation.clock, operationId: operation.id };
    return { ...projection, profile: newer(projection.profile, candidate) };
  }
  if (operation.kind === "preferences.patch") {
    const preferences = { ...projection.preferences };
    for (const [key, value] of Object.entries(operation.payload.patch) as [keyof LifePreferences, boolean][]) {
      if (typeof value !== "boolean") continue;
      const candidate = { value, clock: operation.clock, operationId: operation.id };
      const winner = newer(preferences[key], candidate);
      if (winner) preferences[key] = winner;
    }
    return { ...projection, preferences };
  }
  const candidate = { value: operation.payload.record, clock: operation.clock, operationId: operation.id };
  return {
    ...projection,
    completions: {
      ...projection.completions,
      [operation.payload.record.missionId]: newer(projection.completions[operation.payload.record.missionId], candidate) as RegisterCell<MissionRecord>,
    },
  };
}

export function mergeProjections(left: NexusProjection, right: NexusProjection): NexusProjection {
  const preferences: NexusProjection["preferences"] = {};
  for (const key of ["reducedMotion", "sound", "reminders"] as const) {
    const winner = newer(left.preferences[key], right.preferences[key]);
    if (winner) preferences[key] = winner;
  }
  const completions: NexusProjection["completions"] = { ...left.completions };
  for (const [missionId, candidate] of Object.entries(right.completions)) {
    completions[missionId] = newer(completions[missionId], candidate) as RegisterCell<MissionRecord>;
  }
  return { profile: newer(left.profile, right.profile), preferences, completions };
}

export function projectReplica(replica: NexusReplica): NexusProjection {
  return replica.operations.reduce(applyOperation, replica.checkpoint?.projection ?? emptyProjection());
}

function deriveStreak(records: MissionRecord[]): LifeState["progression"]["streak"] {
  const dates = [...new Set(records.map((record) => record.date))].sort();
  if (!dates.length) return { current: 0, best: 0, lastDate: null };
  let run = 1;
  let best = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00Z`);
    const current = new Date(`${dates[index]}T00:00:00Z`);
    run = current.getTime() - previous.getTime() === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current: run, best, lastDate: dates[dates.length - 1] };
}

export function materializeLifeState(replica: NexusReplica): LifeState {
  const projection = projectReplica(replica);
  const records = Object.values(projection.completions).map((cell) => cell.value).sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.missionId.localeCompare(b.missionId));
  const projectionClocks = [
    projection.profile?.clock,
    ...Object.values(projection.preferences).map((cell) => cell?.clock),
    ...Object.values(projection.completions).map((cell) => cell.clock),
  ].filter((clock): clock is HybridLogicalClock => Boolean(clock));
  const latestClock = projectionClocks.sort(compareClock).at(-1);
  const projectionUpdatedAt = latestClock ? new Date(latestClock.wallTime).toISOString() : replica.createdAt;
  const state = createEmptyLifeState(projectionUpdatedAt);
  state.profile = projection.profile?.value ?? null;
  state.preferences = {
    reducedMotion: projection.preferences.reducedMotion?.value ?? false,
    sound: projection.preferences.sound?.value ?? false,
    reminders: projection.preferences.reminders?.value ?? false,
  };
  state.progression.completions = records;
  state.progression.totalXp = records.reduce((total, record) => total + record.xp, 0);
  for (const record of records) state.progression.skillXp[record.skill] += record.xp;
  state.progression.streak = deriveStreak(records);
  state.updatedAt = projectionUpdatedAt;
  return state;
}

function vectorMax(left: VersionVector, right: VersionVector): VersionVector {
  const merged = { ...left };
  for (const [actor, sequence] of Object.entries(right)) merged[actor] = Math.max(merged[actor] ?? 0, sequence);
  return merged;
}

function headsFor(replica: NexusReplica): Record<string, string> {
  const heads = { ...(replica.checkpoint?.heads ?? {}) };
  for (const operation of [...replica.operations].sort((a, b) => a.sequence - b.sequence)) heads[operation.actor] = operation.digest;
  return heads;
}

function checkpointDigest(checkpoint: Omit<NexusCheckpoint, "digest">): string {
  return checksum(checkpoint);
}

function registerIsValid<T>(value: unknown, validate: (candidate: unknown) => candidate is T): value is RegisterCell<T> {
  if (!isRecord(value)) return false;
  return validate(value.value)
    && isClock(value.clock)
    && typeof value.operationId === "string"
    && value.operationId.length > 0
    && value.operationId.length <= 340;
}

function projectionIsValid(value: unknown): value is NexusProjection {
  if (!isRecord(value) || !isRecord(value.preferences) || !isRecord(value.completions)) return false;
  if (value.profile !== null && !registerIsValid(value.profile, isProfile)) return false;
  const allowedPreferences = new Set(["reducedMotion", "sound", "reminders"]);
  if (!Object.entries(value.preferences).every(([key, cell]) => allowedPreferences.has(key) && registerIsValid(cell, (candidate): candidate is boolean => typeof candidate === "boolean"))) return false;
  return Object.entries(value.completions).every(([missionId, cell]) => registerIsValid(cell, isMissionRecord) && cell.value.missionId === missionId);
}

function checkpointIsValid(value: unknown): value is NexusCheckpoint {
  if (!isRecord(value)
    || value.schemaVersion !== NEXUS_SCHEMA_VERSION
    || !isVector(value.frontier)
    || !isRecord(value.heads)
    || !Object.entries(value.heads).every(([actor, digest]) => actor.length > 0 && typeof digest === "string" && digest.length > 0)
    || !projectionIsValid(value.projection)
    || !isIsoDate(value.createdAt)
    || typeof value.digest !== "string") return false;
  const heads = value.heads as Record<string, unknown>;
  if (Object.entries(value.frontier).some(([actor, sequence]) => sequence > 0 && typeof heads[actor] !== "string")) return false;
  try {
    return checkpointDigest(withoutDigest(value as unknown as NexusCheckpoint)) === value.digest;
  } catch {
    return false;
  }
}

function mergeCheckpoints(left: NexusCheckpoint | null, right: NexusCheckpoint | null): { checkpoint: NexusCheckpoint | null; forkedActors: string[] } {
  if (!left) return { checkpoint: right, forkedActors: [] };
  if (!right) return { checkpoint: left, forkedActors: [] };
  const forkedActors: string[] = [];
  const heads: Record<string, string> = {};
  const actors = new Set([...Object.keys(left.frontier), ...Object.keys(right.frontier)]);
  for (const actor of actors) {
    const leftSequence = left.frontier[actor] ?? 0;
    const rightSequence = right.frontier[actor] ?? 0;
    if (leftSequence === rightSequence && leftSequence > 0 && left.heads[actor] !== right.heads[actor]) forkedActors.push(actor);
    const head = leftSequence >= rightSequence ? left.heads[actor] : right.heads[actor];
    if (head) heads[actor] = head;
  }
  const base = {
    schemaVersion: NEXUS_SCHEMA_VERSION,
    frontier: vectorMax(left.frontier, right.frontier),
    heads,
    projection: mergeProjections(left.projection, right.projection),
    createdAt: left.createdAt > right.createdAt ? left.createdAt : right.createdAt,
  };
  return { checkpoint: { ...base, digest: checkpointDigest(base) }, forkedActors };
}

export function compactReplica(replica: NexusReplica, now = new Date().toISOString()): NexusReplica {
  const base = {
    schemaVersion: NEXUS_SCHEMA_VERSION,
    frontier: frontierFor(replica),
    heads: headsFor(replica),
    projection: projectReplica(replica),
    createdAt: now,
  };
  return { ...replica, operations: [], checkpoint: { ...base, digest: checkpointDigest(base) }, updatedAt: now };
}

export function createEnvelope(replica: NexusReplica, remoteFrontier: VersionVector = {}, now = new Date().toISOString()): NexusEnvelope {
  const operations = replica.operations.filter((operation) => operation.sequence > (remoteFrontier[operation.actor] ?? 0));
  const base = {
    protocolVersion: NEXUS_PROTOCOL_VERSION,
    workspaceId: replica.workspaceId,
    sender: replica.replicaId,
    frontier: frontierFor(replica),
    checkpoint: replica.checkpoint,
    operations,
    generatedAt: now,
  };
  return { ...base, digest: checksum(base) };
}

export function envelopeIsValid(value: unknown): value is NexusEnvelope {
  if (!isRecord(value)
    || value.protocolVersion !== NEXUS_PROTOCOL_VERSION
    || typeof value.workspaceId !== "string"
    || value.workspaceId.length === 0
    || value.workspaceId.length > 160
    || typeof value.sender !== "string"
    || value.sender.length === 0
    || value.sender.length > 160
    || !isVector(value.frontier)
    || (value.checkpoint !== null && !checkpointIsValid(value.checkpoint))
    || !Array.isArray(value.operations)
    || value.operations.length > 100_000
    || !isIsoDate(value.generatedAt)
    || typeof value.digest !== "string") return false;
  try {
    return checksum(withoutDigest(value as unknown as NexusEnvelope)) === value.digest;
  } catch {
    return false;
  }
}

export function mergeEnvelope(replica: NexusReplica, envelope: NexusEnvelope, options: { adoptWorkspaceIfEmpty?: boolean } = {}): NexusMergeResult {
  if (!envelopeIsValid(envelope)) return { replica, accepted: 0, duplicates: 0, rejected: [{ operationId: "envelope", reason: "invalid-shape" }] };
  const localEmpty = replica.operations.length === 0 && !replica.checkpoint;
  if (envelope.workspaceId !== replica.workspaceId && !(options.adoptWorkspaceIfEmpty && localEmpty)) {
    return { replica, accepted: 0, duplicates: 0, rejected: [{ operationId: "envelope", reason: "workspace-mismatch" }] };
  }
  const workspaceId = envelope.workspaceId;
  const checkpointMerge = mergeCheckpoints(replica.checkpoint, envelope.checkpoint);
  if (checkpointMerge.forkedActors.length) {
    return {
      replica,
      accepted: 0,
      duplicates: 0,
      rejected: checkpointMerge.forkedActors.map((actor) => ({ operationId: `${actor}:checkpoint`, reason: "actor-fork" as const })),
    };
  }
  const checkpoint = checkpointMerge.checkpoint;
  const checkpointFrontier = checkpoint?.frontier ?? {};
  const retained = replica.operations.filter((operation) => operation.sequence > (checkpointFrontier[operation.actor] ?? 0));
  const known = new Map(retained.map((operation) => [operation.id, operation]));
  const sequenceByActor = { ...checkpointFrontier };
  const headByActor = { ...(checkpoint?.heads ?? {}) };
  for (const operation of [...retained].sort((left, right) => left.actor.localeCompare(right.actor) || left.sequence - right.sequence)) {
    const expectedSequence = (sequenceByActor[operation.actor] ?? 0) + 1;
    if (operation.sequence !== expectedSequence || operation.previousDigest !== (headByActor[operation.actor] ?? null)) {
      return { replica, accepted: 0, duplicates: 0, rejected: [{ operationId: operation.id, reason: "actor-fork" }] };
    }
    sequenceByActor[operation.actor] = operation.sequence;
    headByActor[operation.actor] = operation.digest;
  }
  const rejected: RejectedOperation[] = [];
  let accepted = 0;
  let duplicates = 0;
  const incoming = [...envelope.operations].sort((left, right) => left.actor.localeCompare(right.actor) || left.sequence - right.sequence);
  for (const operation of incoming) {
    const operationId = operation.id;
    if (operation.workspaceId !== workspaceId) { rejected.push({ operationId: operation.id, reason: "workspace-mismatch" }); continue; }
    if (!operationIsValid(operation as unknown)) { rejected.push({ operationId, reason: "bad-digest" }); continue; }
    if (operation.sequence <= (checkpointFrontier[operation.actor] ?? 0)) {
      if (operation.sequence === checkpointFrontier[operation.actor] && checkpoint?.heads[operation.actor] !== operation.digest) rejected.push({ operationId: operation.id, reason: "actor-fork" });
      else duplicates += 1;
      continue;
    }
    const existing = known.get(operation.id);
    if (existing) {
      if (existing.digest !== operation.digest) rejected.push({ operationId: operation.id, reason: "actor-fork" });
      else duplicates += 1;
      continue;
    }
    const expectedSequence = (sequenceByActor[operation.actor] ?? 0) + 1;
    if (operation.sequence !== expectedSequence) { rejected.push({ operationId: operation.id, reason: "invalid-shape" }); continue; }
    if (operation.previousDigest !== (headByActor[operation.actor] ?? null)) { rejected.push({ operationId: operation.id, reason: "actor-fork" }); continue; }
    known.set(operation.id, operation);
    sequenceByActor[operation.actor] = operation.sequence;
    headByActor[operation.actor] = operation.digest;
    accepted += 1;
  }
  const operations = [...known.values()].filter((operation) => operation.sequence > (checkpointFrontier[operation.actor] ?? 0));
  operations.sort((a, b) => compareClock(a.clock, b.clock) || a.id.localeCompare(b.id));
  const ownMax = Math.max(checkpointFrontier[replica.replicaId] ?? 0, ...operations.filter((operation) => operation.actor === replica.replicaId).map((operation) => operation.sequence), 0);
  return {
    accepted,
    duplicates,
    rejected,
    replica: {
      ...replica,
      workspaceId,
      checkpoint,
      operations,
      nextSequence: Math.max(replica.nextSequence, ownMax + 1),
      clock: observeClock(replica.clock, incoming.filter((operation) => known.get(operation.id)?.digest === operation.digest)),
      updatedAt: accepted || checkpoint?.digest !== replica.checkpoint?.digest ? envelope.generatedAt : replica.updatedAt,
    },
  };
}

export function replicaDigest(replica: NexusReplica): string {
  return checksum({ workspaceId: replica.workspaceId, frontier: frontierFor(replica), checkpoint: replica.checkpoint?.digest ?? null, operations: replica.operations.map((operation) => operation.digest).sort() });
}

export function auditReplica(replica: NexusReplica): NexusAudit {
  const errors: string[] = [];
  const ids = new Set<string>();
  const byActor = new Map<string, NexusOperation[]>();
  if (replica.schemaVersion !== NEXUS_SCHEMA_VERSION || replica.protocolVersion !== NEXUS_PROTOCOL_VERSION) errors.push("Unsupported replica schema or protocol version.");
  if (replica.checkpoint && checkpointDigest(withoutDigest(replica.checkpoint)) !== replica.checkpoint.digest) errors.push("Checkpoint digest does not match its projection.");
  for (const operation of replica.operations) {
    const operationId = operation.id;
    if (ids.has(operation.id)) errors.push(`Duplicate operation id: ${operation.id}`);
    ids.add(operation.id);
    if (!operationIsValid(operation as unknown)) errors.push(`Invalid operation digest: ${operationId}`);
    const actor = byActor.get(operation.actor) ?? [];
    actor.push(operation);
    byActor.set(operation.actor, actor);
  }
  for (const [actor, operations] of byActor) {
    operations.sort((a, b) => a.sequence - b.sequence);
    let previous = replica.checkpoint?.heads[actor] ?? null;
    let expected = (replica.checkpoint?.frontier[actor] ?? 0) + 1;
    for (const operation of operations) {
      if (operation.sequence !== expected) errors.push(`Sequence gap for ${actor}: expected ${expected}, got ${operation.sequence}.`);
      if (operation.previousDigest !== previous) errors.push(`Hash-chain break at ${operation.id}.`);
      previous = operation.digest;
      expected = operation.sequence + 1;
    }
  }
  return { valid: errors.length === 0, operationCount: replica.operations.length, actorCount: Object.keys(frontierFor(replica)).length, frontier: frontierFor(replica), digest: replicaDigest(replica), errors };
}

export function replicaIsValid(value: unknown): value is NexusReplica {
  if (!value || typeof value !== "object") return false;
  const replica = value as Partial<NexusReplica>;
  if (replica.schemaVersion !== NEXUS_SCHEMA_VERSION
    || replica.protocolVersion !== NEXUS_PROTOCOL_VERSION
    || typeof replica.workspaceId !== "string"
    || !replica.workspaceId
    || typeof replica.replicaId !== "string"
    || !replica.replicaId
    || !Number.isSafeInteger(replica.nextSequence)
    || (replica.nextSequence as number) <= 0
    || !isClock(replica.clock, replica.replicaId)
    || !Array.isArray(replica.operations)
    || (replica.checkpoint !== null && !checkpointIsValid(replica.checkpoint))
    || !isIsoDate(replica.createdAt)
    || !isIsoDate(replica.updatedAt)) return false;
  if (!replica.operations.every(operationIsValid)) return false;
  return auditReplica(replica as NexusReplica).valid;
}
