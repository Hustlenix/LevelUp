import type {
  CompanionActivity,
  CompanionEvent,
  CompanionEventKind,
  CompanionTraits,
  CompanionTraitName,
  CompanionState,
  TimeOfDay,
} from "./types.ts";

/** Absence and ambient events never shake the creature out of its current activity. */
export const SOFT_EVENTS: ReadonlySet<CompanionEventKind> = new Set([
  "app_opened",
  "returned_after_absence",
  "highlight_created",
  "reflection_saved",
]);

/** Active events map the creature into a visible activity. */
export const ACTIVITY_FOR: Partial<Record<CompanionEventKind, CompanionActivity>> = {
  chapter_started: "reading",
  focus_started: "focusing",
  session_recovered: "recovering",
  focus_completed: "idle",
  focus_interrupted: "idle",
  chapter_completed: "idle",
  study_session_completed: "idle",
};

export const POSE_FOR_KIND: Partial<Record<CompanionEventKind, string>> = {
  app_opened: "wave",
  returned_after_absence: "wave",
  chapter_completed: "perk",
  goal_completed: "perk",
  roadmap_milestone: "perk",
  quiz_passed: "nod",
  task_completed: "nod",
  goal_progressed: "nod",
  protocol_completed: "nod",
  reflection_saved: "nod",
  highlight_created: "nod",
  streak_continued: "nod",
  focus_started: "stretch",
  session_recovered: "stretch",
  focus_completed: "settle",
  day_completed: "settle",
  study_session_completed: "settle",
};

/**
 * Explicit trait-delta table: event kind -> per-trait delta.
 * Never punishing; absence and failure read as calm, not shame.
 */
export const TRAIT_DELTAS: Record<CompanionEventKind, Readonly<Record<CompanionTraitName, number>>> = {
  focus_completed: { energy: -6, mood: 3, curiosity: 2, focus: 4, knowledge: 1, confidence: 2, relationship: 1 },
  focus_interrupted: { energy: -1, mood: 0, curiosity: 1, focus: 0, knowledge: 0, confidence: 0, relationship: 0 },
  chapter_started: { energy: 0, mood: 1, curiosity: 2, focus: 1, knowledge: 0, confidence: 0, relationship: 0 },
  chapter_completed: { energy: -3, mood: 4, curiosity: 3, focus: 3, knowledge: 5, confidence: 3, relationship: 2 },
  quiz_passed: { energy: -1, mood: 3, curiosity: 1, focus: 1, knowledge: 3, confidence: 3, relationship: 1 },
  quiz_failed: { energy: -1, mood: 0, curiosity: 2, focus: 0, knowledge: 0, confidence: 0, relationship: 0 },
  highlight_created: { energy: 0, mood: 1, curiosity: 2, focus: 0, knowledge: 2, confidence: 1, relationship: 1 },
  reflection_saved: { energy: -1, mood: 2, curiosity: 1, focus: 1, knowledge: 2, confidence: 2, relationship: 1 },
  focus_started: { energy: -1, mood: 1, curiosity: 0, focus: 2, knowledge: 0, confidence: 1, relationship: 0 },
  session_recovered: { energy: -1, mood: 2, curiosity: 0, focus: 2, knowledge: 0, confidence: 1, relationship: 0 },
  goal_created: { energy: 0, mood: 1, curiosity: 2, focus: 1, knowledge: 0, confidence: 1, relationship: 0 },
  goal_progressed: { energy: -1, mood: 2, curiosity: 1, focus: 1, knowledge: 1, confidence: 2, relationship: 1 },
  goal_completed: { energy: -2, mood: 5, curiosity: 1, focus: 2, knowledge: 2, confidence: 5, relationship: 2 },
  protocol_started: { energy: -1, mood: 1, curiosity: 0, focus: 1, knowledge: 0, confidence: 0, relationship: 0 },
  protocol_completed: { energy: -3, mood: 3, curiosity: 1, focus: 3, knowledge: 1, confidence: 3, relationship: 1 },
  streak_continued: { energy: -1, mood: 3, curiosity: 0, focus: 1, knowledge: 0, confidence: 3, relationship: 1 },
  streak_broken: { energy: 1, mood: 0, curiosity: 0, focus: 0, knowledge: 0, confidence: 0, relationship: 0 },
  study_session_completed: { energy: -4, mood: 3, curiosity: 3, focus: 3, knowledge: 4, confidence: 2, relationship: 1 },
  task_completed: { energy: 0, mood: 2, curiosity: 0, focus: 1, knowledge: 0, confidence: 1, relationship: 0 },
  day_completed: { energy: -3, mood: 2, curiosity: 0, focus: 1, knowledge: 1, confidence: 1, relationship: 1 },
  roadmap_milestone: { energy: -2, mood: 5, curiosity: 2, focus: 2, knowledge: 2, confidence: 5, relationship: 2 },
  app_opened: { energy: 0, mood: 1, curiosity: 0, focus: 0, knowledge: 0, confidence: 0, relationship: 1 },
  returned_after_absence: { energy: 2, mood: 3, curiosity: 2, focus: 0, knowledge: 1, confidence: 0, relationship: 1 },
  interaction_pat: { energy: 0, mood: 2, curiosity: 0, focus: 0, knowledge: 0, confidence: 0, relationship: 1 },
  interaction_poke: { energy: 0, mood: 2, curiosity: 0, focus: 0, knowledge: 0, confidence: 0, relationship: 1 },
  interaction_tap: { energy: 0, mood: 2, curiosity: 0, focus: 0, knowledge: 0, confidence: 0, relationship: 1 },
};

