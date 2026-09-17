"use client";

import { useMemo, useState } from "react";
import { useStudentProfile, saveProfile, defaultProfile, SOUND_OPTIONS, BOARD_OPTIONS, type StudentProfile } from "@/lib/studentProfile";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/ui";

const STEPS = ["About you", "Subjects", "Schedule", "Goals"];

export default function OnboardingWizard() {
  const existing = useStudentProfile();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<StudentProfile>(() =>
    existing.onboarded ? existing : { ...defaultProfile(), identity: { ...existing.identity } }
  );

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
function SubjectStep({ draft, setDraft }: { draft: StudentProfile; setDraft: (d: StudentProfile) => void }) {
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
        {draft.subjects.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg border border-line bg-paper-deep px-3 py-2 text-sm">
            <span className="text-ink">
              {s.name}
              {s.isWeak && <span className="ml-2 text-xs text-gold">(needs practice)</span>}
            </span>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, subjects: draft.subjects.filter((x) => x.id !== s.id) })}
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

function ScheduleStep({ draft, setDraft }: { draft: StudentProfile; setDraft: (d: StudentProfile) => void }) {
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
          onChange={(e) => setDraft({ ...draft, preferences: { ...draft.preferences, sound: e.target.value as StudentProfile["preferences"]["sound"] } })}
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

function GoalsStep({ draft, setDraft }: { draft: StudentProfile; setDraft: (d: StudentProfile) => void }) {
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