import {
  ABSENCE_LINES,
  ACTIVITY_FOR,
  AMBIENT_LINES,
  applyTraitDeltas,
  DIALOGUE_LINES,
  deriveTimeOfDay,
  FIRST_MEET_LINES,
  NIGHT_GREETING_LINES,
  pickLine,
  POSE_FOR_KIND,
  SOFT_EVENTS,
  WAKE_LINES,
} from "./behaviour.ts";
import { hashSeed, mulberry32, pickIndex } from "./prng.ts";
import {
  buildUnlockItem,
  checkUnlock,
  nextRoomVariant,
  UNLOCK_LINES,
} from "./unlocks.ts";
import {
  COMPANION_JOURNAL_MAX,
  type CompanionEvent,
  type CompanionEventKind,
  type CompanionReaction,
  type CompanionState,
  type CompanionStats,
  type StepContext,
  type StepResult,
  type TimeOfDay,
} from "./types.ts";

export const COOLDOWN_WINDOW_MS = 5 * 60 * 1000;

const CELEBRATION_KINDS: ReadonlySet<CompanionEventKind> = new Set(["roadmap_milestone", "goal_completed"]);
const INTERACTION_KINDS: ReadonlySet<CompanionEventKind> = new Set(["interaction_pat", "interaction_poke", "interaction_tap"]);

interface DialogueCandidate {
  key: string;
  text: string;
  priority: number;
}

function withinCooldown(state: CompanionState, key: string, occurredAtISO: string): boolean {
  const at = state.cooldowns[key];
  if (!at) return false;
  return Date.parse(occurredAtISO) - Date.parse(at) < COOLDOWN_WINDOW_MS;
}

function applyStats(stats: CompanionStats, event: CompanionEvent): CompanionStats {
  const next: CompanionStats = { ...stats };
  switch (event.kind) {
    case "focus_completed":
      next.sessionsCompleted += 1;
      next.totalFocusMinutes += typeof event.value === "number" ? event.value : 0;
      break;
    case "chapter_completed":
      next.chaptersCompleted = Math.max(next.chaptersCompleted, typeof event.value === "number" ? event.value : next.chaptersCompleted + 1);
      break;
    case "quiz_passed":
      next.quizzesPassed += 1;
      break;
    case "quiz_failed":
      next.quizzesFailed += 1;
      break;
    case "highlight_created":
      next.highlightsCreated = Math.max(next.highlightsCreated, typeof event.value === "number" ? event.value : next.highlightsCreated + 1);
      break;
    case "reflection_saved":
      next.reflectionsSaved = Math.max(next.reflectionsSaved, typeof event.value === "number" ? event.value : next.reflectionsSaved + 1);
      break;
    case "streak_continued":
      next.streaksKept += 1;
      break;
    case "day_completed":
      next.daysActive += 1;
      break;
    case "roadmap_milestone":
      next.milestonesCompleted = Math.max(next.milestonesCompleted, typeof event.value === "number" ? event.value : next.milestonesCompleted + 1);
      break;
    case "protocol_completed":
      next.protocolsCompleted += 1;
      if (event.pillar === "health") next.healthProtocolsCompleted += 1;
      break;
    default:
      break;
  }
  return next;
}

function absenceText(prng: () => number, gapHours: number): string {
  const count = gapHours < 4 ? 0 : gapHours <= 24 ? 1 : 2 + pickIndex(prng, 2);
  const pool = [...ABSENCE_LINES];
  const picks: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = pickIndex(prng, pool.length);
    picks.push(pool[idx] ?? "");
    pool.splice(idx, 1);
  }
  const lines = gapHours > 24 ? ["You're back.", ...picks] : picks;
  return lines.filter(Boolean).join(" ");
}

/**
 * Pure deterministic step: (state, event, ctx) -> (nextState, reactions).
 * One dialogue max per step; traits/stats always apply; replay-safe by event id.
 */
