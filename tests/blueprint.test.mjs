import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKUP_TRANSACTION_KEY, buildBackup, recoverBackupTransaction, validateBackup } from "../lib/backup.ts";
import { addPortfolioArtifact, deletePortfolioArtifact, updatePortfolioArtifact } from "../lib/portfolio.ts";
import { deriveInbox, defaultNotificationState, dismissInboxItem } from "../lib/notifications.ts";
import { deriveLocalPatterns } from "../lib/os/patterns.ts";
import { createEmptyOSState, reduceOSState, typeSession } from "../lib/os/index.ts";

const NOW = "2026-09-20T09:00:00.000Z";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), dump: () => Object.fromEntries(values) };
}

test("portfolio artifacts can be added, edited, and deleted locally", () => {
  const fake = storage();
  const artifact = addPortfolioArtifact({ title: "Focus sprint note", description: "Finished the first block.", kind: "evidence", goalId: "goal-1" }, fake);
  assert.equal(JSON.parse(fake.dump()["levelup-portfolio-v1"]).length, 1);
  updatePortfolioArtifact(artifact.id, { title: "Updated focus sprint note" }, fake);
  assert.equal(JSON.parse(fake.dump()["levelup-portfolio-v1"])[0].title, "Updated focus sprint note");
  deletePortfolioArtifact(artifact.id, fake);
  assert.equal(JSON.parse(fake.dump()["levelup-portfolio-v1"]).length, 0);
});

test("inbox derives due-session reminders and supports dismissal", () => {
  const state = createEmptyOSState(NOW);
  const session = typeSession({ id: "session-1", taskId: "task-1", date: "2026-09-20", plannedMinutes: 25, status: "planned", createdAt: NOW, updatedAt: NOW });
  const next = { ...state, sessions: { [session.id]: session } };
  const inbox = deriveInbox(next, "2026-09-20");
  assert.equal(inbox.length, 1);
  const dismissed = dismissInboxItem({ ...defaultNotificationState(), dismissedIds: [inbox[0].id] }, inbox[0].id);
  assert.deepEqual(dismissed.dismissedIds, [inbox[0].id]);
});

test("local patterns expose actionable consistency and mastery gaps", () => {
  const state = createEmptyOSState(NOW);
  const patterns = deriveLocalPatterns({ ...state, sessions: { s1: typeSession({ id: "s1", taskId: "t1", date: "2026-09-20", plannedMinutes: 25, status: "completed", createdAt: NOW, updatedAt: NOW }) } }, "2026-09-20");
  assert.ok(patterns.some((pattern) => pattern.id === "planned-vs-completed"));
  assert.ok(patterns.some((pattern) => pattern.id === "mastery-gaps"));
});

test("focus pause and resume preserve elapsed seconds", () => {
  const session = typeSession({ id: "s1", taskId: "t1", date: "2026-09-20", plannedMinutes: 25, status: "planned", createdAt: NOW, updatedAt: NOW });
  let state = { ...createEmptyOSState(NOW), tasks: { t1: { id: "t1", milestoneId: "m1", title: "Task", kind: "focus", order: 1, sessionIds: ["s1"], status: "todo", createdAt: NOW, updatedAt: NOW } }, sessions: { s1: session }, milestones: { m1: { id: "m1", roadmapId: "r1", title: "Milestone", order: 1, taskIds: ["t1"], status: "active", createdAt: NOW, updatedAt: NOW } }, roadmaps: { r1: { id: "r1", goalId: "g1", title: "Roadmap", phase: 1, milestoneIds: ["m1"], status: "active", createdAt: NOW, updatedAt: NOW } }, goals: { g1: { id: "g1", title: "Goal", why: "", metric: { kind: "count", label: "sessions" }, baseline: 0, target: 1, current: 0, deadline: null, nextAction: "", roadmapIds: ["r1"], status: "active", createdAt: NOW, updatedAt: NOW } } };
  state = reduceOSState(state, { type: "session/start", sessionId: "s1", occurredAt: NOW });
  state = reduceOSState(state, { type: "session/pause", sessionId: "s1", occurredAt: "2026-09-20T09:10:00.000Z", elapsedSeconds: 600 });
  assert.equal(state.sessions.s1.elapsedSeconds, 600);
  state = reduceOSState(state, { type: "session/start", sessionId: "s1", occurredAt: "2026-09-20T09:15:00.000Z" });
  assert.equal(state.sessions.s1.pausedAt, undefined);
});

test("portfolio artifacts are included in validated backups", () => {
  const backup = buildBackup({ theme: "light", readerScale: "1", progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, portfolio: [{ id: "a1", title: "Proof", description: "A local artifact", kind: "evidence", createdAt: NOW, updatedAt: NOW }] });
  const result = validateBackup(backup);
  assert.equal(result.ok, true);
  assert.equal(result.data.portfolio[0].id, "a1");
});

test("stale backup journals recover previous values without deleting valid data", () => {
  const fake = storage();
  fake.setItem("levelup-progress-v1", "current-valid");
  fake.setItem(BACKUP_TRANSACTION_KEY, JSON.stringify({ schema: 1, previous: { "levelup-progress-v1": "previous-valid", "levelup-os-state-v1": "previous-os" } }));
  assert.equal(recoverBackupTransaction(fake), true);
  assert.equal(fake.dump()["levelup-progress-v1"], "previous-valid");
  assert.equal(fake.dump()["levelup-os-state-v1"], "previous-os");
  assert.equal(fake.dump()[BACKUP_TRANSACTION_KEY], undefined);
});
