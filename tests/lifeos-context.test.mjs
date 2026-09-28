import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyOSState } from "../lib/os/index.ts";
import { buildLifeosAiContext } from "../lib/ai/lifeos-context.ts";

function makeProfile(overrides = {}) {
  return {
    schemaVersion: 1,
    onboarded: true,
    identity: { name: overrides.name ?? "Alex", age: 30, grade: "", board: "" },
    subjects: [],
    exams: [],
    schedule: {
      studyDays: [1, 2, 3, 4, 5],
      preferredMinutesPerDay: 45,
      preferredSessionMinutes: 50,
    },
    preferences: { sound: true, showQuotes: true },
    goals: { weeklyStudyMinutes: 300 },
    created: "2026-08-01T00:00:00.000Z",
    updated: "2026-08-01T00:00:00.000Z",
  };
}

function emptyGamification() {
  return {
    completedSlugs: [],
    quizResults: {},
    highlightCount: 0,
    reflectionCount: 0,
    streak: { current: 0, best: 0, last: "" },
  };
}

function makeOS() {
  const os = createEmptyOSState();
  os.goals = {};
  os.roadmaps = {};
  os.milestones = {};
  os.tasks = {};
  return os;
}

function addGoal(os, id, title = "Get strong") {
  os.goals[id] = { id, title, why: "", pillar: "health", status: "active", roadmapIds: [], createdAt: "", updatedAt: "" };
}

function addRoadmap(os, goalId, id) {
  os.goals[goalId].roadmapIds.push(id);
  os.roadmaps[id] = { id, title: "Strength plan", phase: 2, status: "active", milestoneIds: [] };
}

function addMilestone(os, roadmapId, id) {
  os.roadmaps[roadmapId].milestoneIds.push(id);
  os.milestones[id] = { id, title: "First week", status: "active", taskIds: [] };
}

function addTask(os, milestoneId, id) {
  os.milestones[milestoneId].taskIds.push(id);
  os.tasks[id] = {
    id,
    kind: "action",
    title: "Do a pushup set",
    description: "",
    status: "todo",
    estimatedMinutes: 20,
    dueDate: "2026-09-15",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

test("empty state maps to an honest, adult-shaped empty context", () => {
  const context = buildLifeosAiContext({ date: "2026-09-15", os: makeOS(), profile: makeProfile(), gamification: emptyGamification() });
  assert.equal(context.date, "2026-09-15");
  assert.equal(context.profile.ageTier, "adult");
  assert.equal(context.profile.name, "Alex");
  assert.equal(context.profile.preferredMinutesPerDay, 45);
  assert.equal(context.profile.preferredSessionMinutes, 50);
  assert.deepEqual(context.progress.completedSlugs, []);
  assert.equal(context.progress.completionPct, 0);
  assert.deepEqual(context.exams, []);
  assert.equal(context.mission.label, "Set your first goal");
  assert.equal(context.roadmap.phase, null);
  assert.equal(context.roadmap.milestone, null);
  assert.equal(context.behavior.streakCurrent, 0);
  assert.ok(context.signals.some((s) => s.includes("no active plan")));
  assert.ok(context.signals.some((s) => s.includes("Good afternoon, Alex")), "greeting tone signal");
});

test("active plan flows into mission, roadmap and signals", () => {
  const os = makeOS();
  addGoal(os, "g1");
  addRoadmap(os, "g1", "r1");
  addMilestone(os, "r1", "m1");
  addTask(os, "m1", "t1");
  const context = buildLifeosAiContext({ date: "2026-09-15", os, profile: makeProfile(), gamification: emptyGamification() });
  assert.equal(context.mission.label, "Do a pushup set");
  assert.equal(context.mission.subjectName, "Get strong");
  assert.equal(context.roadmap.phase, 2);
  assert.equal(context.roadmap.title, "Strength plan");
  assert.equal(context.roadmap.milestone, "First week");
  assert.deepEqual(context.roadmap.items, ["Do a pushup set"]);
  assert.equal(context.behavior.todayFocusTaskNames.length, 1);
  assert.ok(context.signals.some((s) => s.includes("You have not earned any XP in")), "zero-XP skill signal");
});

test("hours override changes the greeting tone", () => {
  const context = buildLifeosAiContext({
    date: "2026-09-15",
    os: makeOS(),
    profile: makeProfile({ name: "Alex" }),
    gamification: emptyGamification(),
    hours: 21,
  });
  assert.ok(context.signals.some((s) => s.includes("Good evening, Alex")));
});

test("real completed sessions surface in behavior", () => {
  const os = makeOS();
  os.completionEvents = [
    { id: "e1", kind: "session-completed", occurredAt: "2026-09-14T08:00:00.000Z", value: 30 },
    { id: "e2", kind: "session-completed", occurredAt: "2026-09-15T08:00:00.000Z", value: 20 },
  ];
  const context = buildLifeosAiContext({ date: "2026-09-15", os, profile: makeProfile(), gamification: emptyGamification() });
  assert.equal(context.behavior.focusMinutesLast7Days, 50);
  assert.equal(context.behavior.focusSessionsLast7Days, 2);
  assert.equal(context.behavior.todayFocusMinutes, 20);
  assert.equal(context.behavior.streakCurrent, 2);
});