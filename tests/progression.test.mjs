import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyOSState } from "../lib/os/index.ts";
import {
  computeProgression,
  levelForXp,
  xpBounds,
  unlockStage,
  computeLifeosBadges,
  SKILL_BY_TASK_KIND,
  LEVEL_CURVE,
} from "../lib/progression.ts";

function makeOS() {
  const os = createEmptyOSState();
  os.goals = {};
  os.roadmaps = {};
  os.milestones = {};
  os.tasks = {};
  os.completionEvents = [];
  return os;
}

function event(kind, occurredAt, extra = {}) {
  return { id: `evt-${occurredAt}-${Math.random()}`, kind, occurredAt, value: 0, ...extra };
}

test("levelForXp follows the curve", () => {
  assert.equal(levelForXp(0), 0);
  assert.equal(levelForXp(79), 0);
  assert.equal(levelForXp(80), 1);
  assert.equal(levelForXp(500), 3); // 400 <= 500 < 700
  assert.equal(levelForXp(100000), LEVEL_CURVE.length - 1);
});

test("xpBounds reports progress into the next level", () => {
  const bounds = xpBounds(80);
  assert.equal(bounds.floor, 80);
  assert.equal(bounds.next, 200);
  assert.equal(bounds.pct, 0);
  const bounds2 = xpBounds(140);
  assert.equal(bounds2.pct, 50);
  const top = xpBounds(10000);
  assert.equal(top.next, null);
  assert.equal(top.pct, 100);
});

test("session-completed awards minutes x2 to the task-kind skill", () => {
  const os = makeOS();
  os.tasks["t1"] = {
    id: "t1",
    kind: "focus",
    title: "Deep work",
    description: "",
    status: "completed",
    milestoneId: "m1",
    estimatedMinutes: 25,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  os.completionEvents = [event("session-completed", "2026-09-01T08:00:00.000Z", { value: 25, taskId: "t1" })];
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-01");
  assert.equal(p.xp, 50);
  assert.equal(p.skillXp.focus, 50);
  assert.equal(p.totalSessions, 1);
  assert.equal(p.totalMinutes, 25);
});

test("task-completed, goal-progressed and review-completed award base XP", () => {
  const os = makeOS();
  os.goals["g1"] = { id: "g1", title: "Get fit", why: "", pillar: "health", metric: { kind: "count", label: "sessions" }, baseline: 0, target: 10, current: 1, deadline: null, nextAction: null, roadmapIds: [], status: "active", createdAt: "", updatedAt: "" };
  os.tasks["t1"] = { id: "t1", kind: "study", title: "Read", description: "", status: "completed", milestoneId: "m1", estimatedMinutes: 30, createdAt: "", updatedAt: "" };
  os.completionEvents = [
    event("task-completed", "2026-09-01T08:00:00.000Z", { taskId: "t1" }),
    event("goal-progressed", "2026-09-01T09:00:00.000Z", { goalId: "g1" }),
    event("review-completed", "2026-09-02T08:00:00.000Z"),
  ];
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-02");
  assert.equal(p.xp, 25 + 15 + 20);
  assert.equal(p.skillXp.learning, 25); // study task
  assert.equal(p.skillXp.fitness, 15); // health pillar
  assert.equal(p.skillXp.discipline, 20); // review
  assert.equal(p.tasksCompleted, 1);
  assert.equal(p.reviewsCompleted, 1);
});

test("streak counts consecutive active days and resets on a gap", () => {
  const os = makeOS();
  os.completionEvents = [
    event("session-completed", "2026-09-01T08:00:00.000Z", { value: 10 }),
    event("session-completed", "2026-09-02T08:00:00.000Z", { value: 10 }),
    event("session-completed", "2026-09-03T08:00:00.000Z", { value: 10 }),
  ];
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-03");
  assert.equal(p.streak.current, 3);
  assert.equal(p.streak.best, 3);

  const os2 = makeOS();
  os2.completionEvents = [
    event("session-completed", "2026-09-01T08:00:00.000Z", { value: 10 }),
    event("session-completed", "2026-09-03T08:00:00.000Z", { value: 10 }),
  ];
  const p2 = computeProgression(os2, createEmptyOSState().gamification, "2026-09-03");
  assert.equal(p2.streak.current, 1); // gap yesterday → not a live streak
  assert.equal(p2.streak.best, 1);

  const os3 = makeOS();
  os3.completionEvents = [
    event("session-completed", "2026-08-30T08:00:00.000Z", { value: 10 }),
  ];
  const p3 = computeProgression(os3, createEmptyOSState().gamification, "2026-09-03");
  assert.equal(p3.streak.current, 0);
});

test("history spans HISTORY_DAYS ending today, newest last", () => {
  const os = makeOS();
  os.completionEvents = [event("session-completed", "2026-09-03T08:00:00.000Z", { value: 10 })];
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-03");
  assert.equal(p.history.length, 42);
  assert.equal(p.history[p.history.length - 1].date, "2026-09-03");
  assert.equal(p.history[p.history.length - 1].xp, 20);
  assert.equal(p.last7.length, 7);
});

test("weekSum and prevWeekSum compare this week to last", () => {
  const os = makeOS();
  // Last 7 days window (today 2026-09-03): 09-01, 09-02, 09-03 → 3 sessions
  for (const day of ["09-01", "09-02", "09-03"]) {
    os.completionEvents.push(event("session-completed", `2026-${day}T08:00:00.000Z`, { value: 25 }));
  }
  // Previous window (08-21..08-27): six consecutive earlier days → 6 sessions
  for (let day = 21; day <= 26; day += 1) {
    os.completionEvents.push(event("session-completed", `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`, { value: 25 }));
  }
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-03");
  assert.equal(p.weekSum.sessions, 3);
  assert.equal(p.prevWeekSum.sessions, 6);
});

test("unlockStage maps levels to companion stages", () => {
  assert.equal(unlockStage(1).name, "Spark");
  assert.equal(unlockStage(3).name, "Ember");
  assert.equal(unlockStage(6).name, "Flame");
  assert.equal(unlockStage(9).name, "Beacon");
});

test("lifeos badges unlock from honest event data", () => {
  const os = makeOS();
  os.completionEvents = [
    event("session-completed", "2026-09-01T08:00:00.000Z", { value: 25 }),
    event("session-completed", "2026-09-02T08:00:00.000Z", { value: 25 }),
    event("session-completed", "2026-09-03T08:00:00.000Z", { value: 25 }),
  ];
  const p = computeProgression(os, createEmptyOSState().gamification, "2026-09-03");
  const badges = computeLifeosBadges(p);
  const byId = Object.fromEntries(badges.map((b) => [b.id, b.unlocked]));
  assert.equal(byId["first-session"], true);
  assert.equal(byId["ten-sessions"], false);
  assert.equal(byId["first-goal"], false);
  assert.equal(byId["balanced"], false); // only one skill trained
});

test("every TaskKind maps to a skill", () => {
  const kinds = ["action", "study", "focus", "protocol", "review", "reflection", "custom"];
  for (const kind of kinds) {
    assert.ok(SKILL_BY_TASK_KIND[kind], `missing mapping for ${kind}`);
  }
});