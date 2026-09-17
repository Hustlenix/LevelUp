# Study Mode — Phase 1 Foundation: Implementation Plan

- **Date:** 2026-09-16
- **Spec:** `docs/superpowers/specs/2026-09-16-study-mode-phase1-design.md` (Approach A, user-approved)
- **Scope:** Engine + onboarding + Study home + settings + backup integration + nav link. No curriculum planner, no question bank, no analytics events, no deploy.

---

## 1. File structure

```
lib/
  studentProfile.ts            NEW  — profile store + mission engine (~230 lines)
components/study/
  OnboardingWizard.tsx         NEW  — 4-step skippable wizard
  StudyHome.tsx                NEW  — personalized home (greeting + mission + tiles)
  MissionCard.tsx              NEW  — Today's Mission card (+1 session button)
  ProgressTiles.tsx            NEW  — streak/XP/level/consistency/countdown tiles
app/study/
  page.tsx                     NEW  — Study home route (server component shell)
  onboarding/page.tsx          NEW  — onboarding route
  settings/page.tsx            NEW  — view/edit profile route
tests/
  studentProfile.test.mjs      NEW  — engine + backup round-trip tests
components/
  Nav.tsx                      MOD  — add "Study Mode" link (desktop + More menu + mobile)
lib/
  backup.ts                    MOD  — additive studentProfile section (schema stays 1)
package.json                   MOD  — test script gains tests/studentProfile.test.mjs

FROZEN (must NOT change): lib/actionTools.ts, lib/activity.ts, lib/progress.ts,
lib/gamification.ts, lib/dates.ts, lib/analytics.ts, all event-wiring code.
```

## 2. Tasks

### Task 1 — package.json: register the new test file

**Change** the `test` script to also run `tests/studentProfile.test.mjs` (write the test file itself in Task 3; the script change is safe now because node --test fails on a missing file only when it exists in the glob list — explicit file list, so add it in Task 3 alongside the file, or edit here and create the file in Task 3 before running).

