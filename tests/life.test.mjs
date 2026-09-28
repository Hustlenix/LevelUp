import test from "node:test";
import assert from "node:assert/strict";
import { applyMissionCompletion, achievementsFor, companionStage, levelSummary, missionIsComplete, missionsForDay, skillLevel, weeklySummary } from "../lib/life/engine.ts";
import { createEmptyLifeState, isLifeState } from "../lib/life/store.ts";
import { buildBackup, validateBackup } from "../lib/backup.ts";
import { hasEntitlement } from "../lib/entitlements.ts";

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
  assert.equal(isLifeState(lifeState), true);
  const backup = buildBackup({ theme: "light", readerScale: "1", progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, lifeState });
  const result = validateBackup(backup);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data?.lifeState, lifeState);
});

test("free entitlement boundary keeps the improvement loop complete", () => {
  assert.equal(hasEntitlement("free", "core_missions"), true);
  assert.equal(hasEntitlement("free", "core_progress"), true);
  assert.equal(hasEntitlement("free", "advanced_coach"), false);
  assert.equal(hasEntitlement("premium", "advanced_coach"), true);
});
