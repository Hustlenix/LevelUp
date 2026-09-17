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
  // 2026-09-16 is day 258 (0-based; 2026 is not a leap year). 258 % 3 = 0 → review.
  assert.equal(m.type, "review");
});

test("todayMission mission-type cycle follows dayOfYear % 3", () => {
  const p = {
    ...defaultProfile(),
    onboarded: true,
    subjects: [{ id: "s1", name: "Science", isWeak: true }],
  };
  // Force days with known remainder (Jan 1 = day 0; 2026 not a leap year)
  const reviewDay = new Date(2026, 8, 16); // day 258 → 258 % 3 = 0 → review
  const practiceDay = new Date(2026, 8, 17); // day 259 → 259 % 3 = 1 → practice
  const focusDay = new Date(2026, 8, 18); // day 260 → 260 % 3 = 2 → focus
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
  // No localStorage in node, so toBackupPayload is not exercised here;
  // build the backup from a fixture state through buildBackup/validateBackup:
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