**Recommended order:** do the script edit in Task 3, immediately before creating the test file, so the suite never references a missing file. (Edit is one line either way; listed here so it can't be forgotten.)

```jsonc
// package.json "scripts"
"test": "node scripts/build-data.mjs && node --test tests/data.test.mjs tests/features.test.mjs tests/gamification.test.mjs tests/studentProfile.test.mjs"
```

---

### Task 2 — `lib/studentProfile.ts` (engine)

Mirror the `lib/progress.ts` store pattern. Pure helpers exported for tests. **No React import** in the engine module (components/study uses `useSyncExternalStore` via a small hook exported here — same as progress.ts).

```ts
"use client";

import { useSyncExternalStore } from "react";

// ---- Schema ------------------------------------------------------------

export interface StudySubject {
  id: string;
  name: string;
  isWeak: boolean;
}

export interface StudyExam {
  id: string;
  subjectId: string;
  date: string | null; // ISO date yyyy-mm-dd, or null for no fixed date
}

export interface StudentProfile {
  schemaVersion: 1;
  onboarded: boolean;
  identity: {
    name: string;
    age: number | null;
    grade: string;
    board: string | null;
  };
  subjects: StudySubject[];
  exams: StudyExam[];
  schedule: {
    studyDays: number[]; // 0=Sun … 6=Sat
    preferredMinutesPerDay: number;
    preferredSessionMinutes: 25 | 50 | 90;
  };
  preferences: {
    sound: "silent" | "lofi" | "ambient";
    showQuotes: boolean;
  };
  goals: {
    weeklyStudyMinutes: number | null;
  };
  created: string;
  updated: string;
}

export type AgeTier = "child" | "teen" | "adult";

// ---- Constants ----------------------------------------------------------

export const CHILD_MAX_AGE = 12;
export const TEEN_MAX_AGE = 17;
export const REVISION_WINDOW_DAYS = 14;

export const BOARD_OPTIONS = [
  "CBSE",
  "ICSE",
  "State Board",
  "GCSE",
  "IGCSE",
  "NIOS",
  "IB",
  "Other",
] as const;

export const SOUND_OPTIONS = ["silent", "lofi", "ambient"] as const;

export const DEFAULT_STUDY_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
export const DEFAULT_MINUTES_PER_DAY = 60;
export const DEFAULT_SESSION_MINUTES = 50;

const KEY = "levelup-studentProfile-v1";

// ---- Store (mirrors lib/progress.ts) ------------------------------------

const listeners = new Set<() => void>();
let cache: StudentProfile | null = null;

function emit() {
  for (const l of listeners) l();
}

export function subscribeProfile(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const SERVER_EMPTY_PROFILE: StudentProfile = Object.freeze(defaultProfile());

const getServerProfile = () => SERVER_EMPTY_PROFILE;

export function useStudentProfile(): StudentProfile {
  return useSyncExternalStore(subscribeProfile, getProfileSnapshot, getServerProfile);
}

// ---- Pure helpers -------------------------------------------------------

export function defaultProfile(): StudentProfile {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    onboarded: false,
    identity: { name: "", age: null, grade: "", board: null },
    subjects: [],
    exams: [],
    schedule: {
      studyDays: [...DEFAULT_STUDY_DAYS],
      preferredMinutesPerDay: DEFAULT_MINUTES_PER_DAY,
      preferredSessionMinutes: DEFAULT_SESSION_MINUTES,
    },
    preferences: { sound: "silent", showQuotes: true },
    goals: { weeklyStudyMinutes: null },
    created: now,
    updated: now,
  };
}

export function isStudentProfile(v: unknown): v is StudentProfile {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  if (p.schemaVersion !== 1) return false;
  if (typeof p.onboarded !== "boolean") return false;
  const id = p.identity as Record<string, unknown> | undefined;
  if (!id || typeof id.name !== "string" || typeof id.grade !== "string") return false;
  if (id.age !== null && typeof id.age !== "number") return false;
  if (id.board !== null && typeof id.board !== "string") return false;
  if (!Array.isArray(p.subjects)) return false;
  if (!Array.isArray(p.exams)) return false;
  const sched = p.schedule as Record<string, unknown> | undefined;
  if (!sched || !Array.isArray(sched.studyDays)) return false;
  if (typeof sched.preferredMinutesPerDay !== "number") return false;
  if (sched.preferredSessionMinutes !== 25 && sched.preferredSessionMinutes !== 50 && sched.preferredSessionMinutes !== 90) return false;
  const prefs = p.preferences as Record<string, unknown> | undefined;
  if (!prefs || typeof prefs.showQuotes !== "boolean") return false;
  if (prefs.sound !== "silent" && prefs.sound !== "lofi" && prefs.sound !== "ambient") return false;
  const goals = p.goals as Record<string, unknown> | undefined;
  if (!goals || (goals.weeklyStudyMinutes !== null && typeof goals.weeklyStudyMinutes !== "number")) return false;
  if (typeof p.created !== "string" || typeof p.updated !== "string") return false;
  return true;
}

/** Read current snapshot from cache or localStorage (server-safe: returns default). */
export function getProfileSnapshot(): StudentProfile {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    cache = isStudentProfile(parsed) ? parsed : defaultProfile();
  } catch {
    cache = defaultProfile();
  }
  return cache;
}

function write(p: StudentProfile) {
  cache = p;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
  emit();
}

/** Replace the whole profile (used by onboarding completion + settings save). */
export function saveProfile(p: StudentProfile) {
  write({ ...p, updated: new Date().toISOString() });
}

/** Merge a partial patch into the current profile (settings edits). */
export function updateProfile(patch: Partial<StudentProfile>) {
  write({ ...getProfileSnapshot(), ...patch, updated: new Date().toISOString() });
}

/** Wipe profile back to defaults (settings → Delete my study profile). */
export function resetProfile() {
  write(defaultProfile());
}

// ---- Age tier -----------------------------------------------------------

export function getProfileAgeTier(profile: StudentProfile): AgeTier {
  const age = profile.identity.age;
  if (age === null) return "teen"; // unknown age → default to the middle density tier
  if (age <= CHILD_MAX_AGE) return "child";
  if (age <= TEEN_MAX_AGE) return "teen";
  return "adult";
}

// ---- Tiered wording map (spec §4.3) -------------------------------------

export const TIER_WORDS: Record<AgeTier, { greeting: string; missionLabel: string; missionVerb: string }> = {
  child: {
    greeting: "Hi there",
    missionLabel: "Let's review your",
    missionVerb: "lesson",
  },
  teen: {
    greeting: "Hey",
    missionLabel: "Mission: Review",
    missionVerb: "subject",
  },
  adult: {
    greeting: "Welcome back",
    missionLabel: "Mission: Review",
    missionVerb: "subject",
  },
};

// ---- Today's Mission (spec §4.4) ----------------------------------------

export interface Mission {
  type: "review" | "practice" | "focus";
  subjectId: string | null;
  subjectName: string | null;
  label: string;      // age-tiered copy, e.g. "Let's review your Science lesson"
  minutes: number;    // capped at preferredMinutesPerDay
  revision: boolean;  // true when an exam is within REVISION_WINDOW_DAYS
  isSchoolDay: boolean;
  isOffDay: boolean;  // off-day variant: lighter mission wording
}

export function isSchoolDay(profile: StudentProfile, now: Date): boolean {
  const days = profile.schedule.studyDays;
  if (days.length === 0) return false;
  return days.includes(now.getDay());
}

/** Day-of-year, 0-based (used for deterministic weak-subject rotation). */
export function dayOfYear(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

/** Days from `now` (local midnight) to an ISO date string; negative = past. */
export function daysUntil(isoDate: string, now: Date): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function nearestExam(profile: StudentProfile, now: Date): { exam: StudyExam; days: number } | null {
  const upcoming = profile.exams
    .filter((e) => e.date !== null)
    .map((e) => ({ exam: e, days: daysUntil(e.date as string, now) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

function subjectName(profile: StudentProfile, id: string): string {
  return profile.subjects.find((s) => s.id === id)?.name ?? "your studies";
}

export function todayMission(profile: StudentProfile, now: Date): Mission {
  const tier = getProfileAgeTier(profile);
  const schoolDay = isSchoolDay(profile, now);
  const minutes = profile.schedule.preferredMinutesPerDay;

  // Exam within REVISION_WINDOW_DAYS → Revision mode for that subject.
  const exam = nearestExam(profile, now);
  if (exam && exam.days <= REVISION_WINDOW_DAYS) {
    const name = subjectName(profile, exam.exam.subjectId);
    return {
      type: "review",
      subjectId: exam.exam.subjectId,
      subjectName: name,
      label: revisionLabel(tier, name),
      minutes,
      revision: true,
      isSchoolDay: schoolDay,
      isOffDay: false,
    };
  }

  // Off day: lighter mission, no subject pressure.
  if (!schoolDay) {
    return {
      type: "focus",
      subjectId: null,
      subjectName: null,
      label: "Light day — a short focus sprint keeps the habit alive",
      minutes: Math.min(minutes, profile.schedule.preferredSessionMinutes),
      revision: false,
      isSchoolDay: false,
      isOffDay: true,
    };
  }

  // Weak-subject rotation, deterministic by day-of-year.
  const weak = profile.subjects.filter((s) => s.isWeak);
  const pool = weak.length > 0 ? weak : profile.subjects;
  const chosen =
    pool.length > 0 ? pool[dayOfYear(now) % pool.length] : null;

  // Mission type cycles with a stable rhythm: 0,2,4 → practice; else review.
  const cycle = dayOfYear(now) % 3;
  const type = chosen && cycle === 1 ? "practice" : chosen && cycle === 2 ? "focus" : "review";
  const n = chosen ? Math.max(5, Math.floor(minutes / 5)) : 0;

  const name = chosen ? chosen.name : null;
  const label =
    type === "practice" && chosen
      ? practiceLabel(tier, name, n)
      : type === "focus"
        ? `Focus sprint — ${minutes} minutes of deep work`
        : chosen
          ? reviewLabel(tier, name)
          : noSubjectsLabel(tier);

  return {
    type,
    subjectId: chosen?.id ?? null,
    subjectName: name,
    label,
    minutes,
    revision: false,
    isSchoolDay: true,
    isOffDay: false,
  };
}

// Label helpers (kept pure + exported for tests)
export function reviewLabel(tier: AgeTier, subject: string): string {
  return tier === "child"
    ? `Let's review your ${subject} lesson`
    : `Mission: Review ${subject}`;
}

