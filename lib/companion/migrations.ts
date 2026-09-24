import {
  COMPANION_SCHEMA_VERSION,
  type CompanionActivity,
  type CompanionEvent,
  type CompanionState,
  type CompanionStats,
  type CompanionTraits,
  type CompanionTraitName,
  type RoomVariant,
  type StorageLike,
  type UnlockItem,
} from "./types.ts";

const TRAIT_NAMES: CompanionTraitName[] = [
  "energy",
  "mood",
  "curiosity",
  "focus",
  "knowledge",
  "confidence",
  "relationship",
];

const ACTIVITIES: CompanionActivity[] = ["idle", "reading", "focusing", "recovering", "sleeping", "away"];
const ROOM_VARIANTS: RoomVariant[] = ["basic", "self", "wealth", "health", "love", "full"];

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampTrait(value: unknown, fallback: number): number {
  const number = numberValue(value, fallback);
  return Math.max(0, Math.min(100, number));
}

function traitsFrom(value: unknown): CompanionTraits {
  const input = record(value);
  const traits: CompanionTraits = {
    energy: 70,
    mood: 65,
    curiosity: 60,
    focus: 55,
    knowledge: 30,
    confidence: 50,
    relationship: 40,
  };
  if (!input) return traits;
  for (const name of TRAIT_NAMES) {
    const current = traits[name];
    traits[name] = clampTrait(input[name], current);
  }
  return traits;
}

function statsFrom(value: unknown): CompanionStats {
  const input = record(value);
  const stats: CompanionStats = {
    totalFocusMinutes: 0,
    sessionsCompleted: 0,
    chaptersCompleted: 0,
    quizzesPassed: 0,
    quizzesFailed: 0,
    highlightsCreated: 0,
    reflectionsSaved: 0,
    streaksKept: 0,
    daysActive: 0,
    milestonesCompleted: 0,
    protocolsCompleted: 0,
    healthProtocolsCompleted: 0,
  };
  if (!input) return stats;
  for (const key of Object.keys(stats) as (keyof CompanionStats)[]) {
    stats[key] = numberValue(input[key], stats[key]);
  }
  return stats;
}

function emptyState(now: string, seed: number): CompanionState {
  return {
    schemaVersion: COMPANION_SCHEMA_VERSION,
    updatedAt: now,
    identity: { name: "Milo", bornAt: now, seed },
    traits: traitsFrom(null),
    currentActivity: "idle",
    lastSeenAt: now,
    lastWakeAt: null,
    room: { variant: "basic", items: [] },
    journal: [],
    cooldowns: {},
    stats: statsFrom(null),
    flags: { firstMeetDelivered: false },
    adapter: { lastOSEventIndex: 0, seenMilestoneCount: 0, lastAppOpenDate: null },
  };
}

export function createEmptyCompanionState(now = new Date().toISOString(), seed = Math.floor(Math.random() * 0xffffffff)): CompanionState {
  return emptyState(now, seed);
}

function normalizeEvent(value: unknown): CompanionEvent | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.kind !== "string" || typeof input.occurredAt !== "string") return null;
  return {
    id: input.id,
    kind: input.kind as CompanionEvent["kind"],
    occurredAt: input.occurredAt,
    ...(typeof input.value === "number" ? { value: input.value } : {}),
    ...(typeof input.note === "string" ? { note: input.note } : {}),
    ...(typeof input.pillar === "string" ? { pillar: input.pillar as CompanionEvent["pillar"] } : {}),
  };
}

function normalizeUnlockItem(value: unknown): UnlockItem | null {
  const input = record(value);
  if (!input || typeof input.id !== "string" || typeof input.kind !== "string" || typeof input.unlockedAt !== "string" || typeof input.sourceEventId !== "string") return null;
  return { id: input.id, kind: input.kind as UnlockItem["kind"], unlockedAt: input.unlockedAt, sourceEventId: input.sourceEventId };
}

