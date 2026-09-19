import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBackup, validateBackup } from "../lib/backup.ts";
import {
  createEmptyOSState,
  reduceOSState,
  typeGoal,
  typeMilestone,
  typeRoadmap,
  typeSession,
  typeTask,
} from "../lib/os/index.ts";
import {
  migrateOSState,
  validateOSState,
} from "../lib/os/migrations.ts";
import {
  OS_STATE_KEY,
  readOSState,
  restoreOSState,
  writeOSState,
} from "../lib/os/store.ts";

const NOW = "2026-09-20T09:00:00.000Z";

function fixtureChain() {
  return {
    goal: typeGoal({
      id: "goal-1",
      title: "Complete three focus sessions",
      why: "Build a reliable execution loop",
      metric: { kind: "count", label: "focus sessions", unit: "sessions" },
      baseline: 0,
      target: 3,
      current: 0,
      deadline: "2026-10-01",
      nextAction: "Schedule the first session",
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    }),
    roadmap: typeRoadmap({
      id: "roadmap-1",
      goalId: "goal-1",
      title: "First execution loop",
      phase: 1,
      milestoneIds: [],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    }),
    milestone: typeMilestone({
      id: "milestone-1",
      roadmapId: "roadmap-1",
      title: "Start the loop",
      order: 1,
      taskIds: [],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    }),
    task: typeTask({
      id: "task-1",
      milestoneId: "milestone-1",
      title: "Run one focus session",
      kind: "focus",
      order: 1,
      sessionIds: [],
      status: "todo",
      createdAt: NOW,
      updatedAt: NOW,
    }),
    session: typeSession({
      id: "session-1",
      taskId: "task-1",
      date: "2026-09-20",
      plannedMinutes: 25,
      status: "planned",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  };
}

function chainState() {
  const chain = fixtureChain();
  let state = createEmptyOSState(NOW);
  state = reduceOSState(state, { type: "goal/add", goal: chain.goal });
  state = reduceOSState(state, { type: "roadmap/add", roadmap: chain.roadmap });
  state = reduceOSState(state, { type: "milestone/add", milestone: chain.milestone });
  state = reduceOSState(state, { type: "task/add", task: chain.task });
  state = reduceOSState(state, { type: "session/schedule", session: chain.session });
  return { state, chain };
}

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    dump() { return Object.fromEntries(values); },
  };
}

test("OS reducer preserves the Goal to Session dependency chain", () => {
  const { state, chain } = chainState();
  assert.equal(state.goals[chain.goal.id].title, chain.goal.title);
  assert.deepEqual(state.roadmaps[chain.roadmap.id].milestoneIds, [chain.milestone.id]);
  assert.deepEqual(state.milestones[chain.milestone.id].taskIds, [chain.task.id]);
  assert.deepEqual(state.tasks[chain.task.id].sessionIds, [chain.session.id]);
  assert.equal(state.sessions[chain.session.id].status, "planned");
});

test("completing a session creates one completion event and updates progress and mastery", () => {
  const { state, chain } = chainState();
  const completed = reduceOSState(state, {
    type: "session/complete",
    sessionId: chain.session.id,
    occurredAt: "2026-09-20T10:00:00.000Z",
    note: "Finished the first block",
  });
  assert.equal(completed.sessions[chain.session.id].status, "completed");
  assert.equal(completed.completionEvents.length, 1);
  assert.equal(completed.completionEvents[0].sessionId, chain.session.id);
  assert.equal(completed.progress.sessions[chain.session.id].completionPct, 100);
  assert.equal(completed.progress.tasks[chain.task.id].completedSessions, 1);
  assert.equal(completed.progress.goals[chain.goal.id].current, 0);
  assert.equal(completed.mastery.goals[chain.goal.id].evidenceCount, 1);
  assert.equal(completed.mastery.goals[chain.goal.id].level, "emerging");
  const repeated = reduceOSState(completed, {
    type: "session/complete",
    sessionId: chain.session.id,
    occurredAt: "2026-09-20T10:00:00.000Z",
  });
  assert.equal(repeated.completionEvents.length, 1);
});

test("reducer refuses children whose parent does not exist", () => {
  const state = createEmptyOSState(NOW);
  const next = reduceOSState(state, {
    type: "task/add",
    task: typeTask({
      id: "orphan-task",
      milestoneId: "missing-milestone",
      title: "Should not be added",
      kind: "custom",
      order: 1,
      sessionIds: [],
      status: "todo",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  });
  assert.deepEqual(next, state);
});

test("v0 arrays migrate into the v1 normalized state without losing the chain", () => {
  const chain = fixtureChain();
  const migrated = migrateOSState({
    schemaVersion: 0,
    goals: [chain.goal],
    roadmaps: [chain.roadmap],
    milestones: [chain.milestone],
    tasks: [chain.task],
    sessions: [chain.session],
    completionEvents: [],
  }, NOW);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.state.schemaVersion, 1);
  assert.equal(migrated.state.tasks[chain.task.id].milestoneId, chain.milestone.id);
  assert.equal(validateOSState(migrated.state).ok, true);
});

test("invalid OS state is rejected without mutating storage", () => {
  const storage = fakeStorage({ [OS_STATE_KEY]: JSON.stringify(createEmptyOSState(NOW)) });
  const before = storage.dump()[OS_STATE_KEY];
  const result = restoreOSState({ schemaVersion: 99 }, storage);
  assert.equal(result.ok, false);
  assert.equal(storage.dump()[OS_STATE_KEY], before);
});

test("current-version validation rejects malformed entity records", () => {
  const state = createEmptyOSState(NOW);
  const invalid = {
    ...state,
    goals: { broken: { id: "broken", title: "Missing required fields" } },
  };
  assert.equal(validateOSState(invalid).ok, false);
});

test("valid OS state persists and reads back through the versioned key", () => {
  const storage = fakeStorage();
  const state = createEmptyOSState(NOW);
  assert.equal(writeOSState(state, storage), true);
  assert.deepEqual(readOSState(storage), state);
  assert.ok(storage.dump()[OS_STATE_KEY]);
});

test("reading a legacy OS payload persists its migrated v1 form", () => {
  const chain = fixtureChain();
  const storage = fakeStorage({
    [OS_STATE_KEY]: JSON.stringify({
      schemaVersion: 0,
      goals: [chain.goal],
      roadmaps: [chain.roadmap],
      milestones: [chain.milestone],
      tasks: [chain.task],
      sessions: [chain.session],
      completionEvents: [],
    }),
  });
  const state = readOSState(storage);
  assert.equal(state.schemaVersion, 1);
  assert.equal(JSON.parse(storage.dump()[OS_STATE_KEY]).schemaVersion, 1);
});

test("backup includes the additive OS state and rejects malformed OS state", () => {
  const state = createEmptyOSState(NOW);
  const backup = buildBackup({
    theme: "light",
    readerScale: "1",
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
    osState: state,
  });
  const roundTrip = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(roundTrip.ok, true);
  assert.equal(roundTrip.data.osState.schemaVersion, 1);
  const invalid = validateBackup({ ...backup, osState: { schemaVersion: 99 } });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join(" "), /osState/);
});