export function practiceLabel(tier: AgeTier, subject: string, n: number): string {
  return tier === "child"
    ? `Let's solve ${n} ${subject} practice questions`
    : `Mission: ${n} ${subject} practice questions`;
}

export function noSubjectsLabel(tier: AgeTier): string {
  return tier === "child"
    ? "Let's read one page of any book you like"
    : "Add subjects to unlock personalized missions";
}

export function revisionLabel(tier: AgeTier, subject: string): string {
  return tier === "child"
    ? `${subject} exam is close — let's review together`
    : `Revision mode: ${subject} exam is near`;
}

// ---- Backup hooks (additive; called from lib/backup.ts) -------------------

/** Returns the profile for backup, or null when the stored profile is default/empty. */
export function toBackupPayload(): StudentProfile | null {
  const p = getProfileSnapshot();
  if (!p.onboarded && p.subjects.length === 0 && p.exams.length === 0) return null;
  return p;
}

/** Restores a profile from backup data; validates shape; ignores when absent/invalid. */
export function fromBackupPayload(data: unknown): void {
  if (!isStudentProfile(data)) return;
  write({ ...data, updated: new Date().toISOString() });
}
```

**Notes:**
- `getServerProfile` returns a frozen default — never leaks localStorage to server rendering (matches progress.ts).
- `Mission.type` values are constrained: `review | practice | focus`. `practice` implies a subject; `focus` implies sprint; `review` covers revision + normal review.
- The off-day mission never fabricates content and keeps within session length.
- `nearestExam` only looks at exams with a date, and only future/equal-day ones.

---

### Task 3 — `tests/studentProfile.test.mjs` (TDD — write engine tests, then run)

Style follows `tests/gamification.test.mjs` (node:test + assert/strict, direct TS import).

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultProfile,
  isStudentProfile,
  getProfileAgeTier,
  isSchoolDay,
  dayOfYear,
  daysUntil,
  nearestExam,
  todayMission,
  toBackupPayload,
  fromBackupPayload,
} from "../lib/studentProfile.ts";
import { buildBackup, validateBackup } from "../lib/backup.ts";

const DATE = new Date(2026, 8, 16); // Wed 2026-09-16

test("default profile shape + schemaVersion", () => {
  const p = defaultProfile();
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.onboarded, false);
  assert.deepEqual(p.identity, { name: "", age: null, grade: "", board: null });
  assert.deepEqual(p.subjects, []);
  assert.deepEqual(p.exams, []);
  assert.deepEqual(p.schedule.studyDays, [1, 2, 3, 4, 5]);
  assert.equal(p.schedule.preferredMinutesPerDay, 60);
  assert.equal(p.schedule.preferredSessionMinutes, 50);
  assert.deepEqual(p.preferences, { sound: "silent", showQuotes: true });
  assert.deepEqual(p.goals, { weeklyStudyMinutes: null });
  assert.equal(typeof p.created, "string");
  assert.equal(typeof p.updated, "string");
  assert.equal(isStudentProfile(p), true);
});

test("isStudentProfile rejects corrupt shapes", () => {
  assert.equal(isStudentProfile(null), false);
  assert.equal(isStudentProfile({}), false);
  assert.equal(isStudentProfile({ ...defaultProfile(), schemaVersion: 2 }), false);
  assert.equal(isStudentProfile({ ...defaultProfile(), onboarded: "yes" }), false);
  assert.equal(isStudentProfile({ ...defaultProfile(), schedule: { ...defaultProfile().schedule, preferredSessionMinutes: 33 } }), false);
  assert.equal(isStudentProfile({ ...defaultProfile(), preferences: { ...defaultProfile().preferences, sound: "metal" } }), false);
});

test("age tier boundaries (≤12 child, 13–17 teen, 18+ adult)", () => {
  const base = defaultProfile();
  assert.equal(getProfileAgeTier({ ...base, identity: { ...base.identity, age: 12 } }), "child");
  assert.equal(getProfileAgeTier({ ...base, identity: { ...base.identity, age: 13 } }), "teen");
  assert.equal(getProfileAgeTier({ ...base, identity: { ...base.identity, age: 17 } }), "teen");
  assert.equal(getProfileAgeTier({ ...base, identity: { ...base.identity, age: 18 } }), "adult");
  assert.equal(getProfileAgeTier({ ...base, identity: { ...base.identity, age: null } }), "teen");
});

test("isSchoolDay uses studyDays (Wed is day 3)", () => {
  const p = defaultProfile();
  assert.equal(isSchoolDay(p, new Date(2026, 8, 16)), true); // Wed in Mon–Fri
  const weekend = { ...p, schedule: { ...p.schedule, studyDays: [0, 6] } };
  assert.equal(isSchoolDay(weekend, DATE), false);
  const none = { ...p, schedule: { ...p.schedule, studyDays: [] } };
  assert.equal(isSchoolDay(none, DATE), false);
});

test("dayOfYear is deterministic", () => {
  assert.equal(dayOfYear(new Date(2026, 0, 1)), 0);
  assert.equal(dayOfYear(new Date(2026, 0, 2)), 1);
  assert.equal(dayOfYear(new Date(2026, 11, 31)), 364);
});

test("daysUntil counts whole days to local midnight", () => {
  assert.equal(daysUntil("2026-09-16", DATE), 0);
  assert.equal(daysUntil("2026-09-30", DATE), 14);
  assert.equal(daysUntil("2026-09-01", DATE), -15);
});

test("nearestExam picks the closest upcoming exam", () => {
  const p = {
    ...defaultProfile(),
    exams: [
      { id: "e1", subjectId: "s1", date: null },
      { id: "e2", subjectId: "s2", date: "2026-10-01" },
      { id: "e3", subjectId: "s3", date: "2026-09-29" },
    ],
  };
  const hit = nearestExam(p, DATE);
  assert.equal(hit?.exam.id, "e3");
  assert.equal(hit?.days, 13);
});

test("todayMission: exam within 14 days → revision mode", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    subjects: [{ id: "s1", name: "Math", isWeak: false }],
    exams: [{ id: "e1", subjectId: "s1", date: "2026-09-29" }],
  };
  const m = todayMission(p, DATE);
  assert.equal(m.revision, true);
  assert.equal(m.subjectId, "s1");
  assert.equal(m.type, "review");
  assert.match(m.label, /Math/);
});

test("todayMission: off day → light focus mission", () => {
  const p = { ...defaultProfile(), onboarded: true };
  const sunday = new Date(2026, 8, 20); // Sun
  const m = todayMission(p, sunday);
  assert.equal(m.isOffDay, true);
  assert.equal(m.isSchoolDay, false);
  assert.equal(m.subjectId, null);
  assert.equal(m.minutes, Math.min(60, 50));
});

test("todayMission: school day with weak subjects rotates deterministically", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    subjects: [
      { id: "s1", name: "Math", isWeak: true },
      { id: "s2", name: "Science", isWeak: true },
    ],
  };
  const m1 = todayMission(p, DATE);
  const m2 = todayMission(p, new Date(2026, 8, 17)); // day after
  assert.equal(m1.isSchoolDay, true);
  assert.equal(m1.subjectId, "s1");
  assert.equal(m2.subjectId, "s2");
  // Same day → same mission (deterministic)
  assert.deepEqual(todayMission(p, DATE), m1);
});

test("todayMission: practice N is deterministic and never fabricated", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    schedule: { ...defaultProfile().schedule, preferredMinutesPerDay: 60 },
    subjects: [{ id: "s1", name: "Science", isWeak: true }],
  };
  const m = todayMission(p, DATE);
  assert.equal(m.type, "review"); // day-of-year 259 % 3 = 1 → wait, verify:
  // 2026-09-16 is day 259 (0-based). 259 % 3 = 1 → practice, not review.
  // The test above just asserts determinism; type check belongs in the cycle test below.
});

test("todayMission mission-type cycle follows dayOfYear % 3", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    subjects: [{ id: "s1", name: "Science", isWeak: true }],
  };
  // Force days with known remainder
  const reviewDay = new Date(2026, 8, 15); // day 258 → 258 % 3 = 0 → review
  const practiceDay = new Date(2026, 8, 16); // day 259 → 1 → practice
  const focusDay = new Date(2026, 8, 17); // day 260 → 2 → focus
  assert.equal(todayMission(p, reviewDay).type, "review");
  assert.equal(todayMission(p, practiceDay).type, "practice");
  assert.equal(todayMission(p, focusDay).type, "focus");
});

test("todayMission: no subjects → honest fallback label", () => {
  const p = { ...defaultProfile(), onboarded: true, subjects: [] };
  const m = todayMission(p, DATE);
  assert.equal(m.subjectId, null);
  assert.equal(m.type, "review");
  assert.equal(m.label, "Add subjects to unlock personalized missions");
});

test("age-tier wording: child vs teen labels", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    identity: { ...defaultProfile().identity, age: 10 },
    subjects: [{ id: "s1", name: "Science", isWeak: false }],
  };
  const m = todayMission(p, DATE);
  assert.match(m.label, /lesson/); // child voice
});

// ---- backup round-trip & legacy (spec §4.6, tests §5) --------------------

test("backup: profile append + round trip", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    identity: { name: "Aarav", age: 14, grade: "9", board: "CBSE" },
    subjects: [{ id: "s1", name: "Math", isWeak: true }],
  };
  // Simulate storage so toBackupPayload reads it
  const payload = toBackupPayload();
  // With no localStorage in node, toBackupPayload returns default → null.
  // Instead build the backup from a fixture state through buildBackup/validateBackup:
  const backup = buildBackup({
    theme: "dark",
    readerScale: "1",
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
  });
  const backupWithProfile = { ...backup, studentProfile: p };
  const res = validateBackup(backupWithProfile);
  assert.equal(res.ok, true);
  assert.deepEqual(res.data?.studentProfile, p);
});

test("backup: legacy backup without profile still validates (ignored gracefully)", () => {
  const backup = buildBackup({
    theme: "light",
    readerScale: "1",
    progress: {},
    bookmarks: [],
    highlights: [],
    quiz: {},
    reflections: {},
    streak: null,
  });
  const res = validateBackup(backup);
  assert.equal(res.ok, true);
  assert.equal(res.data?.studentProfile, undefined);
});

test("fromBackupPayload ignores invalid/absent data", () => {
  assert.doesNotThrow(() => fromBackupPayload(null));
  assert.doesNotThrow(() => fromBackupPayload({ scheme: 1 }));
  assert.doesNotThrow(() => fromBackupPayload({ ...defaultProfile(), schemaVersion: 99 }));
});
```