export function validateCompanionState(value: unknown): { ok: boolean; errors: string[]; state?: CompanionState } {
  const input = record(value);
  const errors: string[] = [];
  if (!input || input.schemaVersion !== COMPANION_SCHEMA_VERSION) return { ok: false, errors: ["companionState.schemaVersion is unsupported."] };
  if (typeof input.updatedAt !== "string") errors.push("companionState.updatedAt must be a string.");
  if (typeof input.lastSeenAt !== "string") errors.push("companionState.lastSeenAt must be a string.");
  if (input.lastWakeAt !== null && typeof input.lastWakeAt !== "string") errors.push("companionState.lastWakeAt must be a string or null.");
  const identity = record(input.identity);
  if (!identity || typeof identity.name !== "string" || typeof identity.bornAt !== "string" || typeof identity.seed !== "number") errors.push("companionState.identity is invalid.");
  if (!record(input.traits)) errors.push("companionState.traits must be an object.");
  if (typeof input.currentActivity !== "string" || !ACTIVITIES.includes(input.currentActivity as CompanionActivity)) errors.push("companionState.currentActivity is invalid.");
  const room = record(input.room);
  if (!room || typeof room.variant !== "string" || !ROOM_VARIANTS.includes(room.variant as RoomVariant) || !Array.isArray(room.items)) errors.push("companionState.room is invalid.");
  if (!Array.isArray(input.journal)) errors.push("companionState.journal must be an array.");
  if (!record(input.cooldowns)) errors.push("companionState.cooldowns must be an object.");
  if (!record(input.stats)) errors.push("companionState.stats must be an object.");
  const flags = record(input.flags);
  if (!flags || typeof flags.firstMeetDelivered !== "boolean") errors.push("companionState.flags is invalid.");
  const adapter = record(input.adapter);
  if (!adapter || typeof adapter.lastOSEventIndex !== "number" || typeof adapter.seenMilestoneCount !== "number" || (adapter.lastAppOpenDate !== null && typeof adapter.lastAppOpenDate !== "string")) errors.push("companionState.adapter is invalid.");
  if (Array.isArray(input.journal)) {
    for (const event of input.journal) if (!normalizeEvent(event)) errors.push("companionState.journal has an invalid entry.");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], state: input as unknown as CompanionState };
}

/**
 * Additive repair for schema 1 states that are missing/stale fields;
 * anything fundamentally new is rejected (companion has no legacy format).
 */
export function migrateCompanionState(value: unknown, now = new Date().toISOString()): { ok: boolean; migrated: boolean; errors: string[]; state: CompanionState } {
  const current = validateCompanionState(value);
  if (current.ok && current.state) return { ok: true, migrated: false, errors: [], state: current.state };
  const input = record(value);
  if (!input || input.schemaVersion !== COMPANION_SCHEMA_VERSION) return { ok: false, migrated: false, errors: current.errors, state: emptyState(now, Math.floor(Math.random() * 0xffffffff)) };
  const identity = record(input.identity) ?? record(null);
  const room = record(input.room);
  const adapter = record(input.adapter);
  const flags = record(input.flags);
  const state = emptyState(now, typeof identity?.seed === "number" ? identity.seed : Math.floor(Math.random() * 0xffffffff));
  state.updatedAt = stringValue(input.updatedAt, now);
  state.lastSeenAt = stringValue(input.lastSeenAt, now);
  state.lastWakeAt = typeof input.lastWakeAt === "string" ? input.lastWakeAt : null;
  state.identity = {
    name: stringValue(identity?.name, "Milo"),
    bornAt: stringValue(identity?.bornAt, now),
    seed: typeof identity?.seed === "number" ? identity.seed : state.identity.seed,
  };
  state.traits = traitsFrom(input.traits);
  state.currentActivity = typeof input.currentActivity === "string" && ACTIVITIES.includes(input.currentActivity as CompanionActivity) ? (input.currentActivity as CompanionActivity) : "idle";
  if (room && typeof room.variant === "string" && ROOM_VARIANTS.includes(room.variant as RoomVariant)) state.room.variant = room.variant as RoomVariant;
  if (room && Array.isArray(room.items)) state.room.items = room.items.map(normalizeUnlockItem).filter((item): item is UnlockItem => item !== null);
  if (Array.isArray(input.journal)) state.journal = input.journal.map(normalizeEvent).filter((event): event is CompanionEvent => event !== null).slice(-64);
  const cooldowns = record(input.cooldowns);
  if (cooldowns) {
    for (const [key, value] of Object.entries(cooldowns)) if (typeof value === "string") state.cooldowns[key] = value;
  }
  state.stats = statsFrom(input.stats);
  if (flags && typeof flags.firstMeetDelivered === "boolean") state.flags.firstMeetDelivered = flags.firstMeetDelivered;
  if (adapter) {
    state.adapter.lastOSEventIndex = numberValue(adapter.lastOSEventIndex, 0);
    state.adapter.seenMilestoneCount = numberValue(adapter.seenMilestoneCount, 0);
    state.adapter.lastAppOpenDate = typeof adapter.lastAppOpenDate === "string" ? adapter.lastAppOpenDate : null;
  }
  return { ok: true, migrated: true, errors: [], state };
}

/** Type-only re-export so callers can describe storage without importing store internals. */
export type { StorageLike };