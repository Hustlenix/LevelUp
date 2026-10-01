// Habit engine — pure domain core (no React, no clocks, no storage reads).
//
// Everything a habit IS (schedule, streak, week rollup) is derived from the day
// log; nothing derived is stored. Day keys are "YYYY-MM-DD" strings taken from
// the user's LOCAL calendar (lib/dates.ts), the same way they were written, so
// key generation and key lookup always agree near midnight and across timezones.
//
// Every store-returning function never mutates its input; anything that actually
// changes the store returns a NEW store. A genuine no-op (seeding an already
// seeded store, patching an unknown id, patching a habit into a shape isHabit
// rejects, deleting an absent log entry) hands back the input unchanged, so
// identity checks stay meaningful for renderers.
//
// No write path may produce a store its own guard would reject. A single
// malformed value anywhere costs the user every habit and streak, because
// loadHabitStore answers untrusted JSON with an empty store rather than a
// partial repair. So the day log is read and written with own-key discipline
// (Object.hasOwn / defineProperty, see daysFor) and every write re-checks what
// it is about to emit.

import { formatLocalDate } from "./dates.ts";

export const HABITS_STORAGE_KEY = "levelup-habits-v1" as const;

/** Longest history a streak scan will walk. A longer run is reported as-is. */
export const STREAK_SCAN_CAP_DAYS = 400 as const;

export type HabitId = string;

export type HabitKind = "check" | "quantity";

export type HabitStatus = "done" | "partial" | "skipped";

/** One cell of the weekly review: `off` = weekday not scheduled, `none` = missed. */
export type HabitWeekCell = "done" | "partial" | "skipped" | "none" | "off";

export type HabitTemplateId = "focus" | "pillars" | "protocol" | "quiz-review" | "reflect";

/** Which existing log a habit is a shortcut for (smart prompts, never auto-writes). */
export type HabitLink = "focus" | "pillars" | "protocol" | "quiz";

export interface Habit {
  id: HabitId;
  name: string;
  kind: HabitKind;
  unit?: string; // "min" | "pages" | "reps" | ... — required when kind is quantity
  target?: number; // required when kind is quantity
  days: number[]; // 0 = Sunday .. 6 = Saturday, non-empty, no duplicates
  template?: HabitTemplateId; // provenance, set when created from the starter set
  link?: HabitLink;
  archived: boolean; // soft delete; archived habits are hidden, not lost
  createdAt: string; // ISO
}

export interface HabitDayLog {
  status: HabitStatus;
  value?: number; // recorded amount for quantity habits
  updatedAt: string; // ISO
}

export interface HabitStore {
  version: 1;
  habits: Habit[];
  log: Record<HabitId, Record<string, HabitDayLog>>; // habitId -> "YYYY-MM-DD" -> entry
}

const DAILY_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAY_DAYS = [1, 2, 3, 4, 5];
const MON_SAT_DAYS = [1, 2, 3, 4, 5, 6];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWeekdays(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const seen = new Set<number>();
  for (const day of value) {
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) return false;
    if (seen.has(day)) return false;
    seen.add(day);
  }
  return true;
}

function isHabitKind(value: unknown): value is HabitKind {
  return value === "check" || value === "quantity";
}

function isHabitStatus(value: unknown): value is HabitStatus {
  return value === "done" || value === "partial" || value === "skipped";
}

function isHabitTemplateId(value: unknown): value is HabitTemplateId {
  return value === "focus" || value === "pillars" || value === "protocol" || value === "quiz-review" || value === "reflect";
}

