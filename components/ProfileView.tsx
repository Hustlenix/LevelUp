"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOARD_OPTIONS,
  DEFAULT_MINUTES_PER_DAY,
  DEFAULT_STUDY_DAYS,
  SOUND_OPTIONS,
  defaultProfile,
  getProfileAgeTier,
  resetProfile,
  updateProfile,
  useStudentProfile,
  type StudentProfile,
} from "@/lib/studentProfile";
import {
  ActionButton,
  FormField,
  InlineNotice,
  SectionCard,
  StatusPill,
  TextInput,
  WorkspaceHeader,
} from "@/components/workspace";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIER_LABELS = { child: "Child", teen: "Teen", adult: "Adult" } as const;
const SOUND_LABELS = { silent: "Silent", lofi: "Lo-fi", ambient: "Ambient" } as const;
const SESSION_OPTIONS = [25, 50, 90] as const;
const SESSION_LABELS: Record<(typeof SESSION_OPTIONS)[number], string> = {
  25: "25 min",
  50: "50 min",
  90: "90 min",
};

const chipBase =
  "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const chipOn = `${chipBase} border-gold bg-gold/10 text-ink`;
const chipOff = `${chipBase} border-line bg-card text-ink-soft hover:border-gold hover:text-gold`;

function parseBounded(raw: string, min: number, max: number): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

type Draft = {
  name: string;
  age: string;
  grade: string;
  board: string;
  studyDays: number[];
  minutesPerDay: string;
  sessionMinutes: 25 | 50 | 90;
  sound: StudentProfile["preferences"]["sound"];
  showQuotes: boolean;
  weeklyMinutes: string;
};

function draftFrom(p: StudentProfile): Draft {
  return {
    name: p.identity.name,
    age: p.identity.age === null ? "" : String(p.identity.age),
    grade: p.identity.grade,
    board: p.identity.board ?? "",
    studyDays: [...p.schedule.studyDays],
    minutesPerDay: String(p.schedule.preferredMinutesPerDay),
    sessionMinutes: p.schedule.preferredSessionMinutes,
    sound: p.preferences.sound,
    showQuotes: p.preferences.showQuotes,
    weeklyMinutes: p.goals.weeklyStudyMinutes === null ? "" : String(p.goals.weeklyStudyMinutes),
  };
}