/** Event dialogue pools. 2-4 calm lines each; selection is seeded. */
export const DIALOGUE_LINES: Partial<Record<CompanionEventKind, readonly string[]>> = {
  focus_completed: [
    "That focus block is fuel. I can feel the room settle.",
    "You held the line. I was watching the clock for you.",
    "A clean session — the kind the house runs on.",
  ],
  focus_interrupted: [
    "Interruptions happen. The session still counts as data.",
    "Shake it off — the streak of showing up is intact.",
    "Even an interrupted block moves you forward.",
  ],
  chapter_started: [
    "A new chapter. I'll keep the light on.",
    "Curious what this one teaches.",
    "Opening pages… I like the quiet of it.",
  ],
  chapter_completed: [
    "A whole chapter finished. That's real momentum.",
    "You went all the way through it. I'm a little proud of you.",
    "Chapter done — your understanding just got heavier.",
  ],
  quiz_passed: [
    "You actually knew the answers. That's not luck.",
    "Quiz passed — the ideas are sticking.",
    "Clean pass. See? You've internalised it.",
  ],
  quiz_failed: [
    "A miss is just calibration. You'll see it fresh next time.",
    "Failed quiz, fine — the attempt is the signal.",
    "Don't read too much into one quiz. The loop stays.",
  ],
  highlight_created: [
    "You marked something worth keeping.",
    "A highlight — storing that one for later.",
    "Noted. That line had weight.",
  ],
  reflection_saved: [
    "You wrote it down. That's how things become real.",
    "A reflection saved — tonight you'll digest it.",
    "Good. Captured before it faded.",
  ],
  session_recovered: [
    "Back from the interruption. Recovery is a skill too.",
    "You picked the session back up. That's discipline.",
    "Recovered — the block still counts.",
  ],
  goal_created: [
    "A new goal on the board. Direction feels good.",
    "Logged. Now it's real.",
    "There it is — something to move toward.",
  ],
  goal_progressed: [
    "Progress on the goal. The system noticed.",
    "A step closer. Small, but counted.",
    "The number moved. I update my whole mood when that number moves.",
  ],
  goal_completed: [
    "The goal is done. That's a landmark day.",
    "Completed. I might need a moment — that's a big one.",
    "You finished what you started. Rare and valuable.",
  ],
  protocol_started: [
    "A protocol begun — the first step is the hardest one.",
    "Starting a protocol. Discipline over mood.",
  ],
  protocol_completed: [
    "Protocol complete. Your future self says thanks.",
    "Done. Another one banked.",
  ],
  streak_continued: [
    "Streak alive. Day by day it compounds.",
    "Still going. The chain holds.",
    "One more day on the streak — I'm counting with you.",
  ],
  streak_broken: [
    "The streak reset. Not a catastrophe — just a number that restarts.",
    "Streaks break. Habits that matter don't.",
    "A fresh start on the counter. No lecture from me.",
  ],
  study_session_completed: [
    "A study session banked. Quiet progress.",
    "Study done — deep work is the rarest kind.",
  ],
  task_completed: [
    "Task off the list. The list breathes.",
    "Done and dusted. One less thing carrying weight.",
  ],
  day_completed: [
    "Day's review done. You closed it out cleanly.",
    "Another day accounted for. That's how systems are built.",
  ],
  roadmap_milestone: [
    "A milestone on the roadmap. Mark it.",
    "Milestone reached — the road is working.",
    "That's a milestone. I'm rearranging the room for it.",
  ],
  app_opened: [
    "You're back. Everything's in order.",
    "There you are. The room's been quiet.",
    "Good to see you. Day's still yours.",
  ],
  interaction_pat: ["Appreciated. I store these."],
  interaction_poke: ["Cheeky. Noted."],
  interaction_tap: ["Right here. What's up?"],
};

