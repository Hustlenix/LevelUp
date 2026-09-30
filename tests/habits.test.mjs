import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HABITS_STORAGE_KEY,
  archiveHabit,
  addHabit,
  bestStreak,
  currentStreak,
  emptyHabitStore,
  entryForValue,
  hasHabits,
  isHabitStore,
  isScheduledOn,
  loadHabitStore,
  removeHabit,
  restoreHabit,
  saveHabitStore,
  seedStarterStore,
  setDayLog,
  starterTemplates,
  todayRoutine,
  updateHabit,
  weekView,
  weekdayOf,
} from "../lib/habits.ts";

// Thursday 2026-09-24 sits mid-week: Mon 09-21 ... Sun 09-27, Fri 09-25, Sat 09-26.
const THU = "2026-09-24";
const MON = "2026-09-21";
const TUE = "2026-09-22";
const WED = "2026-09-23";
const FRI = "2026-09-25";
const SAT = "2026-09-26";
const SUN = "2026-09-27";
const NEXT_MON = "2026-09-28";

function habit(overrides = {}) {
  return {
    id: "h1",
    name: "Deep focus block",
    kind: "check",
    days: [0, 1, 2, 3, 4, 5, 6],
    archived: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function store(habits = [], log = {}) {
  return { version: 1, habits, log };
}

function at(status, value) {
  const entry = { status, updatedAt: "2026-09-24T09:00:00.000Z" };
  if (value !== undefined) entry.value = value;
  return entry;
}

/** Local-calendar day shift, mirroring the implementation (never UTC). */
function dayKey(base, delta) {
  const [y, m, d] = base.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + delta);
  const month = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${shifted.getFullYear()}-${month}-${day}`;
}

// --- seed -----------------------------------------------------------------

test("seedStarterStore fills an empty store with the five templates", () => {
  const ids = ["s1", "s2", "s3", "s4", "s5"];
  let call = 0;
  const seeded = seedStarterStore(emptyHabitStore(), () => ids[call++]);

  assert.equal(seeded.habits.length, 5);
  assert.deepEqual(seeded.habits.map((h) => h.id), ids);
  assert.deepEqual(
    seeded.habits.map((h) => h.name),
    ["Deep focus block", "Pillar floors", "One protocol", "Quiz or review", "Highlight + reflection"],
  );
  assert.deepEqual(
    seeded.habits.map((h) => h.template),
    ["focus", "pillars", "protocol", "quiz-review", "reflect"],
  );
  assert.deepEqual(
    seeded.habits.map((h) => h.link),
    ["focus", "pillars", "protocol", "quiz", undefined],
  );

  const [focus, pillars, protocol, quiz, reflect] = seeded.habits;
  assert.equal(focus.kind, "quantity");
  assert.equal(focus.unit, "min");
  assert.equal(focus.target, 25);
  assert.equal(pillars.kind, "check");
  assert.equal(pillars.unit, undefined);
  assert.equal(reflect.link, undefined);
  for (const h of seeded.habits) {
    assert.equal(h.archived, false);
    assert.match(h.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  }

  // schedules: focus/pillars/reflect daily, protocol Mon-Sat, quiz Mon-Fri
  assert.ok(isScheduledOn(focus, MON) && isScheduledOn(focus, SUN));
  assert.ok(isScheduledOn(pillars, SUN));
  assert.ok(isScheduledOn(reflect, SUN));
  assert.ok(!isScheduledOn(protocol, SUN));
  assert.ok(isScheduledOn(protocol, SAT));
  assert.ok(!isScheduledOn(quiz, SAT) && !isScheduledOn(quiz, SUN));
  assert.ok(isScheduledOn(quiz, FRI));

  assert.ok(isHabitStore(seeded));
  assert.deepEqual(seeded.log, {});
});

test("seeding is idempotent and never overwrites an existing habit", () => {
  const ids = ["s1", "s2", "s3", "s4", "s5"];
  let call = 0;
  const seeded = seedStarterStore(emptyHabitStore(), () => ids[call++]);

  const again = seedStarterStore(seeded, () => "should-not-be-used");
  assert.equal(again, seeded);
  assert.deepEqual(again.habits.map((h) => h.id), ids);

  const edited = updateHabit(seeded, "s1", { name: "My own focus block" });
  const third = seedStarterStore(edited, () => "nope");
  assert.equal(third, edited);
  assert.equal(third.habits.length, 5);
  assert.equal(third.habits[0].name, "My own focus block");
});

test("starterTemplates returns fresh objects with id/createdAt left to the caller", () => {
  const first = starterTemplates();
  const second = starterTemplates();
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
  assert.notEqual(first[0].days, second[0].days);
  assert.equal(first[0].id, "");
  assert.equal(first[0].createdAt, "");

  first[0].name = "mutated";
  first[0].days.push(0);
  assert.equal(starterTemplates()[0].name, "Deep focus block");
  assert.equal(starterTemplates()[0].days.length, 7);
});

test("hasHabits counts archived habits too", () => {
  assert.equal(hasHabits(emptyHabitStore()), false);
  const withOne = addHabit(emptyHabitStore(), habit());
  assert.equal(hasHabits(withOne), true);
  assert.equal(hasHabits(archiveHabit(withOne, "h1")), true);
  assert.equal(hasHabits(removeHabit(withOne, "h1")), false);
});

// --- validation -----------------------------------------------------------

test("isHabitStore accepts a canonical store", () => {
  assert.equal(isHabitStore(emptyHabitStore()), true);
  const canonical = store([habit({ kind: "quantity", unit: "min", target: 25, link: "focus", template: "focus" })], {
    h1: { [THU]: at("partial", 10), [WED]: at("skipped") },
  });
  assert.equal(isHabitStore(canonical), true);
  assert.equal(isHabitStore(JSON.parse(JSON.stringify(canonical))), true);
});

test("isHabitStore rejects anything it cannot fully trust", () => {
  const canonical = store([habit()], { h1: { [THU]: at("done", 10) } });

  assert.equal(isHabitStore(null), false);
  assert.equal(isHabitStore(undefined), false);
  assert.equal(isHabitStore("{}"), false);
  assert.equal(isHabitStore([canonical]), false);
  assert.equal(isHabitStore({ ...canonical, version: 2 }), false);
  assert.equal(isHabitStore({ ...canonical, version: "1" }), false);
  assert.equal(isHabitStore({ ...canonical, habits: {} }), false);
  assert.equal(isHabitStore({ ...canonical, log: [] }), false);
  assert.equal(isHabitStore({ ...canonical, log: null }), false);
  assert.equal(isHabitStore({ ...canonical, log: { h1: "nope" } }), false);
  assert.equal(isHabitStore({ ...canonical, log: { h1: { [THU]: { status: "maybe", updatedAt: "" } } } }), false);
  assert.equal(isHabitStore({ ...canonical, log: { h1: { [THU]: { updatedAt: "" } } } }), false);

  assert.equal(isHabitStore(store([habit({ name: "" })])), false);
  assert.equal(isHabitStore(store([habit({ name: 7 })])), false);
  assert.equal(isHabitStore(store([habit({ kind: "timer" })])), false);
  assert.equal(isHabitStore(store([habit({ archived: "yes" })])), false);
  assert.equal(isHabitStore(store([habit({ id: "" })])), false);
  assert.equal(isHabitStore(store([habit({ createdAt: 12345 })])), false);
  assert.equal(isHabitStore(store([habit({ days: [] })])), false);
  assert.equal(isHabitStore(store([habit({ days: [0, 7] })])), false);
  assert.equal(isHabitStore(store([habit({ days: [-1] })])), false);
  assert.equal(isHabitStore(store([habit({ days: [1.5] })])), false);
  assert.equal(isHabitStore(store([habit({ days: [1, 1] })])), false);
  assert.equal(isHabitStore(store([habit({ days: "daily" })])), false);
  assert.equal(isHabitStore(store([habit({ link: "sleep" })])), false);
  assert.equal(isHabitStore(store([habit({ target: "25" })])), false);
  assert.equal(isHabitStore([habit()]), false);
});

// --- CRUD -----------------------------------------------------------------

test("addHabit appends, and re-adding a known id replaces in place", () => {
  let next = addHabit(emptyHabitStore(), habit({ id: "a", name: "A" }));
  next = addHabit(next, habit({ id: "b", name: "B" }));
  assert.deepEqual(next.habits.map((h) => h.id), ["a", "b"]);

  const replaced = addHabit(next, habit({ id: "a", name: "A renamed" }));
  assert.deepEqual(replaced.habits.map((h) => h.id), ["a", "b"]);
  assert.equal(replaced.habits[0].name, "A renamed");
  assert.equal(replaced.habits[1].name, "B");
  assert.equal(next.habits[0].name, "A", "input store must not be mutated");
});

test("updateHabit patches one habit and never touches the input", () => {
  const base = addHabit(emptyHabitStore(), habit({ kind: "check" }));
  const renamed = updateHabit(base, "h1", { name: "Later", days: [1, 2, 3] });

  assert.equal(renamed.habits[0].name, "Later");
  assert.deepEqual(renamed.habits[0].days, [1, 2, 3]);
  assert.equal(renamed.habits[0].id, "h1");
  assert.equal(base.habits[0].name, "Deep focus block");
  assert.deepEqual(base.habits[0].days, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(updateHabit(base, "missing", { name: "x" }), base);
});

test("archive and restore flip the flag; remove deletes habit and log", () => {
  const base = addHabit(emptyHabitStore(), habit());
  const logged = setDayLog(base, "h1", THU, at("done"));
  assert.ok(logged.log.h1[THU]);

  const archived = archiveHabit(logged, "h1");
  assert.equal(archived.habits[0].archived, true);
  assert.ok(archived.log.h1[THU], "archiving keeps the log");
  assert.equal(logged.habits[0].archived, false);

  const restored = restoreHabit(archived, "h1");
  assert.equal(restored.habits[0].archived, false);

  const removed = removeHabit(logged, "h1");
  assert.deepEqual(removed.habits, []);
  assert.deepEqual(removed.log, {});
  assert.equal(removeHabit(logged, "missing"), logged);
});

test("setDayLog writes, replaces and removes entries without mutating the input", () => {
  const base = addHabit(emptyHabitStore(), habit({ kind: "quantity", unit: "min", target: 25 }));
  const first = setDayLog(base, "h1", THU, at("partial", 10));
  const replaced = setDayLog(first, "h1", THU, at("done", 25));
  assert.equal(replaced.log.h1[THU].status, "done");
  assert.equal(replaced.log.h1[THU].value, 25);
  assert.equal(first.log.h1[THU].status, "partial");
  assert.equal(base.log.h1, undefined);

  const cleared = setDayLog(replaced, "h1", THU, null);
  assert.equal(cleared.log.h1, undefined, "empty bucket is dropped");
  assert.deepEqual(cleared.log, {});
  assert.equal(setDayLog(base, "h1", THU, null), base);
  assert.deepEqual(Object.keys(replaced.log.h1), [THU], "input log untouched");
});

test("weekdayOf reads local weekdays from the key", () => {
  assert.equal(weekdayOf(MON), 1);
  assert.equal(weekdayOf(SUN), 0);
  assert.equal(weekdayOf(THU), 4);
  assert.equal(weekdayOf(dayKey(MON, -1)), 0);
});

// --- hostile ids and values ----------------------------------------------
// A store is only as trustworthy as the weakest write path: one malformed value
// makes isHabitStore fail, and loadHabitStore answers that with an empty store —
// so these guard the invariant that no write can produce a store its own guard
// would reject. Habit ids are untrusted too (a restored backup may hold any
// string), and several names on Object.prototype are ids a user could reach.

const INHERITED_IDS = [
  "toString",
  "constructor",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__proto__",
];

test("a habit id that collides with an inherited key still takes and reads back a log entry", () => {
  const base = store([habit({ id: "__proto__", name: "Proto habit" })]);
  const logged = setDayLog(base, "__proto__", THU, at("done"));

  assert.equal(Object.hasOwn(logged.log, "__proto__"), true, "the bucket is an own key, not the prototype");
  assert.deepEqual(Object.keys(logged.log), ["__proto__"], "and it is visible to Object.keys");
  assert.equal(Object.getPrototypeOf(logged.log), Object.prototype, "the prototype is not hijacked");
  assert.equal(logged.log["__proto__"][THU].status, "done");
  assert.equal(Object.hasOwn(base.log, "__proto__"), false, "input store must not be mutated");
  assert.equal(Object.getPrototypeOf(base.log), Object.prototype);

  // It has to survive the guard, JSON and a reload — the log is persisted.
  assert.equal(isHabitStore(logged), true);
  const reloaded = JSON.parse(JSON.stringify(logged));
  assert.equal(Object.hasOwn(reloaded.log, "__proto__"), true);
  assert.equal(isHabitStore(reloaded), true);
  assert.equal(reloaded.log["__proto__"][THU].status, "done");

  // ...and every reader has to find it, not just the writer.
  assert.equal(currentStreak(logged, "__proto__", THU), 1);
  assert.equal(bestStreak(logged, "__proto__", THU), 1);
  assert.equal(todayRoutine(logged, THU).completed, 1);
  assert.equal(weekView(logged, THU).rows[0].cells[3], "done");

  // Replacing an entry works, and clearing the last one drops the bucket
  // instead of leaving behind a habit that can never be logged again.
  const replaced = setDayLog(logged, "__proto__", THU, at("skipped"));
  assert.equal(replaced.log["__proto__"][THU].status, "skipped");
  assert.equal(logged.log["__proto__"][THU].status, "done", "input store must not be mutated");

  const cleared = setDayLog(replaced, "__proto__", THU, null);
  assert.equal(Object.hasOwn(cleared.log, "__proto__"), false);
  assert.deepEqual(cleared.log, {});
  assert.equal(isHabitStore(cleared), true);
  assert.equal(setDayLog(base, "__proto__", THU, null), base, "removing an absent entry is a no-op");
});

test("a habit with no log never reads an inherited key as if it were data", () => {
  const base = addHabit(emptyHabitStore(), habit({ id: "toString" }));
  assert.equal(Object.hasOwn(base.log, "toString"), false);

  // A missing bucket must stay missing: a function off the prototype is not a
  // day log, and reading it as one would invent streak history.
  assert.equal(currentStreak(base, "toString", THU), 0);
  assert.equal(bestStreak(base, "toString", THU), 0);
  assert.equal(todayRoutine(base, THU).items[0].entry, undefined);
  assert.equal(weekView(base, THU).rows[0].cells[3], "none");
  assert.equal(currentStreak(base, "constructor", THU), 0, "an id with no habit at all is a clean 0");

  // The write path is own-key for every inherited name, not just __proto__.
  for (const id of INHERITED_IDS) {
    const written = setDayLog(store([habit({ id })]), id, THU, at("done"));
    assert.equal(Object.hasOwn(written.log, id), true, `${id} must be stored as an own key`);
    assert.equal(written.log[id][THU].status, "done");
    assert.equal(Object.getPrototypeOf(written.log), Object.prototype, `${id} must not hijack the prototype`);
    assert.equal(isHabitStore(written), true, `${id} must still validate`);
  }
});

test("removeHabit treats an inherited-key id as absent and returns the identical store", () => {
  const base = emptyHabitStore();
  for (const id of INHERITED_IDS) {
    assert.equal(removeHabit(base, id), base, `removing absent "${id}" must be a no-op`);
  }

  // A real removal still takes the habit and its log bucket with it.
  const withOne = setDayLog(addHabit(emptyHabitStore(), habit({ id: "toString" })), "toString", THU, at("done"));
  assert.equal(Object.hasOwn(withOne.log, "toString"), true);

  const removed = removeHabit(withOne, "toString");
  assert.deepEqual(removed.habits, []);
  assert.deepEqual(removed.log, {});
  assert.equal(Object.hasOwn(withOne.log, "toString"), true, "input store must not be mutated");
  assert.equal(Object.getPrototypeOf(removed.log), Object.prototype);
});

test("entryForValue refuses a non-finite value instead of writing an entry the guard rejects", () => {
  const measured = habit({ id: "q", kind: "quantity", unit: "min", target: 25 });
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => entryForValue(measured, bad), RangeError, `${bad} must be refused`);
  }
  // One rule for every kind, so a check habit cannot be the odd one out.
  assert.throws(() => entryForValue(habit({ kind: "check" }), NaN), RangeError);

  // The store the guard rejects is exactly what a coerced value would have built.
  assert.equal(
    isHabitStore(store([measured], { q: { [THU]: { status: "partial", value: NaN, updatedAt: "" } } })),
    false,
  );

  // A check habit is still exactly {status, updatedAt} — never a value key.
  const check = entryForValue(habit({ kind: "check" }), 5);
  assert.equal(check.status, "done");
  assert.equal(Object.hasOwn(check, "value"), false);
  assert.deepEqual(Object.keys(check).sort(), ["status", "updatedAt"]);
  assert.equal(isHabitStore(store([habit({ kind: "check" })], { h1: { [THU]: check } })), true);

  // Finite values are untouched.
  const done = entryForValue(measured, 30);
  assert.equal(done.status, "done");
  assert.equal(done.value, 30);
  assert.equal(isHabitStore(store([measured], { q: { [THU]: done } })), true);
});

test("updateHabit ignores a patch that would produce a habit the guard rejects", () => {
  const base = addHabit(emptyHabitStore(), habit({ kind: "check" }));
  const invalid = [
    { archived: "yes" },
    { days: [] },
    { days: [1, 1] },
    { days: [0, 7] },
    { days: "daily" },
    { name: "" },
    { name: 7 },
    { kind: "timer" },
    { target: "25" },
    { unit: 5 },
    { link: "sleep" },
    { template: "nope" },
    { createdAt: 12345 },
  ];
  for (const patch of invalid) {
    const next = updateHabit(base, "h1", patch);
    assert.equal(next, base, `${JSON.stringify(patch)} must be a no-op`);
    assert.equal(isHabitStore(next), true, "and must never leave a store the guard rejects");
  }
  // One bad field drops the whole patch rather than half-applying it.
  assert.equal(updateHabit(base, "h1", { name: "Renamed", archived: "yes" }), base);
  // id stays immutable, so a patch can never orphan a log bucket.
  assert.equal(updateHabit(base, "h1", { id: "h2" }).habits[0].id, "h1");

  // The legitimate patches still land, still validate, and still don't mutate.
  const measured = addHabit(emptyHabitStore(), habit({ id: "q", kind: "quantity", unit: "min", target: 25 }));
  const renamed = updateHabit(measured, "q", { name: "Renamed", days: [1, 2, 3, 4, 5] });
  assert.equal(renamed.habits[0].name, "Renamed");
  assert.deepEqual(renamed.habits[0].days, [1, 2, 3, 4, 5]);
  assert.equal(renamed.habits[0].id, "q");
  assert.equal(updateHabit(renamed, "q", { target: 50 }).habits[0].target, 50);
  assert.equal(updateHabit(renamed, "q", { unit: "pages" }).habits[0].unit, "pages");
  assert.equal(updateHabit(renamed, "q", { kind: "check" }).habits[0].kind, "check");
  assert.equal(archiveHabit(renamed, "q").habits[0].archived, true);
  assert.equal(restoreHabit(archiveHabit(renamed, "q"), "q").habits[0].archived, false);
  assert.equal(isHabitStore(renamed), true);
  assert.equal(measured.habits[0].name, "Deep focus block", "input store must not be mutated");
  assert.equal(updateHabit(renamed, "missing", { name: "x" }), renamed, "unknown id is still a no-op");
});

test("addHabit ignores a habit the guard rejects and hands back the identical store", () => {
  // The store one of these would build is exactly what the next page load
  // answers with an empty one, so the write has to refuse it here. `days: []`
  // type-checks as HabitDay[] and is reachable by creating a habit with no day
  // picked, so the check is not theoretical.
  assert.equal(isHabitStore(store([habit({ days: [] })])), false);
  assert.equal(isHabitStore(store([habit({ days: [1, 1] })])), false);

  const base = addHabit(emptyHabitStore(), habit());
  const invalid = [
    habit({ id: "bad", days: [] }),
    habit({ id: "bad", days: [1, 1] }),
    habit({ id: "bad", days: [0, 7] }),
    habit({ id: "bad", days: "daily" }),
    habit({ id: "bad", name: "" }),
    habit({ id: "bad", name: 7 }),
    habit({ id: "bad", kind: "timer" }),
    habit({ id: "bad", archived: "yes" }),
    habit({ id: "bad", target: "25" }),
    habit({ id: "bad", link: "sleep" }),
    habit({ id: "", name: "No id" }),
  ];
  for (const bad of invalid) {
    const next = addHabit(base, bad);
    assert.equal(next, base, `${JSON.stringify(bad)} must be a no-op`);
    assert.equal(next.habits.length, 1, "and must not append or replace");
    assert.ok(isHabitStore(next), "and must never leave a store the guard rejects");
  }
  assert.equal(base.habits[0].id, "h1", "input store must not be mutated");

  // A valid habit still appends, and re-adding a known id still replaces.
  const appended = addHabit(base, habit({ id: "h2", name: "Second" }));
  assert.deepEqual(appended.habits.map((h) => h.id), ["h1", "h2"]);
  assert.ok(isHabitStore(appended));
  const replaced = addHabit(appended, habit({ id: "h2", name: "Second renamed" }));
  assert.equal(replaced.habits.length, 2);
  assert.equal(replaced.habits[1].name, "Second renamed");
  assert.equal(appended.habits[1].name, "Second", "input store must not be mutated");
});

test("setDayLog ignores a log the guard rejects and hands back the identical store", () => {
  // `value: NaN` is a number and a bad `status` is any string, so both type-check
  // as HabitDayLog while building a store the next page load throws away.
  assert.equal(
    isHabitStore(store([habit()], { h1: { [THU]: { status: "partial", value: NaN, updatedAt: "" } } })),
    false,
  );
  assert.equal(isHabitStore(store([habit()], { h1: { [THU]: { status: "maybe", updatedAt: "" } } })), false);

  const base = setDayLog(
    addHabit(emptyHabitStore(), habit({ kind: "quantity", unit: "min", target: 25 })),
    "h1",
    WED,
    at("done", 25),
  );
  const invalid = [
    { status: "partial", value: NaN, updatedAt: "2026-09-24T09:00:00.000Z" },
    { status: "partial", value: Infinity, updatedAt: "2026-09-24T09:00:00.000Z" },
    { status: "partial", value: "10", updatedAt: "2026-09-24T09:00:00.000Z" },
    { status: "maybe", updatedAt: "2026-09-24T09:00:00.000Z" },
    { status: "done", updatedAt: 12345 },
    { updatedAt: "2026-09-24T09:00:00.000Z" },
    "done",
  ];
  for (const bad of invalid) {
    const next = setDayLog(base, "h1", THU, bad);
    assert.equal(next, base, `${JSON.stringify(bad)} must be a no-op`);
    assert.equal(Object.hasOwn(next.log.h1, THU), false, "and must not write");
    assert.ok(isHabitStore(next), "and must never leave a store the guard rejects");
  }
  assert.equal(base.log.h1[WED].value, 25, "input store must not be mutated");

  // Valid entries still write and replace, and null still deletes — the delete
  // path is a different one and a delete cannot break the guard.
  const written = setDayLog(base, "h1", THU, at("partial", 10));
  assert.equal(written.log.h1[THU].status, "partial");
  assert.equal(written.log.h1[THU].value, 10);
  assert.equal(setDayLog(written, "h1", THU, at("done", 25)).log.h1[THU].value, 25);
  const cleared = setDayLog(written, "h1", THU, null);
  assert.equal(Object.hasOwn(cleared.log.h1, THU), false);
  assert.deepEqual(cleared.log.h1, { [WED]: at("done", 25) });
  assert.equal(setDayLog(base, "h1", FRI, null), base, "removing an absent entry is still a no-op");
  assert.ok(isHabitStore(cleared));
});

// --- streaks --------------------------------------------------------------

test("consecutive done days grow the streak; a pending today does not break it", () => {
  let next = store([habit()]);
  next = setDayLog(next, "h1", MON, at("done"));
  next = setDayLog(next, "h1", TUE, at("done"));
  next = setDayLog(next, "h1", WED, at("done"));

  assert.equal(bestStreak(next, "h1", THU, 400), 3);
  assert.equal(currentStreak(next, "h1", THU), 3, "today is still in play");

  next = setDayLog(next, "h1", THU, at("done"));
  assert.equal(currentStreak(next, "h1", THU), 4);
  assert.equal(bestStreak(next, "h1", THU, 400), 4);
});

test("a skipped day is neutral: no extend, no break", () => {
  let next = store([habit()]);
  next = setDayLog(next, "h1", MON, at("done"));
  next = setDayLog(next, "h1", TUE, at("skipped"));
  next = setDayLog(next, "h1", WED, at("done"));

  assert.equal(currentStreak(next, "h1", THU), 2);
  assert.equal(bestStreak(next, "h1", THU, 400), 2);
});

test("a past scheduled day with no entry breaks the streak", () => {
  let next = store([habit()]);
  next = setDayLog(next, "h1", MON, at("done"));
  next = setDayLog(next, "h1", WED, at("done"));

  assert.equal(currentStreak(next, "h1", THU), 1);
  assert.equal(bestStreak(next, "h1", THU, 400), 1);
});

test("off days never break a weekday-only habit", () => {
  const weekday = habit({ id: "wd", name: "One protocol", days: [1, 2, 3, 4, 5] });
  let next = store([weekday]);
  next = setDayLog(next, "wd", FRI, at("done"));
  next = setDayLog(next, "wd", NEXT_MON, at("done")); // Sat + Sun are off days

  assert.equal(currentStreak(next, "wd", NEXT_MON), 2);
  assert.equal(bestStreak(next, "wd", NEXT_MON, 400), 2);

  const pending = store([weekday]);
  const withFriday = setDayLog(pending, "wd", FRI, at("done"));
  assert.equal(currentStreak(withFriday, "wd", NEXT_MON), 1);
  assert.equal(currentStreak(pending, "wd", NEXT_MON), 0);
  assert.equal(currentStreak(pending, "missing", NEXT_MON), 0);
});

test("quantity: partial counts, target is done, and zero clears the entry", () => {
  const measured = habit({ id: "q", kind: "quantity", unit: "min", target: 25 });
  let next = store([measured]);
  next = setDayLog(next, "q", WED, at("partial", 10));

  assert.equal(currentStreak(next, "q", THU), 1, "a partial day is a real day");
  assert.equal(bestStreak(next, "q", THU, 400), 1);

  assert.equal(entryForValue(measured, 25).status, "done");
  assert.equal(entryForValue(measured, 40).status, "done");
  assert.equal(entryForValue(measured, 40).value, 40);
  const partial = entryForValue(measured, 10);
  assert.equal(partial.status, "partial");
  assert.equal(partial.value, 10);
  assert.match(partial.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const check = entryForValue(habit({ kind: "check" }), 5);
  assert.equal(check.status, "done");
  assert.equal(check.value, undefined);

  // An empty / zero value must leave no entry behind at all.
  const cleared = setDayLog(next, "q", WED, null);
  assert.equal(cleared.log.q, undefined);
  assert.equal(currentStreak(cleared, "q", THU), 0);
});

test("the best-streak scan is capped and never extrapolates", () => {
  const log = {};
  for (let back = 0; back < 410; back += 1) log[dayKey(THU, -back)] = at("done");
  const long = store([habit()], { h1: log });

  assert.equal(bestStreak(long, "h1", THU), 400, "400-day cap is reported as-is");
  assert.equal(bestStreak(long, "h1", THU, 12), 12);
  assert.equal(currentStreak(long, "h1", THU), 400);
  assert.equal(bestStreak(long, "h1", THU, 0), 1, "a cap of 0 is clamped up to today only");
  assert.equal(bestStreak(long, "h1", dayKey(THU, 500)), 0, "no history before the run");
});

test("todayRoutine totals the active habits scheduled today", () => {
  const daily = habit({ id: "daily", name: "Pillar floors", kind: "check" });
  const weekday = habit({ id: "weekday", name: "One protocol", days: [1, 2, 3, 4, 5] });
  const monSat = habit({ id: "monSat", name: "Quiz or review", days: [1, 2, 3, 4, 5, 6] });
  const archived = habit({ id: "archived", name: "Old habit", archived: true });

  let next = store([daily, weekday, monSat, archived]);
  const empty = todayRoutine(next, THU);
  assert.equal(empty.total, 3, "archived habits are excluded");
  assert.equal(empty.completed, 0);
  assert.deepEqual(empty.items.map((item) => item.habit.id), ["daily", "weekday", "monSat"]);
  assert.equal(empty.items[0].entry, undefined);

  next = setDayLog(next, "daily", THU, at("partial", 10));
  next = setDayLog(next, "weekday", THU, at("skipped"));
  const mixed = todayRoutine(next, THU);
  assert.equal(mixed.total, 3);
  assert.equal(mixed.completed, 1, "partial counts as done, skipped does not");
  assert.equal(mixed.items[0].entry.status, "partial");
  assert.equal(mixed.items[1].entry.status, "skipped");
  assert.equal(mixed.items[2].entry, undefined);

  next = setDayLog(next, "monSat", THU, at("done"));
  assert.equal(todayRoutine(next, THU).completed, 2);

  assert.equal(todayRoutine(next, SAT).total, 2, "the Mon-Fri habit is off on Saturday");
  assert.equal(todayRoutine(next, SUN).total, 1, "only the daily habit runs on Sunday");
});

test("weekView is a Monday-start week with per-cell state and x/y footers", () => {
  const daily = habit({ id: "daily", name: "Pillar floors", kind: "check" });
  const weekday = habit({ id: "weekday", name: "One protocol", days: [1, 2, 3, 4, 5] });
  const monSat = habit({ id: "monSat", name: "Quiz or review", days: [1, 2, 3, 4, 5, 6] });
  const archived = habit({ id: "archived", name: "Old habit", archived: true });

  let next = store([daily, weekday, monSat, archived]);
  next = setDayLog(next, "daily", MON, at("done"));
  next = setDayLog(next, "daily", TUE, at("partial", 10));
  next = setDayLog(next, "daily", WED, at("skipped"));
  next = setDayLog(next, "weekday", MON, at("done"));
  next = setDayLog(next, "weekday", TUE, at("done"));
  next = setDayLog(next, "monSat", MON, at("done"));
  next = setDayLog(next, "monSat", SAT, at("done"));
  next = setDayLog(next, "archived", MON, at("done"));

  const week = weekView(next, THU);
  assert.equal(week.startKey, MON);
  assert.deepEqual(week.days, [MON, TUE, WED, THU, FRI, SAT, SUN]);
  assert.deepEqual(week.rows.map((row) => row.habit.id), ["daily", "weekday", "monSat"], "archived rows are hidden");
  assert.deepEqual(week.rows[0].cells, ["done", "partial", "skipped", "none", "none", "none", "none"]);
  assert.deepEqual(week.rows[1].cells, ["done", "done", "none", "none", "none", "off", "off"]);
  assert.deepEqual(week.rows[2].cells, ["done", "none", "none", "none", "none", "done", "off"]);
  assert.deepEqual(week.footers, [
    { completed: 3, scheduled: 3 },
    { completed: 2, scheduled: 3 },
    { completed: 0, scheduled: 3 },
    { completed: 0, scheduled: 3 },
    { completed: 0, scheduled: 3 },
    { completed: 1, scheduled: 2 },
    { completed: 0, scheduled: 1 },
  ]);

  // Sunday is the start of the next Monday-start week.
  const nextWeek = weekView(next, SUN);
  assert.equal(nextWeek.startKey, MON);
  assert.deepEqual(weekView(next, NEXT_MON).startKey, NEXT_MON);
});

test("storage helpers are SSR-safe no-ops without a window", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(HABITS_STORAGE_KEY, "levelup-habits-v1");
  assert.deepEqual(loadHabitStore(), emptyHabitStore());
  assert.doesNotThrow(() => saveHabitStore(addHabit(emptyHabitStore(), habit())));
  assert.equal(weekdayOf("2026-01-01"), 4); // Thursday, still local maths
});