function isHabitLink(value: unknown): value is HabitLink {
  return value === "focus" || value === "pillars" || value === "protocol" || value === "quiz";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isHabit(value: unknown): value is Habit {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (typeof value.name !== "string" || value.name.length === 0) return false;
  if (!isHabitKind(value.kind)) return false;
  if (!isWeekdays(value.days)) return false;
  if (typeof value.archived !== "boolean") return false;
  if (typeof value.createdAt !== "string") return false;
  if (value.unit !== undefined && typeof value.unit !== "string") return false;
  if (!isOptionalNumber(value.target)) return false;
  if (value.template !== undefined && !isHabitTemplateId(value.template)) return false;
  if (value.link !== undefined && !isHabitLink(value.link)) return false;
  return true;
}

function isHabitDayLog(value: unknown): value is HabitDayLog {
  if (!isRecord(value)) return false;
  if (!isHabitStatus(value.status)) return false;
  if (!isOptionalNumber(value.value)) return false;
  return typeof value.updatedAt === "string";
}

/**
 * Guard for anything arriving from JSON (localStorage, backup restore).
 * Anything that fails here is treated as "no habits yet" — never partially
 * repaired, because a half-trusted log would invent streak history.
 */
export function isHabitStore(json: unknown): json is HabitStore {
  if (!isRecord(json)) return false;
  if (json.version !== 1) return false;
  if (!Array.isArray(json.habits)) return false;
  for (const habit of json.habits) {
    if (!isHabit(habit)) return false;
  }
  if (!isRecord(json.log)) return false;
  // Object.values reads OWN enumerable keys only, so a bucket whose id collides
  // with an inherited name — a real own "__proto__" key restored from a backup —
  // is validated like any other instead of being skipped or read off the
  // prototype, and an inherited bucket is never trusted.
  for (const days of Object.values(json.log)) {
    if (!isRecord(days)) return false;
    for (const entry of Object.values(days)) {
      if (!isHabitDayLog(entry)) return false;
    }
  }
  return true;
}

export function emptyHabitStore(): HabitStore {
  return { version: 1, habits: [], log: {} };
}

/** Weekday of a "YYYY-MM-DD" key in the local calendar (0 = Sunday). */
export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Shift a "YYYY-MM-DD" key by whole days, using local calendar components. */
function shiftDayKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return formatLocalDate(new Date(y, m - 1, d + deltaDays));
}

function findHabit(store: HabitStore, habitId: HabitId): Habit | undefined {
  return store.habits.find((habit) => habit.id === habitId);
}

/**
 * Own-key write. Assignment runs the `__proto__` setter, so `bucket["__proto__"]
 * = entry` replaces the prototype and the entry never appears in Object.keys —
 * a habit that looks unloggable and cannot be fixed from inside the UI.
 * defineProperty creates the key itself and keeps it enumerable, so it survives
 * spread and JSON.stringify like any other key.
 */
function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Own-key read of one habit's day bucket. A bare `store.log[id]` resolves an id
 * like "toString" or "__proto__" against Object.prototype, so a habit with no
 * log at all would read a function back as data — and one bad read here would
 * count as a logged day. `isRecord` also rejects a function value outright, so a
 * hijacked prototype cannot pose as a bucket either.
 *
 * Ids that COLLIDE with an inherited name are therefore supported, not
 * rejected: a restored backup can hold a real own "__proto__" key (JSON.parse
 * creates one), the write path uses defineProperty, and such a habit
 * round-trips through JSON and validates like any other. Banning them at the
 * guard would discard the entire store — the data loss this module exists to
 * prevent.
 */
function daysFor(log: Record<HabitId, Record<string, HabitDayLog>>, habitId: HabitId): Record<string, HabitDayLog> {
  const bucket: unknown = Object.hasOwn(log, habitId) ? log[habitId] : undefined;
  return isRecord(bucket) ? (bucket as Record<string, HabitDayLog>) : {};
}

