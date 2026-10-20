import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBackup, validateBackup, restoreBackupAtomically } from "../lib/backup.ts";
import { emptyHabitStore, seedStarterStore, setDayLog, saveHabitStore, HABITS_STORAGE_KEY } from "../lib/habits.ts";
import { habitHint } from "../lib/habitHints.ts";
import { formatLocalDate } from "../lib/dates.ts";

const base = { theme: null, readerScale: null, progress: {}, bookmarks: [], highlights: [], quiz: {}, reflections: {}, streak: null };
let id = 0;
const seeded = seedStarterStore(emptyHabitStore(), () => `habit-${++id}`);
const habits = setDayLog(seeded, seeded.habits[0].id, "2026-10-01", { status: "partial", value: 10, updatedAt: "2026-10-01T08:00:00Z" });
const storage = () => {
  const map = new Map();
  return { map, getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) };
};

test("habit backups round-trip schedules, templates, and partial logs", () => {
  const backup = buildBackup({ ...base, habits });
  const checked = validateBackup(backup);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.data.habits, habits);
  const store = storage();
  assert.equal(restoreBackupAtomically(checked.data, store).ok, true);
  assert.deepEqual(JSON.parse(store.getItem(HABITS_STORAGE_KEY)), habits);
});

test("saving reports browser quota failures rather than claiming persistence", () => {
  const original = globalThis.window;
  try {
    globalThis.window = { localStorage: { setItem: () => { throw new Error("quota"); } } };
    assert.equal(saveHabitStore(habits), false);
    globalThis.window = { localStorage: { setItem: () => {} } };
    assert.equal(saveHabitStore(habits), true);
  } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original; }
});

test("legacy and malformed optional habits do not reject a valid backup; restore clears stale habits", () => {
  for (const extra of [{}, { habits: { version: 1, habits: "invalid", log: {} } }]) {
    const checked = validateBackup({ ...buildBackup(base), ...extra });
    assert.equal(checked.ok, true);
    assert.equal(checked.data.habits, undefined);
    const store = storage();
    store.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    assert.equal(restoreBackupAtomically(checked.data, store).ok, true);
    assert.deepEqual(JSON.parse(store.getItem(HABITS_STORAGE_KEY)), emptyHabitStore());
  }
});

test("failed multi-key restore rolls habit data back too", () => {
  const store = storage();
  store.setItem(HABITS_STORAGE_KEY, "original habits");
  const write = store.setItem;
  let failed = false;
  store.setItem = (key, value) => {
    if (key === "levelup-quiz-v1" && !failed) { failed = true; throw new Error("quota"); }
    write(key, value);
  };
  assert.equal(restoreBackupAtomically({ ...base, habits }, store).ok, false);
  assert.equal(store.getItem(HABITS_STORAGE_KEY), "original habits");
  assert.equal(store.getItem("levelup-backup-transaction-v1"), null);
});

const blankEvidence = { focus: [], sessions: [], protocols: [], quizzes: [], highlights: [], reviews: [] };
test("focus hint uses actual recorded time from the latest completed block, without mutating records", () => {
  const evidence = { ...blankEvidence, sessions: [{ date: "2026-10-01", status: "completed", completedAt: "2026-10-01T09:00:00Z", elapsedSeconds: 600 }, { date: "2026-10-01", status: "planned", elapsedSeconds: 1500 }] };
  const before = JSON.stringify(evidence);
  assert.equal(habitHint(seeded.habits[0], "2026-10-01", evidence).value, 10);
  assert.equal(JSON.stringify(evidence), before);
  assert.equal(habitHint(seeded.habits[0], "2026-10-02", evidence), undefined);
  // A sub-minute block is still real evidence: it must still hint, phrased in seconds,
  // and must not pre-fill 0 (which would clear the entry on confirm).
  const brief = { ...blankEvidence, sessions: [{ date: "2026-10-01", status: "completed", completedAt: "2026-10-01T10:00:00Z", elapsedSeconds: 30 }] };
  const briefHint = habitHint(seeded.habits[0], "2026-10-01", brief);
  assert.match(briefHint.text, /30 sec/);
  assert.equal(briefHint.value, undefined);
});

test("quiz and reflection hints only use evidence from the local day", () => {
  const ts = new Date(2026, 9, 1, 23, 30).getTime();
  const day = formatLocalDate(new Date(ts));
  const quiz = seeded.habits.find((h) => h.link === "quiz");
  const reflect = seeded.habits.find((h) => h.template === "reflect");
  const entry = { ts, score: 8, total: 10 };
  const quizHint = habitHint(quiz, day, { ...blankEvidence, quizzes: [entry] });
  assert.ok(quizHint);
  assert.match(quizHint.text, /8\/10/);
  assert.equal(habitHint(quiz, "2026-10-02", { ...blankEvidence, quizzes: [entry] }), undefined);
  assert.ok(habitHint(reflect, day, { ...blankEvidence, reviews: [{ date: day }] }));
  assert.equal(habitHint(reflect, day, blankEvidence), undefined);
});
