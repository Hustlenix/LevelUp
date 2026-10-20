"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BOARD_OPTIONS,
  DEFAULT_MINUTES_PER_DAY,
  DEFAULT_SESSION_MINUTES,
  DEFAULT_STUDY_DAYS,
  SOUND_OPTIONS,
  saveProfile,
  useStudentProfile,
  type StudentProfile,
  type StudySubject,
} from "@/lib/studentProfile";
import {
  ActionButton,
  ActionLink,
  FormField,
  SectionCard,
  TextInput,
  WorkspaceHeader,
} from "@/components/workspace";

const STEP_LABELS = ["Welcome", "Subjects", "Preferences", "Ready"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LifeOSOnboarding() {
  const router = useRouter();
  const profile = useStudentProfile();

  const [step, setStep] = useState(0);

  // Step 1 — who is studying
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");

  // Step 2 — subjects & schedule
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectWeak, setSubjectWeak] = useState(false);
  const [studyDays, setStudyDays] = useState<number[]>([...DEFAULT_STUDY_DAYS]);
  const [minutesPerDay, setMinutesPerDay] = useState(String(DEFAULT_MINUTES_PER_DAY));
  const [sessionMinutes, setSessionMinutes] = useState<(typeof SESSION_OPTIONS)[number]>(
    DEFAULT_SESSION_MINUTES,
  );

  // Step 3 — preferences
  const [sound, setSound] = useState<"silent" | "lofi" | "ambient">("silent");
  const [showQuotes, setShowQuotes] = useState(true);
  const [weeklyMinutes, setWeeklyMinutes] = useState("");

  const addSubject = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) return;
    setSubjects((prev) => [...prev, { id: uid(), name: trimmed, isWeak: subjectWeak }]);
    setSubjectName("");
    setSubjectWeak(false);
  };

  const removeSubject = (id: string) => setSubjects((prev) => prev.filter((s) => s.id !== id));

  const toggleDay = (d: number) =>
    setStudyDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );

  const finish = () => {
    const now = new Date().toISOString();
    const p: StudentProfile = {
      schemaVersion: 1,
      onboarded: true,
      identity: {
        name: name.trim(),
        age: parseBounded(age, 6, 99),
        grade: grade.trim(),
        board: board === "" ? null : board,
      },
      subjects,
      exams: [],
      schedule: {
        studyDays: studyDays.length > 0 ? studyDays : [...DEFAULT_STUDY_DAYS],
        preferredMinutesPerDay: parseBounded(minutesPerDay, 10, 600) ?? DEFAULT_MINUTES_PER_DAY,
        preferredSessionMinutes: sessionMinutes,
      },
      preferences: { sound, showQuotes },
      goals: { weeklyStudyMinutes: parseBounded(weeklyMinutes, 30, 3000) },
      created: now,
      updated: now,
    };
    saveProfile(p);
    router.push("/today/");
  };

  // Already set up (e.g. after re-visiting) — offer a way back in.
  if (profile.onboarded) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <SectionCard className="border-dashed">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Welcome back
          </p>
          <h1 className="mt-2 font-display text-xl font-semibold text-ink">
            Your study profile is ready
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            You&apos;ve already completed setup. Head to Today to see your mission, or open Profile to
            adjust anything.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionLink href="/today/">Open Today</ActionLink>
            <ActionLink href="/profile/" variant="secondary">
              Edit profile
            </ActionLink>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
      <WorkspaceHeader
        eyebrow={`Step ${step + 1} of ${STEP_LABELS.length}`}
        title="Set up your study OS"
        description="A few questions, and LevelUp will plan each day's study session around you. You can change anything later."
      />

      <nav aria-label="Setup steps" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex min-w-0 items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${i <= step ? "bg-gold" : "bg-line"}`}
              />
              <span className={`text-xs font-semibold ${i === step ? "text-ink" : "text-ink-faint"}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-deep" role="presentation">
          <div
            className="h-1 rounded-full bg-gold transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </nav>

      {step === 0 ? (
        <SectionCard>
          <h2 className="font-display text-lg font-semibold text-ink">Who is studying?</h2>
          <p className="mt-1 text-sm text-ink-soft">Just your first name is enough — the rest helps us tune the tone and pace.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="First name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mira" autoComplete="given-name" />
            </FormField>
            <FormField label="Age (optional)">
              <TextInput type="number" min={6} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 11" />
            </FormField>
            <FormField label="Grade (optional)">
              <TextInput value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 7" />
            </FormField>
            <FormField label="Board (optional)">
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
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
      ) : null}

      {step === 1 ? (
        <SectionCard>
          <h2 className="font-display text-lg font-semibold text-ink">Subjects &amp; schedule</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Add the subjects you study, then tell us when and how long you like to focus.
          </p>
          <form onSubmit={addSubject} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField label="Subject">
                <TextInput value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Science" />
              </FormField>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={subjectWeak}
                onChange={(e) => setSubjectWeak(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Needs extra practice
            </label>
            <ActionButton type="submit" variant="secondary" className="shrink-0">
              Add
            </ActionButton>
          </form>
          {subjects.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {subjects.map((s) => (
                <li key={s.id}>
                  <span className={`${s.isWeak ? chipOn : chipOff} gap-1`}>
                    {s.name}
                    {s.isWeak ? <span className="text-gold">*</span> : null}
                    <button
                      type="button"
                      aria-label={`Remove ${s.name}`}
                      className="ml-1 rounded-full px-1 text-ink-faint transition-colors hover:text-rose-700"
                      onClick={() => removeSubject(s.id)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink-faint">No subjects yet — you can add them later too.</p>
          )}
          <div className="mt-5 space-y-5">
            <div>
              <span className="text-xs font-semibold text-ink-soft">Study days</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => {
                  const on = studyDays.includes(i);
                  return (
                    <button key={label} type="button" aria-pressed={on} className={on ? chipOn : chipOff} onClick={() => toggleDay(i)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Minutes per study day" hint="LevelUp caps each day's mission at this.">
                <TextInput type="number" min={10} max={600} value={minutesPerDay} onChange={(e) => setMinutesPerDay(e.target.value)} />
              </FormField>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Session length</span>
                <div className="mt-2 flex gap-2">
                  {SESSION_OPTIONS.map((m) => {
                    const on = sessionMinutes === m;
                    return (
                      <button key={m} type="button" aria-pressed={on} className={on ? chipOn : chipOff} onClick={() => setSessionMinutes(m)}>
                        {SESSION_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {step === 2 ? (
        <SectionCard>
          <h2 className="font-display text-lg font-semibold text-ink">Make it yours</h2>
          <p className="mt-1 text-sm text-ink-soft">Little touches that make studying feel lighter.</p>
          <div className="mt-4 space-y-5">
            <div>
              <span className="text-xs font-semibold text-ink-soft">Focus sound</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {SOUND_OPTIONS.map((s) => {
                  const on = sound === s;
                  return (
                    <button key={s} type="button" aria-pressed={on} className={on ? chipOn : chipOff} onClick={() => setSound(s)}>
                      {SOUND_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>
            <FormField label="Weekly study goal (optional)" hint="Leave blank for no weekly target.">
              <TextInput type="number" min={30} max={3000} value={weeklyMinutes} onChange={(e) => setWeeklyMinutes(e.target.value)} placeholder="e.g. 300" />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={showQuotes}
                onChange={(e) => setShowQuotes(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Show a quote on the Today page
            </label>
          </div>
        </SectionCard>
      ) : null}

      {step === 3 ? (
        <SectionCard>
          <h2 className="font-display text-lg font-semibold text-ink">Ready when you are</h2>
          <p className="mt-1 text-sm text-ink-soft">Here&apos;s the study OS you&apos;re about to switch on.</p>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Name</dt>
              <dd className="mt-0.5 text-ink">{name.trim() || "Not set yet"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Grade · Board</dt>
              <dd className="mt-0.5 text-ink">
                {grade.trim() || "—"} · {board || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Subjects</dt>
              <dd className="mt-0.5 text-ink">
                {subjects.length > 0 ? subjects.map((s) => s.name).join(", ") : "None yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Schedule</dt>
              <dd className="mt-0.5 text-ink">
                {studyDays.map((d) => DAY_LABELS[d]).join(", ")} · {minutesPerDay} min/day
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Sound</dt>
              <dd className="mt-0.5 text-ink">{SOUND_LABELS[sound]}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Weekly goal</dt>
              <dd className="mt-0.5 text-ink">{weeklyMinutes.trim() ? `${weeklyMinutes} min` : "No target"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-faint">
            Everything you enter stays on this device. Nothing is sent anywhere.
          </p>
        </SectionCard>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <ActionButton variant="secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </ActionButton>
        ) : (
          <span />
        )}
        {step < STEP_LABELS.length - 1 ? (
          <ActionButton onClick={() => setStep((s) => s + 1)}>Continue</ActionButton>
        ) : (
          <ActionButton onClick={finish}>Finish setup</ActionButton>
        )}
      </div>
    </div>
  );
}
