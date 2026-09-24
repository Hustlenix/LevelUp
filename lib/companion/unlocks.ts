import type {
  CompanionState,
  RoomVariant,
  StepContext,
  UnlockItem,
  UnlockItemId,
} from "./types.ts";

/** One line per unlock, spoken when the item appears. Calm, never gushing. */
export const UNLOCK_LINES: Record<UnlockItemId, string> = {
  book: "A book for the desk. Your first finished chapter earned it.",
  lamp: "Lamp's on — five focus sessions paid for the light.",
  mat: "A mat by the wall. First health protocol done.",
  "shelf-self": "The self shelf goes up — all Self chapters complete.",
  "desk-wealth": "Desk upgraded, ledger out. All Wealth chapters complete.",
  "window-health": "A window, and a plant in the light. All Health chapters complete.",
  "nook-love": "A second chair and a framed photo. All Love chapters complete.",
  "full-room": "The whole room came together. Every pillar is done.",
  corkboard: "Corkboard on the wall — ten highlights pinned.",
  "trophy-shelf": "A shelf for trophies. Your first roadmap milestone.",
  "window-outside": "The window opens to daylight. The 90-day road is complete.",
};

export const UNLOCK_VARIANT: Partial<Record<UnlockItemId, RoomVariant>> = {
  "shelf-self": "self",
  "desk-wealth": "wealth",
  "window-health": "health",
  "nook-love": "love",
  "full-room": "full",
};

interface UnlockRule {
  id: UnlockItemId;
  test: (state: CompanionState, ctx: StepContext) => boolean;
}

function pillarComplete(ctx: StepContext, pillar: "health" | "wealth" | "love" | "self"): boolean {
  const progress = ctx.pillarChapters?.[pillar];
  return !!progress && progress.total > 0 && progress.complete >= progress.total;
}

/** Order is binding: first qualifying, not-yet-owned item wins. No unlock spam. */
const UNLOCK_RULES: UnlockRule[] = [
  { id: "book", test: (state) => state.stats.chaptersCompleted >= 1 },
  { id: "lamp", test: (state) => state.stats.sessionsCompleted >= 5 },
  { id: "mat", test: (state) => state.stats.healthProtocolsCompleted >= 1 },
  { id: "shelf-self", test: (_state, ctx) => pillarComplete(ctx, "self") },
  { id: "desk-wealth", test: (_state, ctx) => pillarComplete(ctx, "wealth") },
  { id: "window-health", test: (_state, ctx) => pillarComplete(ctx, "health") },
  { id: "nook-love", test: (_state, ctx) => pillarComplete(ctx, "love") },
  {
    id: "full-room",
    test: (_state, ctx) =>
      pillarComplete(ctx, "health") &&
      pillarComplete(ctx, "wealth") &&
      pillarComplete(ctx, "love") &&
      pillarComplete(ctx, "self"),
  },
  { id: "corkboard", test: (state) => state.stats.highlightsCreated >= 10 },
  { id: "trophy-shelf", test: (state) => state.stats.milestonesCompleted >= 1 },
  { id: "window-outside", test: (_state, ctx) => ctx.roadmap90dComplete === true },
];

export function hasUnlock(state: CompanionState, id: UnlockItemId): boolean {
  return state.room.items.some((item) => item.kind === id);
}

/**
 * First qualifying unlock this state does not own yet, or null.
 * Checked after every event step — one at a time, in UNLOCK_RULES order.
 */
export function checkUnlock(state: CompanionState, ctx: StepContext): UnlockItemId | null {
  for (const rule of UNLOCK_RULES) {
    if (hasUnlock(state, rule.id)) continue;
    if (rule.test(state, ctx)) return rule.id;
  }
  return null;
}

export function buildUnlockItem(id: UnlockItemId, sourceEventId: string, unlockedAt: string): UnlockItem {
  return { id, kind: id, unlockedAt, sourceEventId };
}

export function nextRoomVariant(state: CompanionState, id: UnlockItemId): RoomVariant {
  const variant = UNLOCK_VARIANT[id];
  if (!variant) return state.room.variant;
  // A lesser pillar variant never downgrades a "full" room.
  return state.room.variant === "full" ? "full" : variant;
}