function entryFor(store: HabitStore, habitId: HabitId, dateKey: string): HabitDayLog | undefined {
  const days = daysFor(store.log, habitId);
  return Object.hasOwn(days, dateKey) ? days[dateKey] : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * The five one-tap starters. Fresh objects every call, and `id`/`createdAt`
 * left blank: the caller stamps them, so seeding stays a pure function of the
 * store plus the id it was given.
 */
export function starterTemplates(): Habit[] {
  return [
    {
      id: "",
      name: "Deep focus block",
      kind: "quantity",
      unit: "min",
      target: 25,
      days: [...DAILY_DAYS],
      template: "focus",
      link: "focus",
      archived: false,
      createdAt: "",
    },
    {
      id: "",
      name: "Pillar floors",
      kind: "check",
      days: [...DAILY_DAYS],
      template: "pillars",
      link: "pillars",
      archived: false,
      createdAt: "",
    },
    {
      id: "",
      name: "One protocol",
      kind: "check",
      days: [...MON_SAT_DAYS],
      template: "protocol",
      link: "protocol",
      archived: false,
      createdAt: "",
    },
    {
      id: "",
      name: "Quiz or review",
      kind: "check",
      days: [...WEEKDAY_DAYS],
      template: "quiz-review",
      link: "quiz",
      archived: false,
      createdAt: "",
    },
    {
      id: "",
      name: "Highlight + reflection",
      kind: "check",
      days: [...DAILY_DAYS],
      template: "reflect",
      archived: false,
      createdAt: "",
    },
  ];
}

/**
 * Seed the starter set, but only into a store with zero habits — so a second
 * call, or a user who built their own habit first, is never overwritten.
 */
export function seedStarterStore(store: HabitStore, mkId: () => string): HabitStore {
  if (store.habits.length > 0) return store;
  const createdAt = nowIso();
  const habits = starterTemplates().map((habit) => ({ ...habit, id: mkId(), createdAt }));
  return { ...store, habits };
}

/**
 * Append a habit, or replace the one already holding that id.
 *
 * The habit is re-validated with isHabit before it is emitted, for the same
 * reason a patch is: the type is only a compile-time promise, and a habit the
 * guard rejects (`days: []` from a form that saved no day, a repeated day) would
 * build a store loadHabitStore discards on the next visit. An invalid habit is a
 * no-op that hands back the input store, the same as an invalid patch.
 */
export function addHabit(store: HabitStore, habit: Habit): HabitStore {
  if (!isHabit(habit)) return store;
  const index = store.habits.findIndex((existing) => existing.id === habit.id);
  if (index === -1) return { ...store, habits: [...store.habits, habit] };
  const habits = [...store.habits];
  habits[index] = habit;
  return { ...store, habits };
}

/**
 * Patch one habit. `id` is immutable — a patch carrying one is ignored, since
 * re-keying a habit would orphan its whole log bucket.
 *
 * The patch is re-validated with isHabit before it is returned: the type is only
 * a compile-time promise, and an unvalidated patch (`{archived: "yes"}`,
 * `{days: []}`) would build a store that loadHabitStore discards on the next
 * visit. An invalid patch is a no-op that hands back the input store, the same
 * as patching an unknown id.
 */
export function updateHabit(store: HabitStore, id: HabitId, patch: Partial<Omit<Habit, "id">>): HabitStore {
  const current = findHabit(store, id);
  if (!current) return store;
  const patched: Habit = { ...current, ...patch, id: current.id };
  if (!isHabit(patched)) return store;
  return { ...store, habits: store.habits.map((habit) => (habit.id === id ? patched : habit)) };
}

export function archiveHabit(store: HabitStore, id: HabitId): HabitStore {
  return updateHabit(store, id, { archived: true });
}

export function restoreHabit(store: HabitStore, id: HabitId): HabitStore {
  return updateHabit(store, id, { archived: false });
}

/** Delete forever — the habit and its whole log bucket go with it. */
export function removeHabit(store: HabitStore, id: HabitId): HabitStore {
  // `id in store.log` walks the prototype chain, so "toString" and friends would
  // look like existing buckets and turn a genuine no-op into a fresh store —
  // breaking the identity check renderers use to decide whether to re-render.
  if (!findHabit(store, id) && !Object.hasOwn(store.log, id)) return store;
  const log = { ...store.log };
  if (Object.hasOwn(log, id)) delete log[id];
  return { ...store, habits: store.habits.filter((habit) => habit.id !== id), log };
}

/** Is this habit scheduled on that local day? Off days never break a streak. */
export function isScheduledOn(habit: Habit, dateKey: string): boolean {
  return habit.days.includes(weekdayOf(dateKey));
}

/**
 * Day entry for a measured value: at or above target is done, below target is
 * a partial. Check habits are done by definition and carry no value.
 *
 * A non-finite value is REFUSED (thrown) rather than stored or coerced: the
 * guard rejects a non-finite `value`, so writing one would produce a store that
 * loadHabitStore throws away on the next visit, costing every habit and streak.
 * Substituting 0 is not an alternative — 0 is indistinguishable from a real zero
 * day. Check habits are refused the same way, so the guard is one rule for every
 * kind rather than one that quietly depends on `kind`.
 *
 * Callers must DELETE the entry for an empty or zero value rather than passing
 * 0 here — a zero-value partial would wrongly count as a partial day.
 */
export function entryForValue(habit: Habit, value: number): HabitDayLog {
  if (!Number.isFinite(value)) {
    throw new RangeError(`habit ${habit.id}: a logged value must be a finite number`);
  }
  if (habit.kind === "check") return { status: "done", updatedAt: nowIso() };
  return { status: value >= (habit.target ?? 0) ? "done" : "partial", value, updatedAt: nowIso() };
}

/**
 * Write (or with `null`, remove) one day's entry for one habit.
 *
 * A non-null entry is re-validated with isHabitDayLog before it is written, for
 * the same reason a patch is: `NaN` is a number and `"done"` is not a `HabitStatus`,
 * so a log can type-check and still be one the guard rejects — which would build
 * a store loadHabitStore discards on the next visit. An invalid entry is a no-op
 * that hands back the input store. `null` deletes, and a delete cannot break the
 * guard.
 */
export function setDayLog(store: HabitStore, habitId: HabitId, dateKey: string, log: HabitDayLog | null): HabitStore {
  if (log !== null && !isHabitDayLog(log)) return store;
  const days = { ...daysFor(store.log, habitId) };
  if (log === null) {
    if (!Object.hasOwn(days, dateKey)) return store;
    delete days[dateKey];
  } else {
    defineOwn(days, dateKey, log);
  }
  const nextLog = { ...store.log };
  if (Object.keys(days).length === 0) {
    if (Object.hasOwn(nextLog, habitId)) delete nextLog[habitId];
  } else {
    defineOwn(nextLog, habitId, days);
  }
  return { ...store, log: nextLog };
}

type StreakStep = "advance" | "neutral" | "break";

/** Off days and skipped days are neutral; a missed scheduled day breaks. */
function streakStep(habit: Habit, store: HabitStore, dateKey: string): StreakStep {
  if (!isScheduledOn(habit, dateKey)) return "neutral";
  const entry = entryFor(store, habit.id, dateKey);
  if (!entry) return "break";
  return entry.status === "skipped" ? "neutral" : "advance";
}

/**
 * Live streak. Today is still in play: pending or skipped today never takes the
 * streak away before midnight, so the walk starts the day before today.
 */
export function currentStreak(store: HabitStore, habitId: HabitId, todayKey: string): number {
  const habit = findHabit(store, habitId);
  if (!habit) return 0;
  let streak = streakStep(habit, store, todayKey) === "advance" ? 1 : 0;
  for (let offset = 1; offset < STREAK_SCAN_CAP_DAYS; offset += 1) {
    const step = streakStep(habit, store, shiftDayKey(todayKey, -offset));
    if (step === "break") break;
    if (step === "advance") streak += 1;
  }
  return streak;
}

/**
 * Longest run in the scanned history. The scan is capped at `capDays` and a run
 * that reaches the cap is reported as-is — never extrapolated past what was read.
 */
export function bestStreak(store: HabitStore, habitId: HabitId, todayKey: string, capDays: number = 400): number {
  const habit = findHabit(store, habitId);
  if (!habit) return 0;
  const limit = Math.max(1, Math.floor(capDays));
  let run = 0;
  let best = 0;
  for (let offset = 0; offset < limit; offset += 1) {
    const dateKey = shiftDayKey(todayKey, -offset);
    if (!isScheduledOn(habit, dateKey)) continue;
    const entry = entryFor(store, habitId, dateKey);
    if (entry && entry.status !== "skipped") {
      run += 1;
      if (run > best) best = run;
    } else if (!entry && offset > 0) {
      run = 0;
    }
    // Skipped days and a pending today are neutral: no extend, no break.
  }
  return best;
}

export interface TodayRoutineItem {
  habit: Habit;
  entry?: HabitDayLog;
}

export interface TodayRoutine {
  total: number;
  completed: number;
  items: TodayRoutineItem[];
}

/** Active habits scheduled today, with whatever was logged today ("n / m done"). */
export function todayRoutine(store: HabitStore, todayKey: string): TodayRoutine {
  const items: TodayRoutineItem[] = [];
  for (const habit of store.habits) {
    if (habit.archived || !isScheduledOn(habit, todayKey)) continue;
    items.push({ habit, entry: entryFor(store, habit.id, todayKey) });
  }
  const completed = items.filter((item) => item.entry?.status === "done" || item.entry?.status === "partial").length;
  return { total: items.length, completed, items };
}

/**
 * The logged entry for each of `dateKeys`, one per key, in the caller's order —
 * the same keys `historyCells` renders, returned as data instead of as state.
 *
 * This is the only reader of a day's log for the week table, and it answers a
 * question a cell cannot: what was actually recorded. `historyCells` reports
 * "partly done", which is true but says nothing about 5 of 8; the week table
 * needs the number behind it.
 *
 * Deliberately schedule-blind. A day the habit was not due returns `undefined`
 * when nothing was logged and the entry itself when something was, so a caller
 * can tell a real gap from a day that was never due. Callers gate on the cell
 * first — that is where the schedule is applied.
 */
export function historyEntries(
  store: HabitStore,
  habitId: HabitId,
  dateKeys: string[],
): (HabitDayLog | undefined)[] {
  // Hoisted so the own-key guard runs once per call, not once per day. `daysFor`
  // is the single place a habit's bucket is resolved, so an id colliding with an
  // inherited name can never come back as prototype data.
  const days = daysFor(store.log, habitId);
  return dateKeys.map((dateKey) => (Object.hasOwn(days, dateKey) ? days[dateKey] : undefined));
}

/**
 * Per-day state for an arbitrary list of day keys — the one place the
 * schedule/log/miss rule lives.
 *
 * `weekView` and the rolling mini-history want the same three outcomes in a
 * different order: "off" when the weekday is not scheduled, otherwise whatever
 * was logged, otherwise "none". Sharing this keeps a weekday-only habit from
 * showing a false miss in one grid and an honest gap in the other.
 *
 * The keys are the caller's, in the caller's order, and may be any length — the
 * rolling history is today plus the previous six days, which is not the
 * Monday-start week `weekView` builds. An unknown habit id has no schedule and
 * no log, so every key reads "none".
 */
export function historyCells(store: HabitStore, habitId: HabitId, dateKeys: string[]): HabitWeekCell[] {
  const habit = findHabit(store, habitId);
  if (!habit) return dateKeys.map(() => "none");
  const entries = historyEntries(store, habitId, dateKeys);
  return dateKeys.map((dateKey, index) => {
    if (!isScheduledOn(habit, dateKey)) return "off";
    return entries[index]?.status ?? "none";
  });
}

export interface HabitWeekRow {
  habit: Habit;
  cells: HabitWeekCell[];
}

export interface HabitWeekFooter {
  completed: number;
  scheduled: number;
}

export interface HabitWeekView {
  startKey: string; // Monday of the rendered week
  days: string[]; // 7 local day keys, Monday first
  rows: HabitWeekRow[];
  footers: HabitWeekFooter[]; // per weekday, across active habits
}

/** Monday-start calendar week containing `todayKey`, one row per active habit. */
export function weekView(store: HabitStore, todayKey: string): HabitWeekView {
  const startKey = shiftDayKey(todayKey, -((weekdayOf(todayKey) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => shiftDayKey(startKey, index));
  const rows: HabitWeekRow[] = [];
  const footers: HabitWeekFooter[] = days.map(() => ({ completed: 0, scheduled: 0 }));

  for (const habit of store.habits) {
    if (habit.archived) continue;
    const cells = historyCells(store, habit.id, days);
    rows.push({ habit, cells });
    days.forEach((_dateKey, index) => {
      const cell = cells[index];
      if (cell === "off") return;
      footers[index].scheduled += 1;
      if (cell === "done" || cell === "partial") footers[index].completed += 1;
    });
  }
  return { startKey, days, rows, footers };
}

/** Any habits at all, archived or not — drives the empty state. */
export function hasHabits(store: HabitStore): boolean {
  return store.habits.length > 0;
}

/** Missing, unparseable or untrusted content falls back to an empty store. */
export function loadHabitStore(): HabitStore {
  if (typeof window === "undefined") return emptyHabitStore();
  try {
    const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return emptyHabitStore();
    const parsed: unknown = JSON.parse(raw);
    return isHabitStore(parsed) ? parsed : emptyHabitStore();
  } catch {
    return emptyHabitStore();
  }
}

export function saveHabitStore(store: HabitStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private browsing / quota — the in-memory store stays authoritative */
  }
}