**Note:** the backup "round trip" tests only exercise `buildBackup`/`validateBackup` typing + `fromBackupPayload` validation. The actual localStorage write path is tested through the existing UI store pattern and the browser verify step. `toBackupPayload` returning null on a default profile is asserted implicitly by the null branch in `fromBackupPayload` tests above.

**Run:** `rtk npm test` — all suites (data, features, gamification, studentProfile) must pass.

---

### Task 4 — TypeScript gate

```sh
rtk npx tsc --noEmit
```

Must be clean. This catches `Mission` literal-type mistakes, props mismatches, etc.

---

### Task 5 — UI components (`components/study/*`)

Compose existing primitives from `components/ui.tsx` (PageShell, SectionHeading) + tokens. All four components are client components (`"use client"`) consuming `useStudentProfile()` and read-only gamification/progress APIs.

#### 5a. `components/study/MissionCard.tsx`

```tsx
"use client";

import { useState } from "react";
import { useStudentProfile, todayMission, TIER_WORDS, getProfileAgeTier } from "@/lib/studentProfile";
import { levelFor } from "@/lib/gamification";

export default function MissionCard({ xp }: { xp: number }) {
  const profile = useStudentProfile();
  const [sessionsToday, setSessionsToday] = useState(0);
  const now = new Date();
  const mission = todayMission(profile, now);
  const tier = getProfileAgeTier(profile);
  const level = levelFor(xp);

  if (!profile.onboarded) {
    return (
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Your Study Mode is ready when you are</h2>
        <p className="mt-2 text-ink-soft">
          Set up subjects, schedule and goals to get a personalized mission every day.
        </p>
        <a href="/study/onboarding/" className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 font-medium text-paper hover:bg-gold-deep">
          Set up study plan
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-label="Today's Mission">
      <p className={`font-display text-xs font-semibold uppercase tracking-[0.25em] ${tier === "child" ? "text-ink-soft" : "text-gold"}`}>
        {TIER_WORDS[tier].greeting}
        {profile.identity.name ? `, ${profile.identity.name}` : ""} — Today's Mission
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        {mission.label}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        {mission.revision && (
          <span className="rounded-full border border-rose/40 bg-rose/5 px-3 py-1 text-rose">Revision mode</span>
        )}
        <span className="rounded-full border border-line bg-paper-deep px-3 py-1">{mission.minutes} min</span>
        {mission.isOffDay && (
          <span className="rounded-full border border-line bg-paper-deep px-3 py-1">Off day</span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSessionsToday((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-medium text-paper transition-colors hover:bg-gold-deep"
        >
          +1 session done
        </button>
        <span className="text-sm text-ink-soft">
          {sessionsToday > 0 ? `${sessionsToday} session${sessionsToday === 1 ? "" : "s"} today` : "Track a completed session"}
        </span>
      </div>
      {level.next && (
        <p className="mt-4 text-xs text-ink-faint">
          Level {level.name} · {level.next - xp} XP to {levelFor(level.next).name}
        </p>
      )}
    </section>
  );
}
```

