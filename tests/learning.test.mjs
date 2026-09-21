import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { LEARNING_GUIDES, getLearningGuide } from "../lib/learningGuides.ts";
import { PRACTICE_PLANS, getPracticePlan } from "../lib/practicePlans.ts";
import { createPracticeTimer, remainingTime, startTimer, pauseTimer, nextTimerPhase } from "../lib/practiceTimer.ts";
import { buildBackup, validateBackup } from "../lib/backup.ts";

test("all 28 original chapters have a complete, distinct companion and valid plan", () => {
  const dir = new URL("../content/chapters/", import.meta.url);
  const slugs = readdirSync(dir).filter((file) => file.endsWith(".md")).map((file) => {
    const raw = readFileSync(new URL(file, dir), "utf8");
    return parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]).slug;
  });
  assert.equal(slugs.length, 28);
  assert.deepEqual(LEARNING_GUIDES.map((guide) => guide.slug).sort(), slugs.sort());
  assert.equal(new Set(LEARNING_GUIDES.map((guide) => guide.meaning)).size, 28);
  for (const slug of slugs) {
    const guide = getLearningGuide(slug);
    for (const field of ["meaning", "translation", "example", "tinyAction", "caution", "question", "answer"]) {
      assert.ok(guide[field]?.length > 30, `${slug}: meaningful ${field}`);
    }
    assert.ok(getPracticePlan(guide.planId));
  }
});

test("13 practical plans each include steps, an editable example and a smaller option", () => {
  assert.equal(PRACTICE_PLANS.length, 13);
  assert.equal(new Set(PRACTICE_PLANS.map((plan) => plan.id)).size, 13);
  for (const plan of PRACTICE_PLANS) {
    assert.ok(plan.steps.length >= 3 && plan.steps.length <= 5);
    assert.ok(plan.template.includes("\n"));
    assert.ok(plan.smaller.length > 30);
  }
  assert.throws(() => getPracticePlan("missing"));
  assert.equal(getLearningGuide("missing"), undefined);
});

test("timer starts, pauses, resumes and catches up from background time without drift", () => {
  let timer = createPracticeTimer();
  assert.equal(remainingTime(timer, 99_999), 25 * 60_000);
  timer = startTimer(timer, 1000);
  assert.equal(remainingTime(timer, 61_000), 24 * 60_000);
  assert.deepEqual(startTimer(timer, 20_000), timer, "double start is harmless");
  timer = pauseTimer(timer, 61_000);
  assert.equal(remainingTime(timer, 600_000), 24 * 60_000, "paused time does not tick");
  timer = startTimer(timer, 600_000);
  assert.equal(remainingTime(timer, 600_000 + 30 * 60_000), 0);
  timer = pauseTimer(timer, 600_000 + 30 * 60_000);
  assert.equal(timer.phase, "focus", "expiry does not start break or award progress");
  assert.equal(timer.deadline, null);
  assert.deepEqual(startTimer(timer, 9_999_999), timer, "expired phase cannot restart");
});

test("breaks are manual, gentle rhythm is 10/2, fourth break is longer", () => {
  let timer = nextTimerPhase(createPracticeTimer());
  assert.equal(timer.phase, "break");
  assert.equal(timer.remainingMs, 5 * 60_000);
  assert.equal(timer.deadline, null);
  for (let round = 2; round <= 4; round++) {
    timer = nextTimerPhase(timer);
    assert.equal(timer.round, round);
    assert.equal(timer.remainingMs, 25 * 60_000);
    timer = nextTimerPhase(timer);
    assert.equal(timer.remainingMs, (round === 4 ? 15 : 5) * 60_000);
  }
  const gentle = nextTimerPhase(createPracticeTimer(10));
  assert.equal(gentle.remainingMs, 2 * 60_000);
  assert.equal(nextTimerPhase(gentle).remainingMs, 10 * 60_000);
});

test("practice records round-trip through existing backups without reading completion", () => {
  const record = { id: "practice_test", protocolNum: "practice:pomodoro", protocolTitle: "Pomodoro starter", date: "2026-09-21", durationSeconds: 600, completedAt: 1000, inputs: { chapter: "hyperfocus", recordType: "Practice attempted", notes: "Tried three questions", checkedSteps: "[]" } };
  const backup = buildBackup({ theme: null, readerScale: null, progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null, actionState: { protocolLogs: [record] } });
  const result = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.actionState.protocolLogs, [record]);
  assert.deepEqual(result.data.progress, {});
});
