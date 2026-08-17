import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceStreak,
  badgesFor,
  computeXp,
  levelFor,
  quizPct,
} from "../lib/gamification.ts";

test("computeXp adds chapter, quiz, highlight and reflection points", () => {
  const xp = computeXp({
    completedSlugs: ["a", "b"],
    quizResults: { a: { score: 4, total: 5 }, b: { score: 3, total: 3 } },
    highlightCount: 3,
    reflectionCount: 2,
    streak: { current: 1, best: 1, last: "2026-08-17" },
  });
  assert.equal(xp, 2 * 50 + 25 + 35 + 3 * 2 + 2 * 5);
});

test("computeXp ignores sub-70% quizzes", () => {
  const xp = computeXp({
    completedSlugs: [],
    quizResults: { a: { score: 3, total: 5 } },
    highlightCount: 0,
    reflectionCount: 0,
    streak: { current: 0, best: 0, last: "" },
  });
  assert.equal(xp, 0);
});

test("quizPct guards against zero totals", () => {
  assert.equal(quizPct(3, 5), 60);
  assert.equal(quizPct(3, 0), 0);
});

test("levelFor maps xp to thresholds", () => {
  assert.equal(levelFor(0).name, "Apprentice");
  assert.equal(levelFor(0).next, 100);
  assert.equal(levelFor(99).name, "Apprentice");
  assert.equal(levelFor(100).name, "Practitioner");
  assert.equal(levelFor(249).name, "Practitioner");
  assert.equal(levelFor(250).name, "Specialist");
  assert.equal(levelFor(500).name, "Expert");
  assert.equal(levelFor(900).name, "Master");
  assert.equal(levelFor(1500).name, "Grandmaster");
  assert.equal(levelFor(1500).next, null);
  assert.equal(levelFor(2000).progress, 1);
});

test("levelFor progress is a 0..1 ratio toward the next level", () => {
  assert.equal(levelFor(50).progress, 0.5);
  assert.equal(levelFor(100).progress, 0);
});

test("advanceStreak handles fresh, same-day, yesterday and gap cases", () => {
  const fresh = advanceStreak({ current: 0, best: 0, last: "" }, "2026-08-17");
  assert.deepEqual(fresh, { current: 1, best: 1, last: "2026-08-17" });

  const sameDay = advanceStreak(fresh, "2026-08-17");
  assert.deepEqual(sameDay, fresh, "same-day repeat is a no-op");

  const nextDay = advanceStreak(fresh, "2026-08-18");
  assert.deepEqual(nextDay, { current: 2, best: 2, last: "2026-08-18" });

  const gap = advanceStreak(fresh, "2026-08-20");
  assert.deepEqual(gap, { current: 1, best: 1, last: "2026-08-20" }, "gap resets current");

  const bestKept = advanceStreak(
    { current: 1, best: 5, last: "2026-08-20" },
    "2026-08-21"
  );
  assert.equal(bestKept.current, 2);
  assert.equal(bestKept.best, 5);
});

test("badgesFor stays all locked for an empty state", () => {
  const { badges, changed } = badgesFor(
    {
      completedSlugs: [],
      quizResults: {},
      highlightCount: 0,
      reflectionCount: 0,
      streak: { current: 0, best: 0, last: "" },
    },
    {},
    "2026-08-17"
  );
  assert.equal(badges.length, 9);
  assert.ok(badges.every((b) => !b.unlocked));
  assert.equal(changed, false);
});

test("badgesFor records unlock dates once", () => {
  const state = {
    completedSlugs: ["a"],
    quizResults: {},
    highlightCount: 10,
    reflectionCount: 5,
    streak: { current: 1, best: 3, last: "2026-08-17" },
  };
  const first = badgesFor(state, {}, "2026-08-17");
  const unlocked = first.badges.filter((b) => b.unlocked).map((b) => b.id);
  assert.deepEqual(unlocked, ["first-chapter", "streak-3", "bibliophile", "scribe"]);
  assert.equal(first.changed, true);
  assert.equal(first.store["first-chapter"], "2026-08-17");

  const second = badgesFor(state, first.store, "2026-08-18");
  assert.equal(second.changed, false, "no new unlock dates on repeat evaluation");
  assert.equal(second.badges.find((b) => b.id === "first-chapter")?.unlockDate, "2026-08-17");
});

test("badgesFor quiz-master requires all 28 quizzes at 70%+", () => {
  const quizResults = Object.fromEntries(
    Array.from({ length: 28 }, (_, i) => [String(i), { score: 3, total: 4 }])
  );
  const allPass = badgesFor(
    {
      completedSlugs: Array.from({ length: 28 }, (_, i) => String(i)),
      quizResults,
      highlightCount: 0,
      reflectionCount: 0,
      streak: { current: 0, best: 0, last: "" },
    },
    {},
    "2026-08-17"
  );
  assert.equal(allPass.badges.find((b) => b.id === "quiz-master")?.unlocked, true);
  assert.equal(allPass.badges.find((b) => b.id === "finisher")?.unlocked, true);

  const oneFail = badgesFor(
    {
      completedSlugs: Array.from({ length: 28 }, (_, i) => String(i)),
      quizResults: { ...quizResults, "5": { score: 1, total: 3 } },
      highlightCount: 0,
      reflectionCount: 0,
      streak: { current: 0, best: 0, last: "" },
    },
    {},
    "2026-08-17"
  );
  assert.equal(oneFail.badges.find((b) => b.id === "quiz-master")?.unlocked, false);
});