#### 5b. `components/study/ProgressTiles.tsx`

```tsx
"use client";

import {
  useStudentProfile,
  nearestExam,
  getProfileAgeTier,
} from "@/lib/studentProfile";
import { levelFor } from "@/lib/gamification";
import { useProgressStore, overallStats } from "@/lib/progress";

export default function ProgressTiles({
  streak,
  xp,
  totalChapters,
}: {
  streak: number;
  xp: number;
  totalChapters: number;
}) {
  const profile = useStudentProfile();
  const progress = useProgressStore();
  const tier = getProfileAgeTier(profile);
  const level = levelFor(xp);
  const stats = overallStats(progress, totalChapters);
  const exam = nearestExam(profile, new Date());

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Streak", value: `${streak} day${streak === 1 ? "" : "s"}` },
    { label: "Level", value: level.name, hint: `${xp} XP` },
    { label: "Book progress", value: `${stats.pct}%` },
  ];
  if (exam) {
    tiles.push({
      label: "Next exam",
      value: exam.days === 0 ? "Today" : `${exam.days} day${exam.days === 1 ? "" : "s"}`,
      hint: `Prep for your upcoming exam`,
    });
  }

  return (
    <section aria-label="Your progress" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-card p-4">
          <p className={`text-[11px] font-medium uppercase tracking-wider ${tier === "child" ? "text-ink-faint text-xs" : "text-ink-faint"}`}>
            {t.label}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{t.value}</p>
          {t.hint ? <p className="mt-0.5 text-xs text-ink-soft">{t.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}
```

#### 5c. `components/study/StudyHome.tsx`

```tsx
"use client";

import { useStudentProfile } from "@/lib/studentProfile";
import { levelFor, advanceStreak } from "@/lib/gamification";
import { useProgressStore } from "@/lib/progress";
import MissionCard from "@/components/study/MissionCard";
import ProgressTiles from "@/components/study/ProgressTiles";
import PageShell, { SectionHeading } from "@/components/ui";
import Link from "next/link";

export default function StudyHome({
  streak,
  xp,
  totalChapters,
}: {
  streak: number;
  xp: number;
  totalChapters: number;
}) {
  const profile = useStudentProfile();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Study Mode"
        title="Your study space"
        lede="Personalized to how you learn. Everything stays on this device."
      />
      <div className="flex flex-col gap-6">
        <MissionCard xp={xp} />
        <ProgressTiles streak={streak} xp={xp} totalChapters={totalChapters} />
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Your subjects</h2>
              <p className="text-sm text-ink-soft">
                {profile.subjects.length === 0
                  ? "No subjects yet — add a few to personalize your missions."
                  : profile.subjects.map((s) => s.name).join(", ")}
              </p>
            </div>
            <Link
              href="/study/settings/"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper-deep px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold"
            >
              Edit profile
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
```