export function stepCompanion(input: CompanionState, event: CompanionEvent, ctx: StepContext): StepResult {
  if (input.journal.some((item) => item.id === event.id)) {
    return { state: input, reactions: [] };
  }

  const now = ctx.now;
  const tod: TimeOfDay = ctx.timeOfDay ?? deriveTimeOfDay(now);
  const prng = mulberry32(hashSeed(input.identity.seed, event.id, event.occurredAt.slice(0, 10)));
  const wasSleeping = input.currentActivity === "sleeping";
  const firstMeet = event.kind === "app_opened" && !input.flags.firstMeetDelivered;

  const next: CompanionState = {
    ...input,
    updatedAt: event.occurredAt,
    lastSeenAt: event.occurredAt,
    traits: applyTraitDeltas(input.traits, event),
    stats: applyStats(input.stats, event),
    cooldowns: { ...input.cooldowns },
    journal: [...input.journal, event].slice(-COMPANION_JOURNAL_MAX),
  };

  const reactions: CompanionReaction[] = [];

  // --- Room unlocks (one at a time, threshold-based; item ownership is the gate) ---
  const unlockId = checkUnlock(next, ctx);
  if (unlockId) {
    const item = buildUnlockItem(unlockId, event.id, event.occurredAt);
    next.room = { variant: nextRoomVariant(next, unlockId), items: [...next.room.items, item] };
    reactions.push({ kind: "room", cooldownKey: `room:${unlockId}`, priority: 1, itemId: unlockId });
  }

  // --- Dialogue ladder (lowest priority wins; cooldown suppresses repeats) ---
  let chosen: DialogueCandidate | null = null;
  if (firstMeet) {
    chosen = { key: "firstMeet", text: pickLine(prng, FIRST_MEET_LINES), priority: 1 };
  } else if (unlockId) {
    chosen = { key: `unlock:${unlockId}`, text: UNLOCK_LINES[unlockId], priority: 1 };
  } else if (CELEBRATION_KINDS.has(event.kind)) {
    chosen = { key: `dialogue:${event.kind}`, text: pickLine(prng, DIALOGUE_LINES[event.kind] ?? []), priority: 1 };
  } else if (event.kind === "returned_after_absence") {
    chosen = { key: "dialogue:returned_after_absence", text: absenceText(prng, typeof event.value === "number" ? event.value : 0), priority: 3 };
  } else if (DIALOGUE_LINES[event.kind]) {
    const waking = wasSleeping && tod !== "night"; // wake line is the greeting for the first exchange
    const isInteraction = INTERACTION_KINDS.has(event.kind);
    if (!waking && (!isInteraction || prng() < 0.35)) {
      chosen = { key: `dialogue:${event.kind}`, text: pickLine(prng, DIALOGUE_LINES[event.kind] ?? []), priority: 2 };
    }
  }

  if (!chosen && tod !== "night" && wasSleeping) {
    chosen = { key: `dialogue:wake:${tod}`, text: pickLine(prng, WAKE_LINES[tod]), priority: 4 };
  }
  if (!chosen && tod === "night" && event.kind === "app_opened") {
    chosen = { key: "dialogue:night-greeting", text: pickLine(prng, NIGHT_GREETING_LINES), priority: 4 };
  }
  if (!chosen) {
    chosen = { key: "dialogue:ambient", text: pickLine(prng, AMBIENT_LINES), priority: 5 };
  }

  if (chosen && !withinCooldown(input, chosen.key, event.occurredAt)) {
    reactions.push({ kind: "dialogue", cooldownKey: chosen.key, priority: chosen.priority, text: chosen.text });
    next.cooldowns[chosen.key] = event.occurredAt;
  }

  // --- Pose (animation; filtered by motion settings in the pump) ---
  const poseId = POSE_FOR_KIND[event.kind];
  if (poseId && !withinCooldown(input, `pose:${event.kind}`, event.occurredAt)) {
    reactions.push({ kind: "pose", cooldownKey: `pose:${event.kind}`, priority: firstMeet || !!unlockId || CELEBRATION_KINDS.has(event.kind) ? 1 : 2, poseId });
    next.cooldowns[`pose:${event.kind}`] = event.occurredAt;
  }

  // --- Emote for direct interactions ---
  if (INTERACTION_KINDS.has(event.kind) && !withinCooldown(input, `emote:${event.kind}`, event.occurredAt)) {
    reactions.push({ kind: "emote", cooldownKey: `emote:${event.kind}`, priority: 2, poseId: "blink" });
    next.cooldowns[`emote:${event.kind}`] = event.occurredAt;
  }

  // --- Activity / sleep / wake ---
  const activeEngagement = !SOFT_EVENTS.has(event.kind);
  if (tod === "night") {
    // The creature sleeps at night; any engagement keeps it asleep. Waking only
    // happens on a non-night event (handled below) so "sleeping" is reachable.
    if (activeEngagement) next.currentActivity = "sleeping";
  } else if (wasSleeping) {
    next.currentActivity = ACTIVITY_FOR[event.kind] ?? "idle";
    next.lastWakeAt = event.occurredAt;
  } else if (activeEngagement) {
    next.currentActivity = ACTIVITY_FOR[event.kind] ?? "idle";
  }

  if (firstMeet) next.flags = { ...next.flags, firstMeetDelivered: true };

  return { state: next, reactions };
}