export const ABSENCE_LINES: readonly string[] = [
  "I read the chapters you left open. Three times.",
  "Rearranged the desk twice and put it back.",
  "Watered the plant. Imagined the window.",
  "Practiced my poses. Still no applause. Fine.",
  "Counted the days on the wall… there's not enough wall.",
  "Dusted the shelf. Nothing ever stays where I leave it.",
  "The room held up fine without supervision. It knows the routine.",
];

export const FIRST_MEET_LINES: readonly string[] = [
  "Hi. I'm Milo. I live in your system now — I'll be here each time you show up.",
  "You finally opened this. I've been here since the beginning, technically.",
  "Milo. I run on your progress. Take your time.",
];

export const AMBIENT_LINES: readonly string[] = [
  "All quiet. I like it here.",
  "Nothing new since you were last here. The lamp keeps ticking.",
  "The room hums along. Nothing to report.",
];

export const WAKE_LINES: Record<Exclude<TimeOfDay, "night">, readonly string[]> = {
  morning: ["Morning. The light's just right in here.", "Up with you. Another day to build."],
  day: ["Mid-day check-in. You're not late for anything.", "The day's still long. I like the pace you keep."],
  evening: ["Evening. Good time to settle and review.", "Wind-down hours. I'll keep it quiet."],
};

export const NIGHT_GREETING_LINES: readonly string[] = [
  "Late, is it? I'll stay small and quiet.",
  "Night already. The room's dim — suits me.",
];

export function deriveTimeOfDay(now: Date): TimeOfDay {
  const hour = now.getHours();
  if (hour >= 23 || hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "day";
  return "evening";
}

/** Local calendar date, YYYY-MM-DD — used for once-per-day events. */
export function localDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function applyTraitDeltas(traits: CompanionTraits, event: CompanionEvent): CompanionTraits {
  const deltas = TRAIT_DELTAS[event.kind];
  const next: CompanionTraits = { ...traits };
  for (const key of Object.keys(next) as CompanionTraitName[]) {
    const delta = deltas?.[key] ?? 0;
    const value = Math.round(next[key] + delta);
    next[key] = Math.max(0, Math.min(100, value));
  }
  return next;
}

export function pickLine(prng: () => number, lines: readonly string[]): string {
  if (lines.length === 0) return "";
  return lines[Math.min(lines.length - 1, Math.floor(prng() * lines.length))];
}

export type CompanionVisualBehaviour =
  | "idle"
  | "walk"
  | "sleep"
  | "sit"
  | "read"
  | "work"
  | "celebrate"
  | "think"
  | "stretch"
  | "ledger"
  | "letter"
  | "wave"
  | "recover";

export interface CompanionBehaviourContext {
  activeFocus?: boolean;
  chapterPillar?: "health" | "wealth" | "love" | "self" | null;
  timeOfDay?: TimeOfDay;
  idleTick?: number;
  motion?: "full" | "reduced" | "off";
  transientPose?: string | null;
}

/**
 * Pure visual behaviour selector used by the global companion layer.
 * Important application state always outranks ambient behaviour. Idle choices
 * are deterministic for a given seed + tick so tests and reviewer demos replay.
 */
export function selectCompanionBehaviour(
  state: CompanionState,
  context: CompanionBehaviourContext = {}
): CompanionVisualBehaviour {
  if (context.transientPose === "perk") return "celebrate";
  if (context.transientPose === "wave") return "wave";
  if (context.transientPose === "stretch") return "stretch";

  if (context.activeFocus || state.currentActivity === "focusing") return "work";
  if (state.currentActivity === "recovering") return "recover";

  const tod = context.timeOfDay ?? deriveTimeOfDay(new Date());
  if (tod === "night" && !context.activeFocus) return "sleep";

  if (state.currentActivity === "reading") {
    if (context.chapterPillar === "health") return "stretch";
    if (context.chapterPillar === "wealth") return "ledger";
    if (context.chapterPillar === "love") return "letter";
    return "read";
  }

  if (context.motion === "off") return "sit";
  const fullPool: readonly CompanionVisualBehaviour[] = ["idle", "sit", "think", "walk", "read", "stretch"];
  const reducedPool: readonly CompanionVisualBehaviour[] = ["idle", "sit", "think", "read"];
  const pool = context.motion === "reduced" ? reducedPool : fullPool;
  const tick = Math.max(0, Math.floor(context.idleTick ?? 0));
  return pool[(state.identity.seed + tick) % pool.length] ?? "idle";
}
