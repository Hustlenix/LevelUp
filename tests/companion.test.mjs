import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBackup, restoreBackupAtomically, validateBackup } from "../lib/backup.ts";
import {
  COMPANION_KEY,
  COMPANION_PENDING_KEY,
  COMPANION_SETTINGS_KEY,
} from "../lib/companion/types.ts";
import {
  createEmptyCompanionState,
  emitCompanionEvent,
  migrateCompanionState,
  pumpCompanion,
  readCompanionState,
  restoreCompanionState,
  stepCompanion,
  validateCompanionState,
  writeCompanionState,
} from "../lib/companion/index.ts";
import { createEmptyOSState, typeGoal, typeMilestone, typeSession } from "../lib/os/index.ts";

const NOW = "2026-09-20T09:00:00.000Z";
const NOW_DATE = new Date(NOW);

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    dump() { return Object.fromEntries(values); },
  };
}

function morningCtx() {
  return { now: NOW_DATE, timeOfDay: "morning" };
}

function event(id, kind, overrides = {}) {
  return { id, kind, occurredAt: NOW, ...overrides };
}

/** OS fixture with a completed session, a completed goal (target reached), and a completed milestone. */
function makeOS() {
  const os = createEmptyOSState(NOW);
  os.goals["goal-1"] = typeGoal({
    id: "goal-1",
    title: "Complete three focus sessions",
    why: "Build the execution loop",
    metric: { kind: "count", label: "focus sessions", unit: "sessions" },
    baseline: 0,
    target: 3,
    current: 3,
    deadline: "2026-10-01",
    nextAction: "Schedule the first session",
    status: "active",
    pillar: "self",
    createdAt: NOW,
    updatedAt: NOW,
  });
  os.sessions["session-1"] = typeSession({
    id: "session-1",
    taskId: "task-1",
    date: "2026-09-20",
    plannedMinutes: 25,
    status: "completed",
    elapsedSeconds: 1500,
    createdAt: NOW,
    updatedAt: NOW,
  });
  os.milestones["milestone-1"] = typeMilestone({
    id: "milestone-1",
    roadmapId: "roadmap-1",
    title: "First proof of the loop",
    order: 1,
    status: "completed",
    createdAt: NOW,
    updatedAt: NOW,
  });
  return os;
}

test("createEmptyCompanionState exposes the lockable defaults and validates", () => {
  const state = createEmptyCompanionState(NOW, 4242);
  assert.equal(state.identity.name, "Milo");
  assert.equal(state.identity.seed, 4242);
  assert.equal(state.traits.energy, 70);
  assert.equal(state.currentActivity, "idle");
  assert.equal(state.adapter.lastOSEventIndex, 0);
  assert.equal(state.flags.firstMeetDelivered, false);
  assert.equal(validateCompanionState(state).ok, true);
});

test("pump maps OS completions exactly once and advances the adapter", () => {
  const os = makeOS();
  os.completionEvents = [
    { id: "os-evt-1", kind: "session-completed", occurredAt: NOW, sessionId: "session-1" },
    { id: "os-evt-2", kind: "goal-progressed", occurredAt: NOW, goalId: "goal-1", value: 3 },
    { id: "os-evt-3", kind: "review-completed", occurredAt: NOW },
  ];
  const storage = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW)) });
  const first = pumpCompanion({ now: NOW_DATE, osState: os, storage });
  assert.equal(first.skipped, false);
  assert.equal(first.state.stats.sessionsCompleted, 1);
  assert.equal(first.state.stats.totalFocusMinutes, 25);
  assert.equal(first.state.stats.daysActive, 1);
  const journalKinds = first.state.journal.map((item) => item.kind);
  for (const kind of ["focus_completed", "goal_progressed", "goal_completed", "day_completed"]) {
    assert.ok(journalKinds.includes(kind), `journal should include ${kind}`);
  }
  assert.equal(first.state.adapter.lastOSEventIndex, 3);
  const second = pumpCompanion({ now: NOW_DATE, osState: os, storage });
  assert.deepEqual(second.events, []);
  assert.deepEqual(second.reactions, []);
  assert.deepEqual(second.state, first.state);
});

