import test from "node:test";
import assert from "node:assert/strict";
import { applyMissionCompletion, achievementsFor, companionStage, levelSummary, missionIsComplete, missionsForDay, skillLevel, weeklySummary } from "../lib/life/engine.ts";
import { createEmptyLifeState, isLifeState } from "../lib/life/store.ts";
import { buildBackup, validateBackup, restoreBackupAtomically } from "../lib/backup.ts";
import { emptySmallSteps, transitionSmallSteps, SMALL_STEPS_KEY } from "../lib/smallSteps.ts";
import { emptyHabitStore, seedStarterStore, HABITS_STORAGE_KEY } from "../lib/habits.ts";
import { emptyPracticeDrafts, editPracticeDraft, PRACTICE_DRAFTS_KEY } from "../lib/practiceDrafts.ts";
import { hasEntitlement } from "../lib/entitlements.ts";
import { appendOperation, createReplica } from "../lib/nexus/index.ts";

const profile = {
  name: "Builder",
  goals: ["focus", "learning", "mind"],
  minutesPerDay: 30,
  intensity: "steady",
  consistency: "starting",
  wakeTime: null,
  sleepTime: null,
  createdAt: "2026-09-28T00:00:00.000Z",
  updatedAt: "2026-09-28T00:00:00.000Z",
};

test("daily missions are deterministic, unique, and stay inside the time budget", () => {
  const first = missionsForDay(profile, "2026-09-28");
  const replay = missionsForDay(profile, "2026-09-28");
  assert.deepEqual(replay, first);
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map((mission) => mission.id)).size, 3);
  assert.equal(first.filter((mission) => mission.primary).length, 1);
  assert.ok(first.reduce((sum, mission) => sum + mission.minutes, 0) <= profile.minutesPerDay);
});

test("15-minute starter day produces three honest five-minute missions", () => {
  const missions = missionsForDay({ ...profile, minutesPerDay: 15, intensity: "ambitious" }, "2026-09-28");
  assert.deepEqual(missions.map((mission) => mission.minutes), [5, 5, 5]);
});

test("mission completion is idempotent and awards only the mission skill", () => {
  const mission = missionsForDay(profile, "2026-09-28")[0];
  const initial = { ...createEmptyLifeState(), profile };
  const completed = applyMissionCompletion(initial, mission, "2026-09-28T10:00:00.000Z", "Finished the artifact");
  const replay = applyMissionCompletion(completed, mission, "2026-09-28T10:01:00.000Z", "duplicate");
  assert.equal(completed.progression.totalXp, mission.xp);
  assert.equal(completed.progression.skillXp[mission.skill], mission.xp);
  assert.equal(completed.progression.completions[0].proof, "Finished the artifact");
  assert.equal(replay, completed);
  assert.equal(missionIsComplete(completed, mission.id), true);
});

test("streak advances across dates but not for two missions on one date", () => {
  let state = { ...createEmptyLifeState(), profile };
  const dayOne = missionsForDay(profile, "2026-09-28");
  state = applyMissionCompletion(state, dayOne[0], "2026-09-28T10:00:00.000Z");
  state = applyMissionCompletion(state, dayOne[1], "2026-09-28T11:00:00.000Z");
  assert.equal(state.progression.streak.current, 1);
  const dayTwo = missionsForDay(profile, "2026-09-29")[0];
  state = applyMissionCompletion(state, dayTwo, "2026-09-29T10:00:00.000Z");
  assert.equal(state.progression.streak.current, 2);
  assert.equal(state.progression.streak.best, 2);
});

test("levels, skill levels, companion stages and achievements use real progress", () => {
  assert.equal(levelSummary(0).level, 1);
  assert.equal(levelSummary(100).level, 2);
  assert.equal(skillLevel(0), 1);
  assert.equal(companionStage(0), "seed");
  assert.equal(companionStage(5), "scout");
  const mission = missionsForDay(profile, "2026-09-28")[0];
  const state = applyMissionCompletion({ ...createEmptyLifeState(), profile }, mission, "2026-09-28T10:00:00.000Z");
  assert.equal(achievementsFor(state).find((item) => item.id === "first-proof")?.unlocked, true);
  assert.equal(weeklySummary(state, "2026-09-28").completed, 1);
});

test("life state survives full backup validation", () => {
  const lifeState = { ...createEmptyLifeState(), profile };
  const nexusReplica = appendOperation(createReplica("backup-test", "backup-workspace"), { kind: "profile.set", entityId: "profile", payload: { profile } }, profile.updatedAt).replica;
  assert.equal(isLifeState(lifeState), true);
  const backup = buildBackup({ theme: "light", readerScale: "1", progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, lifeState, nexusReplica });
  const result = validateBackup(backup);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data?.lifeState, lifeState);
  assert.deepEqual(result.data?.nexusReplica, nexusReplica);
});

test("free entitlement boundary keeps the improvement loop complete", () => {
  assert.equal(hasEntitlement("free", "core_missions"), true);
  assert.equal(hasEntitlement("free", "core_progress"), true);
  assert.equal(hasEntitlement("free", "advanced_coach"), false);
  assert.equal(hasEntitlement("premium", "advanced_coach"), true);
});

test("combined backup restores Nexus, habits, Small Steps, drafts, and 150 percent text together", () => {
  let n = 0;
  const habits = seedStarterStore(emptyHabitStore(), () => `combined-${++n}`);
  const smallSteps = transitionSmallSteps(emptySmallSteps(), { type: "edit", patch: { task: "My saved task", actions: ["Open notes"] } });
  const practiceDrafts = editPracticeDraft(emptyPracticeDrafts(), "pomodoro:library", { notes: "Keep this draft" }, 1000);
  const lifeState = { ...createEmptyLifeState(), profile };
  const nexusReplica = appendOperation(createReplica("combined-replica", "combined-workspace"), { kind: "profile.set", entityId: "profile", payload: { profile } }, profile.updatedAt).replica;
  const checked = validateBackup(buildBackup({ theme: "deepwork", readerScale: "1.5", progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, lifeState, nexusReplica, habits, smallSteps, practiceDrafts }));
  assert.equal(checked.ok, true, checked.errors.join(" "));
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  assert.equal(restoreBackupAtomically(checked.data, storage).ok, true);
  for (const [key, expected] of [["levelup-life-state-v1", lifeState], ["levelup-nexus-replica-v1", nexusReplica], [HABITS_STORAGE_KEY, habits], [SMALL_STEPS_KEY, smallSteps], [PRACTICE_DRAFTS_KEY, practiceDrafts]]) assert.deepEqual(JSON.parse(values.get(key)), expected, key);
  assert.equal(values.get("levelup-reader-scale"), "1.5");
  const previous = new Map(values);
  let failed = false;
  storage.setItem = (key, value) => { if (key === "levelup-nexus-replica-v1" && !failed) { failed = true; throw new Error("quota"); } values.set(key, value); };
  const replacement = { ...checked.data, smallSteps: emptySmallSteps(), habits: emptyHabitStore(), practiceDrafts: emptyPracticeDrafts() };
  assert.equal(restoreBackupAtomically(replacement, storage).ok, false);
  assert.deepEqual(values, previous, "a late Nexus write failure rolls back all earlier stores");
});
