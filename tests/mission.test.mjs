import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyOSState } from "../lib/os/index.ts";
import {
  buildDayMissions,
  queuedTasks,
  greetingFor,
  skillForPillar,
  RITUALS,
} from "../lib/mission.ts";

function makeOS() {
  const os = createEmptyOSState();
  os.goals = {};
  os.roadmaps = {};
  os.milestones = {};
  os.tasks = {};
  return os;
}

function addGoal(os, id, pillar = "health") {
  os.goals[id] = {
    id,
    title: `Goal ${id}`,
    why: "",
    pillar,
    status: "active",
    roadmapIds: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  return os.goals[id];
}

function addRoadmap(os, goalId, id) {
  const goal = os.goals[goalId];
  goal.roadmapIds.push(id);
  os.roadmaps[id] = { id, title: `Roadmap ${id}`, phase: 1, status: "active", milestoneIds: [] };
  return os.roadmaps[id];
}

function addMilestone(os, roadmapId, id, status = "active") {
  const roadmap = os.roadmaps[roadmapId];
  roadmap.milestoneIds.push(id);
  os.milestones[id] = { id, title: `Milestone ${id}`, status, taskIds: [] };
  return os.milestones[id];
}

function addTask(os, milestoneId, id, overrides = {}) {
  const milestone = os.milestones[milestoneId];
  milestone.taskIds.push(id);
  os.tasks[id] = {
    id,
    kind: overrides.kind ?? "action",
    title: overrides.title ?? `Task ${id}`,
    description: overrides.description ?? "",
    status: overrides.status ?? "todo",
    estimatedMinutes: overrides.estimatedMinutes ?? 25,
    dueDate: overrides.dueDate ?? null,
    createdAt: overrides.createdAt ?? "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  return os.tasks[id];
}

test("same day and data produce identical missions (deterministic)", () => {
  const os = makeOS();
  const a = buildDayMissions(os, "2026-09-15");
  const b = buildDayMissions(os, "2026-09-15");
  assert.deepEqual(a, b);
});

test("empty OS falls back to a first-goal mission plus two distinct rituals", () => {
  const missions = buildDayMissions(makeOS(), "2026-09-15");
  assert.equal(missions.hasPlan, false);
  assert.equal(missions.primary.source, "empty");
  assert.equal(missions.primary.title, "Set your first goal");
  assert.equal(missions.primary.href, "/journey/");
  assert.equal(missions.secondary.length, 2);
  for (const ritual of missions.secondary) {
    assert.equal(ritual.source, "ritual");
    assert.equal(ritual.difficulty, 1);
  }
  const ids = missions.secondary.map((m) => m.id);
  assert.equal(new Set(ids).size, 2, "rituals must not duplicate");
});

test("primary mission is the earliest-due task; secondary fills with other tasks and one ritual", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  const m1 = addMilestone(os, "r1", "m1");
  const m2 = addMilestone(os, "r1", "m2");
  addTask(os, m1.id, "t-late", { title: "Late task", dueDate: "2026-09-30", createdAt: "2026-08-10T00:00:00.000Z" });
  addTask(os, m2.id, "t-early", { title: "Early task", dueDate: "2026-09-10", createdAt: "2026-08-01T00:00:00.000Z" });
  addTask(os, m2.id, "t-today", { title: "Today task", dueDate: "2026-09-15", createdAt: "2026-08-05T00:00:00.000Z" });

  const missions = buildDayMissions(os, "2026-09-15");
  assert.equal(missions.hasPlan, true);
  assert.equal(missions.primary.title, "Early task");
  assert.equal(missions.primary.source, "task");
  assert.equal(missions.primary.href, "/focus/");
  const secondaryTitles = missions.secondary.map((m) => m.title);
  assert.ok(!secondaryTitles.includes("Today task"), "primary's milestone is not repeated in secondary");
  assert.ok(secondaryTitles.includes("Late task"));

  const taskSecondaries = missions.secondary.filter((m) => m.source === "task");
  const ritualSecondaries = missions.secondary.filter((m) => m.source === "ritual");
  assert.equal(taskSecondaries.length, 1);
  assert.equal(ritualSecondaries.length, 2);
  assert.equal(missions.secondary.length, 3);
});

test("secondary skips duplicate milestones when a different milestone task exists", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  const m1 = addMilestone(os, "r1", "m1");
  const m2 = addMilestone(os, "r1", "m2");
  addTask(os, m1.id, "t1", { title: "Task one", dueDate: "2026-09-10" });
  addTask(os, m1.id, "t2", { title: "Task two (same milestone)", dueDate: "2026-09-11" });
  addTask(os, m2.id, "t3", { title: "Task three (other milestone)", dueDate: "2026-09-12" });

  const missions = buildDayMissions(os, "2026-09-15");
  const taskTitles = missions.secondary.filter((m) => m.source === "task").map((m) => m.title);
  assert.ok(!taskTitles.includes("Task two (same milestone)"), "same milestone skipped in secondary");
  assert.ok(taskTitles.includes("Task three (other milestone)"));
});