test("pump is deterministic: identical inputs and seed replay identically, seeds differ only in copy", () => {
  const os = makeOS();
  os.completionEvents = [
    { id: "os-evt-1", kind: "session-completed", occurredAt: NOW, sessionId: "session-1" },
  ];
  const build = (seed) => {
    const storage = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW, seed)) });
    return pumpCompanion({ now: NOW_DATE, osState: os, storage });
  };
  const a1 = build(7);
  const a2 = build(7);
  assert.deepEqual(a2.state, a1.state);
  assert.deepEqual(a2.events, a1.events);
  assert.deepEqual(a2.reactions, a1.reactions);
  const b = build(999);
  assert.deepEqual(b.events, a1.events);
  const journalKindsA = a1.state.journal.map((item) => item.kind);
  const journalKindsB = b.state.journal.map((item) => item.kind);
  assert.deepEqual(journalKindsB, journalKindsA);
});

test("a fresh profile gets app_opened on first pump; a 48h gap returns the absence welcome", () => {
  const fresh = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW)) });
  const first = pumpCompanion({ now: NOW_DATE, osState: createEmptyOSState(NOW), storage: fresh });
  assert.ok(first.state.journal.some((item) => item.kind === "app_opened"));
  assert.equal(first.state.journal.some((item) => item.kind === "returned_after_absence"), false);

  const oldStorage = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState("2026-09-18T09:00:00.000Z")) });
  const home = pumpCompanion({ now: NOW_DATE, osState: createEmptyOSState(NOW), storage: oldStorage });
  const returned = home.state.journal.find((item) => item.kind === "returned_after_absence");
  assert.ok(returned, "48h absence should emit returned_after_absence once");
  assert.equal(home.reactions.some((reaction) => reaction.cooldownKey === "dialogue:returned_after_absence"), true);
});

test("reducer: chapter_completed earns the book, five sessions earn the lamp, in order", () => {
  let state = createEmptyCompanionState(NOW, 1);
  const chapter = stepCompanion(state, event("e-chapter", "chapter_completed", { value: 1 }), morningCtx());
  assert.equal(chapter.state.stats.chaptersCompleted, 1);
  assert.deepEqual(chapter.state.room.items.map((item) => item.id), ["book"]);
  assert.ok(chapter.reactions.some((reaction) => reaction.kind === "room" && reaction.itemId === "book"));
  assert.ok(chapter.reactions.some((reaction) => reaction.cooldownKey === "unlock:book"));
  state = chapter.state;
  for (let i = 0; i < 4; i += 1) {
    const step = stepCompanion(state, event(`e-focus-${i}`, "focus_completed", { value: 25 }), morningCtx());
    state = step.state;
  }
  assert.deepEqual(state.room.items.map((item) => item.id), ["book"]);
  const lamp = stepCompanion(state, event("e-focus-5", "focus_completed", { value: 25 }), morningCtx());
  assert.equal(lamp.state.stats.sessionsCompleted, 5);
  assert.deepEqual(lamp.state.room.items.map((item) => item.id), ["book", "lamp"]);
  assert.ok(lamp.reactions.some((reaction) => reaction.cooldownKey === "unlock:lamp"));
});

test("reducer: milestone events unlock the trophy shelf once and never re-emit", () => {
  const os = makeOS();
  const storage = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW)) });
  const first = pumpCompanion({ now: NOW_DATE, osState: os, storage });
  assert.equal(first.state.stats.milestonesCompleted, 1);
  assert.ok(first.state.journal.some((item) => item.kind === "roadmap_milestone"));
  assert.ok(first.state.room.items.some((item) => item.id === "trophy-shelf"));
  assert.equal(first.state.adapter.seenMilestoneCount, 1);
  const second = pumpCompanion({ now: NOW_DATE, osState: os, storage });
  assert.deepEqual(second.events, []);
  assert.equal(second.state.journal.filter((item) => item.kind === "roadmap_milestone").length, 1);
});