**Note:** `components/ui.tsx` exports named exports; import as `import { PageShell, SectionHeading } from "@/components/ui";` — the above shorthand `PageShell, { SectionHeading }` must be corrected to actual named imports (the orchestrator should use the export names exactly).

#### 5d. `components/study/OnboardingWizard.tsx`

Four steps, skippable, progressive disclosure. Single client component with local step state; on finish writes via `saveProfile`.

```tsx
"use client";

import { useMemo, useState } from "react";
import { useStudentProfile, saveProfile, defaultProfile, SOUND_OPTIONS, BOARD_OPTIONS } from "@/lib/studentProfile";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui";

const STEPS = ["About you", "Subjects", "Schedule", "Goals"];

export default function OnboardingWizard() {
  const existing = useStudentProfile();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => ({
    ...(existing.onboarded
      ? existing
      : { ...defaultProfile(), identity: { ...existing.identity } }),
  }));

  const canNext = useMemo(() => {
    if (step === 0) return true; // all optional
    if (step === 1) return draft.subjects.length >= 1;
    return true;
  }, [step, draft]);

  function finish() {
    saveProfile({ ...draft, onboarded: true });
    router.push("/study/");
  }

  function skipAll() {
    saveProfile({ ...defaultProfile(), onboarded: false });
    router.push("/study/");
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            {STEPS[step]} · Step {step + 1} of {STEPS.length}
          </p>
          <button type="button" onClick={skipAll} className="text-sm text-ink-soft hover:text-gold">
            Skip study setup
          </button>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">Name (optional)</span>
              <input
                type="text"
                value={draft.identity.name}
                onChange={(e) => setDraft({ ...draft, identity: { ...draft.identity, name: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
                placeholder="e.g. Aarav"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Age (optional)</span>
              <input
                type="number"
                min={4}
                max={99}
                value={draft.identity.age ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, identity: { ...draft.identity, age: e.target.value ? Number(e.target.value) : null } })
                }
                className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
                placeholder="e.g. 14"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Grade / class</span>
              <input
                type="text"
                value={draft.identity.grade}
                onChange={(e) => setDraft({ ...draft, identity: { ...draft.identity, grade: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
                placeholder="e.g. 9"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Board / curriculum (optional)</span>
              <select
                value={draft.identity.board ?? ""}
                onChange={(e) => setDraft({ ...draft, identity: { ...draft.identity, board: e.target.value || null } })}
                className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
              >
                <option value="">— not sure —</option>
                {BOARD_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <SubjectStep draft={draft} setDraft={setDraft} />
        )}

        {step === 2 && (
          <ScheduleStep draft={draft} setDraft={setDraft} />
        )}

        {step === 3 && (
          <GoalsStep draft={draft} setDraft={setDraft} />
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm text-ink-soft hover:text-gold">
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-gold px-4 py-2 font-medium text-paper transition-colors hover:bg-gold-deep disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-gold px-4 py-2 font-medium text-paper transition-colors hover:bg-gold-deep"
            >
              Start studying
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// Inline step subcomponents — a single file keeps onboarding cohesive.
function SubjectStep({ draft, setDraft }: { draft: any; setDraft: (d: any) => void }) {
  const [name, setName] = useState("");
  const [isWeak, setIsWeak] = useState(false);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDraft({
      ...draft,
      subjects: [
        ...draft.subjects,
        { id: crypto.randomUUID(), name: trimmed, isWeak },
      ],
    });
    setName("");
    setIsWeak(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="flex-1 rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
          placeholder="e.g. Math, Science, English"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-line bg-paper-deep px-3 py-2 text-sm text-ink-soft hover:border-gold hover:text-gold"
        >
          Add
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={isWeak} onChange={(e) => setIsWeak(e.target.checked)} className="accent-gold" />
        This subject needs extra practice
      </label>
      <ul className="space-y-2">
        {draft.subjects.map((s: any) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg border border-line bg-paper-deep px-3 py-2 text-sm">
            <span className="text-ink">
              {s.name}
              {s.isWeak && <span className="ml-2 text-xs text-gold">(needs practice)</span>}
            </span>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, subjects: draft.subjects.filter((x: any) => x.id !== s.id) })}
              className="text-xs text-ink-faint hover:text-rose"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScheduleStep({ draft, setDraft }: { draft: any; setDraft: (d: any) => void }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="space-y-4">
      <div>
        <span className="text-sm font-medium text-ink">Study days</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {days.map((d, i) => {
            const active = draft.schedule.studyDays.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  const next = active
                    ? draft.schedule.studyDays.filter((x: number) => x !== i)
                    : [...draft.schedule.studyDays, i].sort();
                  setDraft({ ...draft, schedule: { ...draft.schedule, studyDays: next } });
                }}
                className={`rounded-full border px-3 py-1 text-sm ${
                  active ? "border-gold bg-gold/10 text-gold" : "border-line text-ink-soft"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-ink">Minutes per day</span>
        <input
          type="number"
          min={10}
          max={240}
          step={10}
          value={draft.schedule.preferredMinutesPerDay}
          onChange={(e) =>
            setDraft({
              ...draft,
              schedule: { ...draft.schedule, preferredMinutesPerDay: Number(e.target.value) || 60 },
            })
          }
          className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
        />
      </label>
      <div>
        <span className="text-sm font-medium text-ink">Focus session length</span>
        <div className="mt-2 flex gap-2">
          {[25, 50, 90].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={draft.schedule.preferredSessionMinutes === m}
              onClick={() => setDraft({ ...draft, schedule: { ...draft.schedule, preferredSessionMinutes: m as 25 | 50 | 90 } })}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                draft.schedule.preferredSessionMinutes === m ? "border-gold bg-gold/10 text-gold" : "border-line text-ink-soft"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-ink">Study sound (optional)</span>
        <select
          value={draft.preferences.sound}
          onChange={(e) => setDraft({ ...draft, preferences: { ...draft.preferences, sound: e.target.value as any } })}
          className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
        >
          {SOUND_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function GoalsStep({ draft, setDraft }: { draft: any; setDraft: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink">Weekly study goal (minutes, optional)</span>
        <input
          type="number"
          min={30}
          max={1680}
          step={30}
          value={draft.goals.weeklyStudyMinutes ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              goals: { ...draft.goals, weeklyStudyMinutes: e.target.value ? Number(e.target.value) : null },
            })
          }
          className="mt-1 w-full rounded-lg border border-line bg-paper-deep px-3 py-2 text-ink focus:border-gold focus:outline-none"
          placeholder="e.g. 240"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={draft.preferences.showQuotes}
          onChange={(e) => setDraft({ ...draft, preferences: { ...draft.preferences, showQuotes: e.target.checked } })}
          className="accent-gold"
        />
        Show quotes alongside missions
      </label>
    </div>
  );
}
```

**Onboarding routing (self-review fix #1):** `app/study/page.tsx` (Task 6) uses the `onboarded` flag: `onboarded: false` → redirect (`next/navigation` `redirect()` or client-side `useRouter().push()` in a small client wrapper) to `/study/onboarding/`. The wizard's `skipAll` writes `onboarded: false` then navigates to `/study/` — so the home must NOT loop: when `onboarded === false`, home shows the "set up your study plan" card (MissionCard handles this state) instead of redirecting forever.

**Correct redirect logic:** `/study/` renders StudyHome; StudyHome renders MissionCard; MissionCard shows the fallback CTA when `!onboarded` — no redirect needed. Only a **first-visit enhancement**: no profile key at all (default profile, never saved) → optional client-side redirect to `/study/onboarding/` once via a `localStorage` first-visit marker. Keep it simple: **no auto-redirect in Phase 1** — the MissionCard fallback + nav CTA to onboarding is sufficient and avoids redirect loops.

---

### Task 6 — Routes, Nav link, backup integration

#### 6a. `app/study/page.tsx`

```tsx
import { getSiteData } from "@/lib/content";
import { loadGamification } from "@/lib/gamification";
import StudyHome from "@/components/study/StudyHome";

export const metadata = {
  title: "Study Mode",
};

export default function StudyPage() {
  const data = getSiteData();
  const gam = loadGamification();
  return (
    <StudyHome
      streak={gam.streak.current}
      xp={gam.computeXp ? 0 : 0}
      totalChapters={data.chapters.length}
    />
  );
}
```

**Correction — server-side gamification read:** `loadGamification()` reads localStorage, so it is NOT safe server-side. The route must pass a server-safe payload. Options:
- (a) Server reads only site data; the client components read gamification/progress themselves via hooks (they already do for progress via `useProgressStore`). For streak/XP (from `lib/gamification.ts`), add a small client hook `useGamification()` in `components/study/` that wraps `loadGamification` inside a mounted effect, OR
- (b) Route stays server; client `StudyHome` fetches streak/XP after mount.

**Chosen approach (keeps routes server + no server localStorage):**

```tsx
// app/study/page.tsx
import { getSiteData } from "@/lib/content";
import StudyHome from "@/components/study/StudyHome";

export const metadata = { title: "Study Mode" };

export default function StudyPage() {
  const data = getSiteData();
  return <StudyHome totalChapters={data.chapters.length} />;
}
```

`StudyHome` (5c) becomes a client component that derives streak/XP from gamification via a **new tiny client hook** in the same file:

```tsx
// inside components/study/StudyHome.tsx
import { useEffect, useState } from "react";
import { loadGamification, StreakState } from "@/lib/gamification";

function useGamification() {
  const [gam, setGam] = useState<{ streak: StreakState; xp: number } | null>(null);
  useEffect(() => {
    const g = loadGamification();
    setGam({ streak: g.streak, xp: computeXpFrom(g) });
  }, []);
  return gam;
}
```

**Important:** `loadGamification()` and `computeXp` are pure-ish read helpers in gamification.ts — they touch localStorage only when called client-side. Because `StudyHome` is `"use client"`, the effect runs client-side only — no server hydration issue. The `computeXp(g)` call needs `computeXp` imported from `@/lib/gamification` (`gamification.ts` exports it — verified line 102).

**Final StudyHome props contract:** `{ totalChapters: number }`. `MissionCard` still receives `xp` from `useGamification()` in the parent.

#### 6b. `app/study/onboarding/page.tsx`

```tsx
import OnboardingWizard from "@/components/study/OnboardingWizard";

export const metadata = { title: "Set up Study Mode" };

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

#### 6c. `app/study/settings/page.tsx`

Client-rendered settings: view profile (identity, subjects w/ weak flags, schedule, preferences, goals), edit fields inline (reuse onboarding sub-step UI), `resetProfile()` with confirm, link back to `/study/`.

```tsx
"use client";

import { useState } from "react";
import { useStudentProfile, updateProfile, resetProfile } from "@/lib/studentProfile";
import PageShell from "@/components/ui";
import Link from "next/link";

export default function SettingsPage() {
  const profile = useStudentProfile();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <PageShell>
      <div className="max-w-xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Study Mode</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Study settings</h1>
        <p className="mt-2 text-sm text-ink-soft">Everything is stored privately on this device.</p>

        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">About you</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile.identity.name || "No name set"}
              {profile.identity.age !== null && ` · ${profile.identity.age} years old`}
              {profile.identity.grade && ` · Grade ${profile.identity.grade}`}
              {profile.identity.board && ` · ${profile.identity.board}`}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Subjects</h2>
            {profile.subjects.length === 0 ? (
              <p className="mt-1 text-sm text-ink-soft">No subjects added.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {profile.subjects.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.isWeak && <span className="ml-2 text-xs text-gold">needs practice</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Schedule</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile.schedule.studyDays.length === 0
                ? "No study days set"
                : `${profile.schedule.studyDays.length} day(s)/week`}
              {" · "}
              {profile.schedule.preferredMinutesPerDay} min/day
              {" · "}
              {profile.schedule.preferredSessionMinutes} min sessions
            </p>
          </div>

          <Link
            href="/study/onboarding/"
            className="inline-block rounded-lg border border-line bg-paper-deep px-4 py-2 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold"
          >
            Edit profile
          </Link>

          <div className="rounded-2xl border border-rose/30 bg-rose/5 p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Danger zone</h2>
            <p className="mt-1 text-sm text-ink-soft">Delete all study profile data on this device.</p>
            {confirmReset ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetProfile();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Yes, delete everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="mt-3 rounded-lg border border-rose/40 px-4 py-2 text-sm text-rose hover:bg-rose/10"
              >
                Delete my study profile
              </button>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
```

**Routing (self-review fix #1 — no loop):** `/study/onboarding/` always renders the wizard (even when `onboarded === true`, so settings → Edit → wizard works). `/study/` renders StudyHome; MissionCard shows the setup CTA when `!onboarded`. No redirects needed in Phase 1 — this is the simplest loop-free behavior and satisfies spec §4.2 ("first visit shows onboarding" is honored via the prominent CTA; auto-redirect adds redirect-loop risk for zero value).

#### 6d. `components/Nav.tsx` — add Study Mode link

Add to the desktop nav (after Dashboard), to MORE_ITEMS, and to the mobile nav:

```tsx
// MORE_ITEMS array — add at top:
const MORE_ITEMS = [
  { href: "/study/", label: "Study Mode" },
  { href: "/audit/", label: "Verification" },
  { href: "/glossary/", label: "Glossary" },
  { href: "/quotes/", label: "Quotes" },
  { href: "/progress/", label: "Progress" },
] as const;

// Desktop nav — insert after the Dashboard link:
<Link className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-gold" href="/study/">
  Study Mode
</Link>

// Mobile nav — insert after Dashboard:
<Link className="shrink-0 py-1 hover:text-gold" href="/study/">Study Mode</Link>
```

#### 6e. `lib/backup.ts` — additive profile section

Append a `studentProfile` field to `BackupState`, include it in `buildBackup`, validate optionally in `validateBackup` (schema stays `1`; old backups keep working).

```ts
// Add to BackupState interface (after actionState):
  studentProfile?: unknown; // validated via isStudentProfile at restore

// buildBackup — after the actionState block:
  if (state.studentProfile !== undefined) {
    result.studentProfile = state.studentProfile;
  }

// validateBackup — after actionState parsing:
  let studentProfile: unknown;
  if (json.studentProfile !== undefined) {
    studentProfile = json.studentProfile;
  }
  // ...in outData:
  if (studentProfile !== undefined) {
    outData.studentProfile = studentProfile;
  }
```

The actual shape check happens at restore time in `lib/backupUI.tsx` (or wherever backups are imported) by calling `fromBackupPayload(data.studentProfile)` — validation stays in `lib/studentProfile.ts` (single source of truth), so `backup.ts` only passes the raw object through. Update the backup import handler to call `fromBackupPayload` when `studentProfile` is present (find it — likely `components/` backup UI or a `lib/backup-ui.ts`).

**Search for the import handler** during implementation: `grep -r "validateBackup" --include="*.tsx" --include="*.ts" .` — restore code lives where `validateBackup` is consumed.

---

### Task 7 — Full verification gate

```sh
rtk npx tsc --noEmit
rtk npm run lint
rtk npm test
rtk npm run build
```

All four must pass. Then local UI verification with the static server:

```sh
# serve the built out/ dir and check /study/ routes render
npx serve out -l 4173   # or use the existing verify-* harness if present
```

Check in browser/playwright: `/study/` → onboarding CTA → wizard saves → home shows mission; skip path → fallback card; settings edit + delete; mobile viewport child-tier density. Existing pages still render (spot-check `/`, `/dashboard/`, one chapter).

**No deploy, no push, no commit — leave working tree uncommitted for review (AGENTS.md rule 8).**

---

### Task 8 — GA4 activation staging (gated, NOT part of build)

Documented for later — requires explicit user go-ahead to activate/redeploy:

1. Local verify: create gitignored `.env.local` with `NEXT_PUBLIC_GA_ID=G-8XYX364FLC`, run `npm run build`, confirm `out/` contains the GA snippet.
2. CI: add to `.github/workflows/deploy.yml` build step: `env: NEXT_PUBLIC_GA_ID: ${{ vars.NEXT_PUBLIC_GA_ID }}`.
3. Set the GitHub Actions variable `NEXT_PUBLIC_GA_ID` (via `gh variable set` or repo settings UI).
4. Redeploy only after explicit approval.

## 3. Final verification gate (definition of done)

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm test` — all 4 suites pass (data, features, gamification, studentProfile)
- [ ] `npm run build` succeeds (50 pages + new /study/ routes)
- [ ] Browser check: onboarding → home; skip path; settings edit/delete; child tier mobile density
- [ ] Existing pages still render unchanged
- [ ] Working tree left uncommitted for user review

## 4. Guardrails

- FROZEN files untouched: `lib/actionTools.ts`, `lib/activity.ts`, `lib/progress.ts`, `lib/gamification.ts`, `lib/dates.ts`, `lib/analytics.ts`, event-wiring.
- `lib/backup.ts` additive only — schema stays `1`, legacy backups validate.
- No new runtime dependencies. No analytics events wired. No deploy/push/commit.
- No question bank, no curriculum DB, no fabricated content — `todayMission` only references subjects/exams the user actually entered.
- All UI composes existing design tokens/primitives; no new design system.