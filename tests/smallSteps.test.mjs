import { test } from "node:test";
import assert from "node:assert/strict";
import { emptySmallSteps, transitionSmallSteps as step, restoreSmallSteps, isSmallSteps, SMALL_STEPS_KEY } from "../lib/smallSteps.ts";
import { buildBackup, validateBackup, restoreBackupAtomically } from "../lib/backup.ts";
import { isSavedAction } from "../lib/smallSteps.ts";
import { emptyPracticeDrafts, editPracticeDraft, isPracticeDrafts, PRACTICE_DRAFTS_KEY } from "../lib/practiceDrafts.ts";
import { discoverPractices, PRACTICE_FIT } from "../lib/practiceDiscovery.ts";
import { PRACTICE_PLANS } from "../lib/practicePlans.ts";
import { LEARNING_GUIDES } from "../lib/learningGuides.ts";
const draft = () => step(emptySmallSteps(), { type: "edit", patch: { task: "Homework", actions: ["Open notebook", "Read question"] } });
const start = s => step(s, { type: "start", now: 1000, id: "attempt-one" });
const backup = smallSteps => buildBackup({ theme: "light", readerScale: "1", progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, ...(smallSteps ? { smallSteps } : {}) });
const queued = (id = "q1") => ({ id, task: `Read ${id}`, actions: ["Open the page"], current: 0, minutes: 2, restart: "Start here", source: "/chapters/hyperfocus/" });
test("all 28 lesson actions and all 13 practice starters fit the saved action contract", () => {
  assert.equal(LEARNING_GUIDES.length, 28);
  for (const guide of LEARNING_GUIDES) assert.ok(isSavedAction({ ...queued(), actions: [guide.tinyAction], source: `/chapters/${guide.slug}/` }), guide.slug);
  for (const plan of PRACTICE_PLANS) assert.ok(isSavedAction({ ...queued(), actions: [plan.steps[0]], task: plan.title, source: "/protocols/" }), plan.id);
});
test("saving a lesson action never overwrites an active task and rejects duplicates", () => {
  const active = start(draft());
  const next = step(active, { type: "queue/add", action: queued() });
  assert.equal(next.task, active.task); assert.equal(next.phase, "running");
  assert.equal(step(next, { type: "queue/add", action: { ...queued(), id: "other" } }), next);
  assert.equal(step(next, { type: "queue/select", id: "q1", parkedId: "parked" }), next);
});
test("switching safely parks the current action, completed-step index and return note", () => {
  let s = { ...draft(), current: 1, restart: "Question two", queue: [queued()] };
  s = step(s, { type: "queue/select", id: "q1", parkedId: "parked" });
  assert.equal(s.task, "Read q1"); assert.equal(s.source, "/chapters/hyperfocus/");
  assert.equal(s.queue[0].current, 1); assert.equal(s.queue[0].restart, "Question two");
  s = step(s, { type: "queue/select", id: "parked", parkedId: "parked-again" });
  assert.equal(s.task, "Homework"); assert.equal(s.current, 1); assert.equal(s.queue[0].task, "Read q1");
});
test("queue is bounded, removable and reorderable without touching the active action", () => {
  let s = draft(); for (let n = 0; n < 20; n++) s = step(s, { type: "queue/add", action: queued(`q${n}`) });
  assert.equal(step(s, { type: "queue/add", action: queued("overflow") }), s);
  s = step(s, { type: "queue/first", id: "q19" }); assert.equal(s.queue[0].id, "q19");
  s = step(s, { type: "queue/remove", id: "q19" }); assert.equal(s.queue.length, 19); assert.equal(s.task, "Homework");
});
test("opening a saved action also preserves a draft that has notes but no title yet", () => {
  const s = { ...emptySmallSteps(), restart: "Do not lose this note", queue: [queued()] };
  const next = step(s, { type: "queue/select", id: "q1", parkedId: "parked" });
  assert.equal(next.queue[0].task, "Untitled action");
  assert.equal(next.queue[0].restart, "Do not lose this note");
});
test("finishing the last active step preserves the saved queue", () => {
  let s = { ...draft(), actions: ["Open notebook"], queue: [queued()] };
  s = step(start(s), { type: "end", now: 6000 });
  s = step(s, { type: "finish", now: 7000, choice: "done" });
  assert.equal(s.task, ""); assert.equal(s.queue.length, 1); assert.equal(s.history.length, 1);
});
test("queue validators reject executable links, duplicate ids and malformed backup additions", () => {
  assert.equal(isSavedAction({ ...queued(), source: "javascript:alert(1)" }), false);
  assert.equal(isSmallSteps({ ...draft(), queue: [queued(), queued()] }), false);
  assert.equal(validateBackup({ ...backup(), smallSteps: { ...draft(), queue: [null] } }).ok, false);
});
test("practice discovery covers every plan and combines search, need and setup filters", () => {
  assert.equal(discoverPractices("", "all", 15).length, PRACTICE_PLANS.length);
  for (const p of PRACTICE_PLANS) assert.ok(PRACTICE_FIT[p.id]);
  assert.deepEqual(discoverPractices("", "start", 2).map(p => p.id), ["tiny-start"]);
  assert.equal(discoverPractices("   POMODORO  ", "focus", 5)[0].id, "pomodoro");
  assert.equal(discoverPractices("zzzz", "all", 15).length, 0);
});
test("practice drafts preserve sibling plans and reject oversized or malformed updates", () => {
  let s = editPracticeDraft(emptyPracticeDrafts(), "pomodoro:library", { notes: "My draft", checked: [0], kind: "Practice attempted" }, 1000);
  s = editPracticeDraft(s, "tiny-start:hyperfocus", { notes: "Other draft" }, 2000);
  assert.equal(s.entries["pomodoro:library"].notes, "My draft");
  assert.equal(editPracticeDraft(s, "pomodoro:library", { notes: "x".repeat(5001) }, 3000), s);
  assert.equal(editPracticeDraft(s, "pomodoro:library", { checked: [0, 0] }, 3000), s);
  assert.ok(isPracticeDrafts(s));
});
test("drafts and queued actions survive backup round trip; invalid drafts reject the entire file", () => {
  const drafts = editPracticeDraft(emptyPracticeDrafts(), "pomodoro:library", { notes: "Remember this" }, 1000);
  const payload = { ...backup({ ...draft(), queue: [queued()] }), practiceDrafts: drafts };
  const checked = validateBackup(payload); assert.ok(checked.ok);
  assert.equal(checked.data.practiceDrafts.entries["pomodoro:library"].notes, "Remember this");
  assert.equal(checked.data.smallSteps.queue.length, 1);
  assert.equal(validateBackup({ ...payload, practiceDrafts: { version: 1, entries: [] } }).ok, false);
});
test("rollback includes practice drafts when a later restore write fails", () => {
  const values = new Map([[PRACTICE_DRAFTS_KEY, "original"]]); let failed = false;
  const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key), setItem: (key, value) => { if (key === "levelup-progress-v1" && !failed) { failed = true; throw new Error("quota"); } values.set(key, value); } };
  assert.equal(restoreBackupAtomically(validateBackup(backup()).data, storage).ok, false);
  assert.equal(values.get(PRACTICE_DRAFTS_KEY), "original");
});
test("a task and an action are required, but no goal is required", () => {
  assert.equal(start(emptySmallSteps()).phase, "ready");
  assert.equal(start(draft()).phase, "running");
});
test("pause and resume count only running time and preserve attempt identity", () => {
  let s = step(start(draft()), { type: "pause", now: 6500 });
  assert.equal(s.elapsed, 5.5);
  s = step(s, { type: "start", now: 90000, id: "ignored" });
  s = step(s, { type: "end", now: 93500 });
  assert.equal(s.elapsed, 9); assert.equal(s.attemptId, "attempt-one");
});
test("restoring a running timer pauses without crediting time away", () => {
  const s = step(start(draft()), { type: "tick", now: 3000 });
  assert.deepEqual(restoreSmallSteps(s), { ...s, phase: "paused", startedAt: null });
});
test("expiry is bounded and does not complete the action or record history", () => {
  const s = step(start(draft()), { type: "tick", now: 99999999 });
  assert.equal(s.elapsed, 300); assert.equal(s.phase, "ended"); assert.equal(s.current, 0); assert.equal(s.history.length, 0);
});
test("explicit completion records actual seconds once on the local date", () => {
  const now = new Date(2026, 9, 11, 0, 1).getTime();
  let s = step(start(draft()), { type: "end", now: 4100 });
  s = step(s, { type: "finish", now, choice: "done" });
  assert.equal(s.history[0].seconds, 3); assert.equal(s.history[0].date, "2026-10-11"); assert.equal(s.current, 1);
  assert.deepEqual(step(s, { type: "finish", now, choice: "done" }), s);
});
test("leaving for later preserves restart note; smaller action can be edited paused", () => {
  let s = step(start(draft()), { type: "pause", now: 6000 });
  s = step(s, { type: "edit", patch: { actions: ["Pick up notebook", "Read question"], restart: "Page 3", later: "Find pencil", minutes: 15 } });
  assert.equal(s.minutes, 5); assert.equal(s.actions[0], "Pick up notebook");
  s = step(s, { type: "finish", now: 10000, choice: "later" });
  assert.equal(s.restart, "Page 3"); assert.equal(s.later, "Find pencil"); assert.equal(s.task, "Homework"); assert.equal(s.phase, "ready");
});
test("strict validation rejects corrupt indexes, clocks, oversized content and history", () => {
  const s = draft(); assert.ok(isSmallSteps(s));
  for (const patch of [{ current: 3 }, { elapsed: NaN }, { minutes: 100 }, { task: "x".repeat(241) }, { actions: [] }, { history: [{}] }, { phase: "running", startedAt: null }]) assert.equal(isSmallSteps({ ...s, ...patch }), false);
});
test("backup preserves steps and rejects malformed new chunks while accepting old backups", () => {
  assert.ok(validateBackup(backup()).ok);
  assert.equal(validateBackup(backup(start(draft()))).data.smallSteps.phase, "paused");
  assert.equal(validateBackup({ ...backup(), smallSteps: { version: 1 } }).ok, false);
});
test("failed atomic restore rolls back the Small Steps key as well", () => {
  const values = new Map([[SMALL_STEPS_KEY, "original"]]); let failed = false;
  const storage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key), setItem: (key, value) => { if (key === "levelup-progress-v1" && !failed) { failed = true; throw new Error("quota"); } values.set(key, value); } };
  const result = restoreBackupAtomically(validateBackup(backup(draft())).data, storage);
  assert.equal(result.ok, false); assert.equal(values.get(SMALL_STEPS_KEY), "original");
});