test("reducer: night engagement puts the companion to sleep; a morning event wakes it with a wake line", () => {
  const night = stepCompanion(
    createEmptyCompanionState(NOW),
    event("e-night-focus", "focus_completed", { value: 25 }),
    { now: NOW_DATE, timeOfDay: "night" }
  );
  assert.equal(night.state.currentActivity, "sleeping");

  let state = createEmptyCompanionState(NOW);
  state.currentActivity = "sleeping";
  state.flags = { ...state.flags, firstMeetDelivered: true };
  const wake = stepCompanion(state, event("e-wake", "app_opened"), morningCtx());
  assert.equal(wake.state.currentActivity, "idle");
  assert.equal(wake.state.lastWakeAt, NOW);
  assert.ok(wake.reactions.some((reaction) => reaction.cooldownKey === "dialogue:wake:morning"));
  assert.equal(wake.reactions.some((reaction) => reaction.priority === 1), false);
});

test("reducer: first meet delivers the firstMeet dialogue exactly once, and flagged afterwards", () => {
  const state = createEmptyCompanionState(NOW);
  const first = stepCompanion(state, event("e-open-1", "app_opened"), morningCtx());
  assert.ok(first.reactions.some((reaction) => reaction.cooldownKey === "firstMeet"));
  assert.equal(first.state.flags.firstMeetDelivered, true);
  const second = stepCompanion(first.state, event("e-open-2", "app_opened"), morningCtx());
  assert.equal(second.reactions.some((reaction) => reaction.cooldownKey === "firstMeet"), false);
  assert.ok(second.reactions.some((reaction) => reaction.cooldownKey === "dialogue:app_opened"));
});

test("reducer treats a replayed event id as a no-op (replay safety)", () => {
  const state = createEmptyCompanionState(NOW);
  const first = stepCompanion(state, event("e-1", "focus_completed", { value: 25 }), morningCtx());
  assert.equal(first.state.stats.sessionsCompleted, 1);
  const replay = stepCompanion(first.state, event("e-1", "focus_completed", { value: 25 }), morningCtx());
  assert.equal(replay.state, first.state);
  assert.deepEqual(replay.reactions, []);
});

test("pump drains pending adapter events into the journal and empties the queue", () => {
  const storage = fakeStorage({ [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW)) });
  emitCompanionEvent("focus_completed", { value: 25 }, storage);
  emitCompanionEvent("highlight_created", {}, storage);
  const result = pumpCompanion({ now: NOW_DATE, osState: createEmptyOSState(NOW), storage });
  assert.ok(result.state.journal.some((item) => item.kind === "focus_completed"));
  assert.ok(result.state.journal.some((item) => item.kind === "highlight_created"));
  assert.equal(result.state.stats.sessionsCompleted, 1);
  assert.equal(storage.dump()[COMPANION_PENDING_KEY], "[]");
});

test("settings filters drop motion and dialogue reactions but keep room unlocks", () => {
  const settings = { enabled: true, motion: "off", dialogue: "off", sound: false };
  const storage = fakeStorage({
    [COMPANION_SETTINGS_KEY]: JSON.stringify(settings),
    [COMPANION_KEY]: JSON.stringify(createEmptyCompanionState(NOW)),
  });
  const result = pumpCompanion({ now: NOW_DATE, osState: makeOS(), storage });
  assert.equal(result.reactions.some((reaction) => reaction.kind === "dialogue"), false);
  assert.equal(result.reactions.some((reaction) => reaction.kind === "pose"), false);
  assert.ok(result.reactions.some((reaction) => reaction.kind === "room" && reaction.itemId === "trophy-shelf"));
});

