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
  const start = new Date(now.getFullYear(), 0, 1);
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
      ? practiceLabel(tier, chosen.name, n)
      : type === "focus"
        ? `Focus sprint — ${minutes} minutes of deep work`
        : chosen
          ? reviewLabel(tier, chosen.name)
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