export default function ProfileView() {
  const profile = useStudentProfile();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [status, setStatus] = useState<"saved" | "reset" | null>(null);
  const statusTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const toggleDay = (d: number) =>
    set(
      "studyDays",
      draft.studyDays.includes(d)
        ? draft.studyDays.filter((x) => x !== d)
        : [...draft.studyDays, d].sort((a, b) => a - b),
    );

  const flash = (s: "saved" | "reset") => {
    setStatus(s);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), 2500);
  };

  const save = () => {
    updateProfile({
      identity: {
        name: draft.name.trim(),
        age: parseBounded(draft.age, 6, 99),
        grade: draft.grade.trim(),
        board: draft.board === "" ? null : draft.board,
      },
      schedule: {
        studyDays: draft.studyDays.length > 0 ? draft.studyDays : [...DEFAULT_STUDY_DAYS],
        preferredMinutesPerDay:
          parseBounded(draft.minutesPerDay, 10, 600) ?? DEFAULT_MINUTES_PER_DAY,
        preferredSessionMinutes: draft.sessionMinutes,
      },
      preferences: { sound: draft.sound, showQuotes: draft.showQuotes },
      goals: { weeklyStudyMinutes: parseBounded(draft.weeklyMinutes, 30, 3000) },
    });
    flash("saved");
  };

  const reset = () => {
    if (!window.confirm("This clears your study profile — name, subjects, schedule, and preferences. Your reading data and progress history are kept. Continue?")) return;
    resetProfile();
    setDraft(draftFrom(defaultProfile()));
    flash("reset");
  };

  const tier = getProfileAgeTier(profile);
  const hasSubjects = profile.subjects.length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6 lg:max-w-5xl lg:px-8">
      <WorkspaceHeader
        eyebrow="Profile"
        title="Your study profile"
        description="How LevelUp studies with you — who you are, when you study, and how you like it. Everything stays on this device."
        actions={<StatusPill tone="active">{TIER_LABELS[tier]} tier</StatusPill>}
      />

      <SectionCard className="mb-6">
        <h2 className="font-display text-lg font-semibold text-ink">At a glance</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {hasSubjects ? (
            profile.subjects.map((s) => (
              <StatusPill key={s.id} tone={s.isWeak ? "warning" : "neutral"}>
                {s.name}
              </StatusPill>
            ))
          ) : (
            <InlineNotice tone="info">
              No subjects yet — add them during onboarding to unlock personalized missions.
            </InlineNotice>
          )}
          <StatusPill tone="neutral">
            {profile.exams.length} {profile.exams.length === 1 ? "exam" : "exams"}
          </StatusPill>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
        <h2 className="font-display text-lg font-semibold text-ink">Who is studying</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Name" hint="Used for greetings and mission copy.">
            <TextInput
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Mira"
              autoComplete="name"
            />
          </FormField>
          <FormField label="Age (optional)">
            <TextInput
              type="number"
              min={6}
              max={99}
              value={draft.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="e.g. 11"
            />
          </FormField>
          <FormField label="Grade (optional)">
            <TextInput
              value={draft.grade}
              onChange={(e) => set("grade", e.target.value)}
              placeholder="e.g. 7"
            />
          </FormField>
          <FormField label="Board (optional)">
            <select
              value={draft.board}
              onChange={(e) => set("board", e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink transition-colors focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <option value="">Not sure yet</option>
              {BOARD_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
        <h2 className="font-display text-lg font-semibold text-ink">Study schedule</h2>
        <div className="mt-4 space-y-5">
          <div>
            <span className="text-xs font-semibold text-ink-soft">Study days</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => {
                const on = draft.studyDays.includes(i);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    className={on ? chipOn : chipOff}
                    onClick={() => toggleDay(i)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Minutes per study day" hint="LevelUp caps each day's mission at this.">
              <TextInput
                type="number"
                min={10}
                max={600}
                value={draft.minutesPerDay}
                onChange={(e) => set("minutesPerDay", e.target.value)}
              />
            </FormField>
            <div>
              <span className="text-xs font-semibold text-ink-soft">Session length</span>
              <div className="mt-2 flex gap-2">
                {SESSION_OPTIONS.map((m) => {
                  const on = draft.sessionMinutes === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      className={on ? chipOn : chipOff}
                      onClick={() => set("sessionMinutes", m)}
                    >
                      {SESSION_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
        <h2 className="font-display text-lg font-semibold text-ink">Preferences</h2>
        <div className="mt-4 space-y-5">
          <div>
            <span className="text-xs font-semibold text-ink-soft">Focus sound</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOUND_OPTIONS.map((s) => {
                const on = draft.sound === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    className={on ? chipOn : chipOff}
                    onClick={() => set("sound", s)}
                  >
                    {SOUND_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>
          <FormField label="Weekly study goal (optional)" hint="Leave blank for no weekly target. Used by the journey and badges.">
            <TextInput
              type="number"
              min={30}
              max={3000}
              value={draft.weeklyMinutes}
              onChange={(e) => set("weeklyMinutes", e.target.value)}
              placeholder="e.g. 300"
            />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.showQuotes}
              onChange={(e) => set("showQuotes", e.target.checked)}
              className="h-4 w-4 rounded border-line"
            />
            Show a quote on the Today page
          </label>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <ActionButton onClick={save}>Save changes</ActionButton>
        {status ? (
          <span role="status" className="text-sm text-ink-soft">
            {status === "saved" ? "Saved" : "Profile reset"}
          </span>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="ml-auto text-sm text-ink-faint underline-offset-2 transition-colors hover:text-rose-700 hover:underline"
        >
          Reset profile
        </button>
      </div>
    </div>
  );
}