import type { LifeProfile, LifePreferences, MissionRecord } from "../life/types.ts";

export const NEXUS_SCHEMA_VERSION = 1 as const;
export const NEXUS_PROTOCOL_VERSION = 1 as const;

export type VersionVector = Record<string, number>;

export interface HybridLogicalClock {
  wallTime: number;
  logical: number;
  actor: string;
}

export type NexusOperation =
  | NexusBaseOperation<"profile.set", { profile: LifeProfile }>
  | NexusBaseOperation<"preferences.patch", { patch: Partial<LifePreferences> }>
  | NexusBaseOperation<"mission.complete", { record: MissionRecord }>;

export interface NexusBaseOperation<Kind extends string, Payload> {
  schemaVersion: typeof NEXUS_SCHEMA_VERSION;
  id: string;
  workspaceId: string;
  actor: string;
  sequence: number;
  clock: HybridLogicalClock;
  dependencies: VersionVector;
  kind: Kind;
  entityId: string;
  payload: Payload;
  previousDigest: string | null;
  digest: string;
}

export interface RegisterCell<T> {
  value: T;
  clock: HybridLogicalClock;
  operationId: string;
}

export interface NexusProjection {
  profile: RegisterCell<LifeProfile> | null;
  preferences: Partial<Record<keyof LifePreferences, RegisterCell<boolean>>>;
  completions: Record<string, RegisterCell<MissionRecord>>;
}

export interface NexusCheckpoint {
  schemaVersion: typeof NEXUS_SCHEMA_VERSION;
  frontier: VersionVector;
  heads: Record<string, string>;
  projection: NexusProjection;
  createdAt: string;
  digest: string;
}

export interface NexusReplica {
  schemaVersion: typeof NEXUS_SCHEMA_VERSION;
  protocolVersion: typeof NEXUS_PROTOCOL_VERSION;
  workspaceId: string;
  replicaId: string;
  nextSequence: number;
  clock: HybridLogicalClock;
  operations: NexusOperation[];
  checkpoint: NexusCheckpoint | null;
  createdAt: string;
  updatedAt: string;
}

export interface NexusEnvelope {
  protocolVersion: typeof NEXUS_PROTOCOL_VERSION;
  workspaceId: string;
  sender: string;
  frontier: VersionVector;
  checkpoint: NexusCheckpoint | null;
  operations: NexusOperation[];
  generatedAt: string;
  digest: string;
}

export interface RejectedOperation {
  operationId: string;
  reason: "invalid-shape" | "bad-digest" | "actor-fork" | "workspace-mismatch";
}

export interface NexusMergeResult {
  replica: NexusReplica;
  accepted: number;
  duplicates: number;
  rejected: RejectedOperation[];
}

export interface NexusAudit {
  valid: boolean;
  operationCount: number;
  actorCount: number;
  frontier: VersionVector;
  digest: string;
  errors: string[];
}

export interface NexusEncryptedPacket {
  packetVersion: 1;
  algorithm: "AES-GCM-256";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  roomId: string;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
}

