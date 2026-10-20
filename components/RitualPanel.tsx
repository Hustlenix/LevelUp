"use client";

import { useId, useState, type FormEvent } from "react";
import { currentStreak, entryForValue, todayRoutine, type Habit, type HabitDayLog } from "@/lib/habits";
import { seedStarterSet, setLog, useHabitsStore } from "@/lib/habitsStore";
import { useClientToday } from "@/lib/clientToday";
import { useFocusStore, usePillarsStore, useProtocolLogsStore } from "@/lib/actionTools";
import { useHighlightsStore, useQuizStore } from "@/lib/activity";
import { useOSStore } from "@/lib/os/store";
import { habitHint } from "@/lib/habitHints";
import { ActionButton, ActionLink, SectionCard } from "@/components/workspace";
import HabitSaveNotice from "@/components/HabitSaveNotice";

function RitualRow({ habit, entry, today, streak, hint }: { habit: Habit; entry?: HabitDayLog; today: string; streak: number; hint?: ReturnType<typeof habitHint> }) {
  const inputId = useId();
  const source = `${entry?.updatedAt ?? ""}:${entry?.status ?? ""}:${entry?.value ?? ""}`;
  const savedValue = entry?.value === undefined ? "" : String(entry.value);
  const [draft, setDraft] = useState({ source, value: savedValue });
  // A backup or another tab can replace the entry while this row stays mounted.
  const value = draft.source === source ? draft.value : savedValue;
  const setValue = (next: string) => setDraft({ source, value: next });
  const [error, setError] = useState("");
  const complete = entry?.status === "done" || entry?.status === "partial";
  const status = entry?.status === "partial" ? "Partly done" : entry?.status === "done" ? "Done" : entry?.status === "skipped" ? "Skipped" : "Not logged";
  function confirm(event: FormEvent) {
    event.preventDefault();
    const number = value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(number) || number < 0) { setError("Enter a number of zero or more."); return; }
    setError("");
    if (number === 0) setValue("");
    setLog(habit.id, today, number === 0 ? null : entryForValue(habit, number));
  }
  return <li className="min-w-0 border-t border-line py-5 first:border-t-0 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold text-ink">{habit.name}</h3><p className="mt-1 text-xs text-ink-soft">{habit.kind === "quantity" ? `Target ${habit.target ?? 0}${habit.unit ? ` ${habit.unit}` : ""} · ` : ""}{status} · {streak} scheduled-day streak</p></div>
      {habit.kind === "check" ? <ActionButton type="button" variant={complete ? "primary" : "secondary"} aria-pressed={complete} aria-label={`${complete ? "Undo" : "Complete"} ${habit.name}`} onClick={() => setLog(habit.id, today, complete ? null : { status: "done", updatedAt: new Date().toISOString() })}>{complete ? "✓ Done" : "Mark done"}</ActionButton> : null}
    </div>
    {habit.kind === "quantity" ? <form onSubmit={confirm} className="mt-3 flex flex-wrap items-end gap-2" noValidate>
      <div className="min-w-0 flex-1"><label htmlFor={inputId} className="mb-1 block text-xs font-medium text-ink-soft">Amount{habit.unit ? ` (${habit.unit})` : ""}</label><input id={inputId} type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} className="min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-gold" /></div>
      <ActionButton type="submit" variant="secondary">Confirm</ActionButton>
      {error ? <p id={`${inputId}-error`} role="alert" className="w-full text-sm text-crimson">{error}</p> : null}
    </form> : null}
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <ActionButton type="button" variant="quiet" className="px-2 text-xs" aria-label={`${entry?.status === "skipped" ? "Undo skip for" : "Skip"} ${habit.name}`} onClick={() => { setValue(""); setError(""); setLog(habit.id, today, entry?.status === "skipped" ? null : { status: "skipped", updatedAt: new Date().toISOString() }); }}>{entry?.status === "skipped" ? "Undo skip" : "Skip today"}</ActionButton>
      {hint && !complete && entry?.status !== "skipped" ? <p className="max-w-full text-xs leading-relaxed text-ink-soft">{hint.text}{habit.kind === "quantity" && hint.value !== undefined ? <button type="button" className="ml-1 min-h-11 px-2 font-semibold text-gold underline focus-visible:outline-2 focus-visible:outline-gold" onClick={() => setValue(String(hint.value))}>Use {hint.value} {habit.unit ?? ""}</button> : null}</p> : null}
    </div>
  </li>;
}

export default function RitualPanel() {
  const store = useHabitsStore();
  const today = useClientToday();
  const focus = useFocusStore();
  const pillars = usePillarsStore();
  const protocols = useProtocolLogsStore();
  const quizzes = useQuizStore();
  const highlights = useHighlightsStore();
  const os = useOSStore();
  if (!today) return null;
  const routine = todayRoutine(store, today);
  const evidence = { focus, pillars: pillars[today], protocols, quizzes: Object.values(quizzes), highlights, sessions: Object.values(os.sessions), reviews: Object.values(os.reviews) };
  return <SectionCard id="daily-ritual" className="scroll-mt-24" aria-labelledby="daily-ritual-title">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 id="daily-ritual-title" className="font-display text-xl font-semibold text-ink">Daily ritual</h2><p className="mt-1 text-sm text-ink-soft" role="status">{routine.total ? `${routine.completed} / ${routine.total} done` : "Small actions, on your schedule."}</p></div><ActionLink href="/habits/" variant="quiet">Edit ritual →</ActionLink></div>
    <HabitSaveNotice />
    {store.habits.length === 0 ? <div>
      <p className="mb-4 text-sm leading-relaxed text-ink-soft">Choose a few actions worth repeating. Start with five editable habits, or build your own.</p>
      <div className="flex flex-wrap gap-2"><ActionButton onClick={() => seedStarterSet()}>Start with the starter set</ActionButton><ActionLink href="/habits/" variant="secondary">Build my own</ActionLink></div>
    </div> : routine.total === 0 ? <p className="text-sm text-ink-soft">Nothing scheduled today. Enjoy the space, or edit your ritual to add an action.</p> : <>
      <ul>{routine.items.map(({ habit, entry }) => <RitualRow key={`${habit.id}:${today}`} habit={habit} entry={entry} today={today} streak={currentStreak(store, habit.id, today)} hint={habitHint(habit, today, evidence)} />)}</ul>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">Partial effort counts. Skips preserve your streak without extending it; off-days aren’t misses. Everything stays on this device.</p>
    </>}
  </SectionCard>;
}