test("completed and in-progress tasks stay in the queue; finished ones leave it", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  const m = addMilestone(os, "r1", "m1");
  addTask(os, m.id, "t-ip", { title: "In progress", status: "in-progress", dueDate: "2026-09-10" });
  addTask(os, m.id, "t-todo", { title: "Todo", status: "todo", dueDate: "2026-09-11" });
  addTask(os, m.id, "t-done", { title: "Done", status: "completed", dueDate: "2026-09-01" });

  const queue = queuedTasks(os);
  const titles = queue.map((item) => item.task.title);
  assert.deepEqual(titles, ["In progress", "Todo"]);
});

test("xpReward = minutes x2, plus the task bonus when already in progress", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  const m1 = addMilestone(os, "r1", "m1");
  const m2 = addMilestone(os, "r1", "m2");
  addTask(os, m1.id, "t-todo", { title: "Todo", estimatedMinutes: 30, dueDate: "2026-09-10" });
  addTask(os, m2.id, "t-ip", { title: "In progress", status: "in-progress", estimatedMinutes: 30, dueDate: "2026-09-11" });

  const missions = buildDayMissions(os, "2026-09-15");
  assert.equal(missions.primary.xpReward, 60);
  const ip = missions.secondary.find((mission) => mission.taskId === "t-ip");
  assert.equal(ip.xpReward, 60 + 25);
});

test("difficulty scales with minutes", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  const m1 = addMilestone(os, "r1", "m1");
  const m2 = addMilestone(os, "r1", "m2");
  const m3 = addMilestone(os, "r1", "m3");
  addTask(os, m1.id, "t-easy", { title: "Short", estimatedMinutes: 10, dueDate: "2026-09-10" });
  addTask(os, m2.id, "t-med", { title: "Medium", estimatedMinutes: 30, dueDate: "2026-09-11" });
  addTask(os, m3.id, "t-hard", { title: "Long", estimatedMinutes: 60, dueDate: "2026-09-12" });

  const missions = buildDayMissions(os, "2026-09-15");
  assert.equal(missions.primary.difficulty, 1);
  assert.equal(missions.secondary.find((mission) => mission.taskId === "t-med").difficulty, 2);
  assert.equal(missions.secondary.find((mission) => mission.taskId === "t-hard").difficulty, 3);
});

test("rituals are 5 / 15 / 10 minute low-stakes options", () => {
  assert.equal(RITUALS.length, 3);
  assert.deepEqual(RITUALS.map((r) => r.minutes).sort((a, b) => a - b), [5, 10, 15]);
  for (const ritual of RITUALS) {
    assert.equal(ritual.kind, "ritual");
    assert.ok(ritual.href.startsWith("/"));
  }
});

test("greetingFor picks the right part of the day and honors names", () => {
  assert.equal(greetingFor(null, 9), "Good morning");
  assert.equal(greetingFor("Alex", 9), "Good morning, Alex");
  assert.equal(greetingFor("Alex", 13), "Good afternoon, Alex");
  assert.equal(greetingFor("Alex", 19), "Good evening, Alex");
  assert.equal(greetingFor("Alex", 23), "Up late, Alex");
  assert.equal(greetingFor("Alex", 3), "Up late, Alex");
});

test("skillForPillar maps pillars to skills and unknown goals to null", () => {
  const os = makeOS();
  addGoal(os, "g-health", "health");
  addGoal(os, "g-wealth", "wealth");
  assert.equal(skillForPillar(os, "g-health"), "fitness");
  assert.equal(skillForPillar(os, "g-wealth"), "career");
  assert.equal(skillForPillar(os, "nope"), null);
  assert.equal(skillForPillar(os, undefined), null);
});