test("disabled companion skips the pump and leaves pending events untouched", () => {
  const state = createEmptyCompanionState(NOW);
  const serialized = JSON.stringify(state);
  const storage = fakeStorage({
    [COMPANION_SETTINGS_KEY]: JSON.stringify({ enabled: false, motion: "full", dialogue: "normal", sound: false }),
    [COMPANION_KEY]: serialized,
  });
  emitCompanionEvent("focus_completed", { value: 25 }, storage);
  const before = storage.dump()[COMPANION_PENDING_KEY];
  const result = pumpCompanion({ now: NOW_DATE, osState: makeOS(), storage });
  assert.equal(result.skipped, true);
  assert.deepEqual(result.events, []);
  assert.equal(storage.dump()[COMPANION_PENDING_KEY], before);
  assert.equal(storage.dump()[COMPANION_KEY], serialized);
});

test("migration repairs missing v1 fields and rejects other schema versions", () => {
  assert.equal(validateCompanionState({ schemaVersion: 99 }).ok, false);
  const complete = createEmptyCompanionState(NOW);
  const repaired = migrateCompanionState({ ...complete, stats: undefined, traits: undefined }, NOW);
  assert.equal(repaired.ok, true);
  assert.equal(repaired.migrated, true);
  assert.equal(repaired.state.traits.energy, 70);
  assert.equal(repaired.state.stats.sessionsCompleted, 0);
  assert.equal(validateCompanionState(repaired.state).ok, true);
  assert.equal(migrateCompanionState({ schemaVersion: 0 }, NOW).ok, false);
});

test("state persists and reads back through the versioned key; bad restores leave storage untouched", () => {
  const storage = fakeStorage();
  const state = createEmptyCompanionState(NOW);
  assert.equal(writeCompanionState(state, storage), true);
  assert.deepEqual(readCompanionState(storage), state);
  assert.ok(storage.dump()[COMPANION_KEY]);
  const before = storage.dump()[COMPANION_KEY];
  const bad = restoreCompanionState({ schemaVersion: 99 }, storage);
  assert.equal(bad.ok, false);
  assert.equal(storage.dump()[COMPANION_KEY], before);
});

test("backup carries the companion state and pending events, and rejects malformed ones", () => {
  const state = createEmptyCompanionState(NOW);
  const pending = [{ id: "p-1", kind: "focus_completed", occurredAt: NOW, value: 25 }];
  const backup = buildBackup({
    theme: "light",
    readerScale: "1",
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
    companionState: state,
    companionPending: pending,
  });
  const roundTrip = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.data.companionState.schemaVersion, 1);
  assert.deepEqual(roundTrip.data.companionPending, pending);

  const badState = validateBackup({ ...backup, companionState: { schemaVersion: 99 } });
  assert.equal(badState.ok, false);
  assert.match(badState.errors.join(" "), /companionState/);

  const badPending = validateBackup({ ...backup, companionPending: [{ id: 1 }] });
  assert.equal(badPending.ok, false);
  assert.match(badPending.errors.join(" "), /companionPending/);

  const badEntry = validateBackup({ ...backup, companionPending: [{ id: "x", kind: "focus_completed" }] });
  assert.equal(badEntry.ok, false);
  assert.match(badEntry.errors.join(" "), /companionPending/);
});

test("restoring a backup writes the companion state and pending events under their keys", () => {
  const state = createEmptyCompanionState(NOW);
  const pending = [{ id: "p-1", kind: "quiz_passed", occurredAt: NOW }];
  const backup = buildBackup({
    theme: "light",
    readerScale: "1",
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
    companionState: state,
    companionPending: pending,
  });
  const storage = fakeStorage();
  const restored = restoreBackupAtomically(backup, storage);
  assert.equal(restored.ok, true);
  const writtenState = JSON.parse(storage.dump()[COMPANION_KEY]);
  assert.equal(writtenState.schemaVersion, 1);
  assert.equal(writtenState.identity.name, "Milo");
  assert.deepEqual(JSON.parse(storage.dump()[COMPANION_PENDING_KEY]), pending);
});