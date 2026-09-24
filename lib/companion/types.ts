import type { Pillar } from "../types.ts";

export type { StorageLike } from "../os/store.ts";

export const COMPANION_KEY = "levelup-companion-v1";
export const COMPANION_SCHEMA_VERSION = 1 as const;
export const COMPANION_JOURNAL_MAX = 64 as const;
export const COMPANION_PENDING_KEY = "levelup-companion-events-v1";
export const COMPANION_PENDING_MAX = 128 as const;
export const COMPANION_SETTINGS_KEY = "levelup-companion-settings-v1";

export type CompanionTraitName =
  | "energy"
  | "mood"
  | "curiosity"
  | "focus"
  | "knowledge"
  | "confidence"
  | "relationship";

export type CompanionTraits = Record<CompanionTraitName, number>;

export type CompanionActivity = "idle" | "reading" | "focusing" | "recovering" | "sleeping" | "away";

export type TimeOfDay = "morning" | "day" | "evening" | "night";

export type RoomVariant = "basic" | "self" | "wealth" | "health" | "love" | "full";

export type UnlockItemId =
  | "book"
  | "lamp"
  | "mat"
  | "shelf-self"
  | "desk-wealth"
  | "window-health"
  | "nook-love"
  | "full-room"
  | "corkboard"
  | "trophy-shelf"
  | "window-outside";

export interface UnlockItem {
  id: string;
  kind: UnlockItemId;
  unlockedAt: string;
  sourceEventId: string;
}

export type CompanionEventKind =
  | "focus_started"
  | "focus_completed"
  | "focus_interrupted"
  | "chapter_started"
  | "chapter_completed"
  | "quiz_passed"
  | "quiz_failed"
  | "highlight_created"
  | "reflection_saved"
  | "session_recovered"
  | "goal_created"
  | "goal_progressed"
  | "goal_completed"
  | "protocol_started"
  | "protocol_completed"
  | "streak_continued"
  | "streak_broken"
  | "study_session_completed"
  | "task_completed"
  | "day_completed"
  | "roadmap_milestone"
  | "app_opened"
  | "returned_after_absence"
  | "interaction_pat"
  | "interaction_poke"
  | "interaction_tap";

export interface CompanionEvent {
  id: string;
  kind: CompanionEventKind;
  occurredAt: string;
  value?: number;
  note?: string;
  pillar?: Pillar;
}

export interface CompanionStats {
  totalFocusMinutes: number;
  sessionsCompleted: number;
  chaptersCompleted: number;
  quizzesPassed: number;
  quizzesFailed: number;
  highlightsCreated: number;
  reflectionsSaved: number;
  streaksKept: number;
  daysActive: number;
  milestonesCompleted: number;
  protocolsCompleted: number;
  healthProtocolsCompleted: number;
}

export interface CompanionFlags {
  firstMeetDelivered: boolean;
}

export interface CompanionAdapterCursor {
  lastOSEventIndex: number;
  seenMilestoneCount: number;
  lastAppOpenDate: string | null;
}

export interface CompanionIdentity {
  name: string;
  bornAt: string;
  seed: number;
}

export interface CompanionRoom {
  variant: RoomVariant;
  items: UnlockItem[];
}

export interface CompanionState {
  schemaVersion: typeof COMPANION_SCHEMA_VERSION;
  updatedAt: string;
  identity: CompanionIdentity;
  traits: CompanionTraits;
  currentActivity: CompanionActivity;
  lastSeenAt: string;
  lastWakeAt: string | null;
  room: CompanionRoom;
  journal: CompanionEvent[];
  cooldowns: Record<string, string>;
  stats: CompanionStats;
  flags: CompanionFlags;
  adapter: CompanionAdapterCursor;
}

export type CompanionReactionKind = "dialogue" | "pose" | "room" | "emote";

export interface CompanionReaction {
  kind: CompanionReactionKind;
  cooldownKey: string;
  priority: number;
  text?: string;
  poseId?: string;
  itemId?: string;
}

export interface PillarChapterProgress {
  complete: number;
  total: number;
}

/** World-clock context passed into every deterministic step. */
export interface StepContext {
  now: Date;
  timeOfDay?: TimeOfDay;
  pillarChapters?: Partial<Record<Pillar, PillarChapterProgress>>;
  roadmap90dComplete?: boolean;
}

export interface StepResult {
  state: CompanionState;
  reactions: CompanionReaction[];
}

export interface CompanionSettings {
  enabled: boolean;
  motion: "full" | "reduced" | "off";
  dialogue: "normal" | "minimal" | "off";
  sound: boolean;
}

export interface PumpResult {
  state: CompanionState;
  reactions: CompanionReaction[];
  events: CompanionEvent[];
  skipped: boolean;
}

export const COMPANION_TRAIT_ORDER: CompanionTraitName[] = [
  "energy",
  "mood",
  "curiosity",
  "focus",
  "knowledge",
  "confidence",
  "relationship",
];