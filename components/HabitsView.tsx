"use client";

// Habits manager — define and inspect habits. What a habit IS (schedule,
// streak, week rollup) is always answered by lib/habits.ts; this file only
// decides what to show and which write to call. That split is what keeps a
// "__proto__"-named habit from turning a render into a data-loss bug, so the
// view never reads the raw day log: every cell below comes from historyCells,
// historyEntries, or weekView.
//
// Logging a day (the check toggle, the quantity stepper, skip) deliberately
// lives in the Daily ritual panel on Today, not here. This page is the place
// habits are defined and reviewed; the Today page is where they are kept.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  archive,
  createHabit,
  editHabit,
  remove,
  restore,
  seedStarterSet,
  useHabitsStore,
} from "@/lib/habitsStore";
import {
  bestStreak,
  currentStreak,
  hasHabits,
  historyCells,
  historyEntries,
  weekView,
  type Habit,
  type HabitDayLog,
  type HabitId,
  type HabitKind,
  type HabitLink,
  type HabitTemplateId,
  type HabitWeekCell,
} from "@/lib/habits";
import { formatLocalDate } from "@/lib/dates";
import HabitSaveNotice from "@/components/HabitSaveNotice";
import { useClientToday } from "@/lib/clientToday";
import {
  ActionButton,
  ActionLink,
  EmptyState,
  FormField,
  InlineNotice,
  SectionCard,
  StatusPill,
  TextInput,
  WorkspaceHeader,
} from "@/components/workspace";

// The workspace style constants are local consts in LevelUpOSWorkspace.tsx,
// not exports. Duplicated byte-identically rather than promoted to a shared
// module, which is out of scope here.
const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm font-semibold text-crimson transition-colors hover:bg-crimson/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

const chipBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
const chipOn = `${chipBase} border-gold bg-gold/10 text-ink`;
const chipOff = `${chipBase} border-line bg-card text-ink-faint`;

// Indexed by Habit.days, which is 0 = Sunday. Full names ride along for
// assistive tech, because two of the seven initials repeat.
const DAY_CHIPS = [
  { short: "S", full: "Sunday" },
  { short: "M", full: "Monday" },
  { short: "T", full: "Tuesday" },
  { short: "W", full: "Wednesday" },
  { short: "T", full: "Thursday" },
  { short: "F", full: "Friday" },
  { short: "S", full: "Saturday" },
] as const;

// weekView hands back days Monday first, so the week table headers are too.
const WEEK_HEADERS = [
  { short: "M", full: "Monday" },
  { short: "T", full: "Tuesday" },
  { short: "W", full: "Wednesday" },
  { short: "T", full: "Thursday" },
  { short: "F", full: "Friday" },
  { short: "S", full: "Saturday" },
  { short: "S", full: "Sunday" },
] as const;

const LINK_LABELS: Record<HabitLink, string> = {
  focus: "Focus sessions",
  pillars: "Pillar floors",
  protocol: "Protocol",
  quiz: "Quiz log",
};

const TEMPLATE_LABELS: Record<HabitTemplateId, string> = {
  focus: "Focus",
  pillars: "Pillars",
  protocol: "Protocol",
  "quiz-review": "Quiz review",
  reflect: "Reflect",
};

const CELL_STYLES: Record<HabitWeekCell, string> = {
  done: "border-gold bg-gold text-paper",
  partial: "border-gold/50 bg-gold/20 text-ink",
  skipped: "border-line bg-paper-deep text-ink-faint",
  none: "border-line bg-paper text-ink-faint",
  off: "border-line bg-card text-ink-faint/60",
};

const CELL_WORDS: Record<HabitWeekCell, string> = {
  done: "done",
  partial: "partly done",
  skipped: "skipped",
  none: "not logged",
  off: "not scheduled",
};

// One glyph table for both grids, so the rolling history and the week table can
// never disagree about what a state looks like.
const CELL_GLYPH: Record<HabitWeekCell, string> = {
  done: "✓",
  partial: "◐",
  skipped: "⊘",
  none: "–",
  off: "—",
};

/**
 * What a cell says, beyond the state word the glyph already carries.
 *
 * For a measured habit, "partly done" is not actionable on its own: the question
 * behind a quantity cell is always "how far did I get", and "5/8" answers it
 * where a ◐ does not. Returns the visible reading and the spoken form together so
 * the two can never drift — a cell must never show one thing to the eye and
 * another to a screen reader.
 *
 * Only quantity habits carry a number, and only once something has been logged,
 * so check habits and unlogged cells keep their glyph and stay status-only.
 */
function cellReading(
  habit: Habit,
  cell: HabitWeekCell,
  entry: HabitDayLog | undefined,
): { visible: string; spoken: string } | undefined {
  if ((cell !== "done" && cell !== "partial") || habit.kind !== "quantity" || entry?.value === undefined) return undefined;
  const unit = habit.unit ? ` ${habit.unit}` : "";
  const measured = habit.target === undefined ? `${entry.value}${unit}` : `${entry.value} of ${habit.target}${unit}`;
  return {
    visible: habit.target === undefined ? `${entry.value}` : `${entry.value}/${habit.target}`,
    // The state word stays in every branch: "5 of 8 min, partly done" tells a
    // screen-reader user both how far and whether it counted.
    spoken: `${measured}, ${CELL_WORDS[cell]}`,
  };
}

const HEADER_DESCRIPTION =
  "The small repeatable actions the rest of LevelUp leans on. Set the schedule, watch the streak, and check the week. Everything stays on this device.";

type Draft = {
  name: string;
  kind: HabitKind;
  unit: string;
  target: string;
  days: number[];
  template?: HabitTemplateId;
};

const emptyDraft: Draft = { name: "", kind: "check", unit: "", target: "", days: [1, 2, 3, 4, 5] };

function draftFrom(habit: Habit): Draft {
  return {
    name: habit.name,
    kind: habit.kind,
    unit: habit.unit ?? "",
    target: habit.target === undefined ? "" : String(habit.target),
    days: [...habit.days].sort((a, b) => a - b),
    template: habit.template,
  };
}

function parseTarget(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export default function HabitsView() {
  const store = useHabitsStore();
  const today = useClientToday();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<HabitId | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<HabitId | null>(null);

  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const archivedHeadingRef = useRef<HTMLHeadingElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const returnDeleteFocus = useRef<string | null>(null);
  const moveFocusAfterDelete = useRef(false);

  // Confirming replaces the button that opened it, and deleting removes the card
  // outright. Without this the keyboard is dropped on <body> mid-flow, which is
  // worst exactly where the user is destroying something irreversible.
  useEffect(() => {
    if (confirmDeleteId !== null) cancelDeleteRef.current?.focus();
    else if (returnDeleteFocus.current) {
      document.getElementById(`habit-delete-${returnDeleteFocus.current}`)?.focus();
      returnDeleteFocus.current = null;
    }
  }, [confirmDeleteId]);

  // Today plus the previous six days, oldest first. localDateOffset keeps this
  // on the local calendar, so it can never disagree with the keys that were
  // written at midnight.
  const historyKeys = useMemo(() => today ? [-6, -5, -4, -3, -2, -1, 0].map((n) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + n);
    return formatLocalDate(date);
  }) : [], [today]);

  const active = store.habits.filter((habit) => !habit.archived);
  const archived = store.habits.filter((habit) => habit.archived);
  const week = useMemo(() => (today ? weekView(store, today) : null), [store, today]);
  const anyHabits = hasHabits(store);

  // Declared after `archived` because its dependency array reads it during render.
  useEffect(() => {
    if (!moveFocusAfterDelete.current) return;
    (archivedHeadingRef.current ?? addButtonRef.current)?.focus();
    moveFocusAfterDelete.current = false;
  }, [archived.length]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setErrors([]);
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setErrors([]);
    setFormOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setDraft(draftFrom(habit));
    setErrors([]);
    setFormOpen(true);
  };

  const toggleDay = (day: number) =>
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day].sort((a, b) => a - b),
    }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    const problems: string[] = [];
    if (name === "") problems.push("Give the habit a name so you recognise it on the Today page.");
    if (draft.days.length === 0) problems.push("Pick at least one day. A habit with no days never comes due.");

    let target: number | undefined;
    if (draft.kind === "quantity") {
      const parsed = parseTarget(draft.target);
      if (parsed === null) problems.push("Set a whole-number target of 1 or more.");
      else target = parsed;
    }

    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    const unit = draft.unit.trim();
    // A check habit carries no unit or target; switching kinds clears the other
    // one's fields rather than leaving a target stranded on a check habit.
    const shape =
      draft.kind === "quantity"
        ? { kind: draft.kind, unit, target }
        : { kind: draft.kind, unit: undefined, target: undefined };

    if (editingId) {
      // editHabit patches the habit only, so the log stays exactly as it was.
      editHabit(editingId, { name, days: draft.days, template: draft.template, ...shape });
    } else {
      createHabit({ name, days: draft.days, template: draft.template, ...shape });
    }
    closeForm();
  };

  // Nothing store-derived may render before the client has a real date, or the
  // server HTML and the first client paint disagree about which day it is.
  if (today === "") {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <WorkspaceHeader eyebrow="Habits" title="Your habits" description={HEADER_DESCRIPTION} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <WorkspaceHeader
        eyebrow="Habits"
        title="Your habits"
        description={HEADER_DESCRIPTION}
        actions={
          anyHabits ? (
            <button ref={addButtonRef} type="button" className={secondaryButton} onClick={openCreate}>
              Add habit
            </button>
          ) : null
        }
      />

      {/* 1 — nothing defined yet */}
      <div className="mb-5"><ActionLink href="/today/#daily-ritual" variant="quiet">Log today’s ritual →</ActionLink></div>
      <HabitSaveNotice />
      {!anyHabits && (
        <div className="mb-8">
          <EmptyState
            eyebrow="Nothing tracked yet"
            title="Build your first habit"
            description="Start from the five habits LevelUp already leans on, or write your own from scratch. You can edit, archive, or delete any of them later."
          >
            <div className="flex flex-wrap gap-2">
              <ActionButton type="button" onClick={() => seedStarterSet()}>
                Start with the starter set
              </ActionButton>
              <ActionButton type="button" variant="secondary" onClick={openCreate}>
                Build my own
              </ActionButton>
            </div>
          </EmptyState>
        </div>
      )}

      {/* 2 — one card per active habit */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Active habits</h2>
          <div className="grid gap-3">
            {active.map((habit) => {
              const cells = historyCells(store, habit.id, historyKeys);
              const current = currentStreak(store, habit.id, today);
              const best = bestStreak(store, habit.id, today);
              return (
                <SectionCard key={habit.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-ink">{habit.name}</h3>
                      <p className="mt-1 text-xs text-ink-faint">
                        {habit.kind === "quantity" && habit.target
                          ? `Target ${habit.target}${habit.unit ? ` ${habit.unit}` : ""} each time`
                          : "Checked off each time"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {habit.link && <StatusPill tone="active">{LINK_LABELS[habit.link]}</StatusPill>}
                      {habit.template && <StatusPill tone="neutral">{TEMPLATE_LABELS[habit.template]}</StatusPill>}
                      <StatusPill tone={current > 0 ? "success" : "neutral"}>
                        {current} day{current === 1 ? "" : "s"} running
                      </StatusPill>
                      <StatusPill tone="neutral">Best {best}</StatusPill>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <ul className="flex flex-wrap gap-1.5" aria-label="Weekly schedule">
                      {DAY_CHIPS.map((day, index) => {
                        const scheduled = habit.days.includes(index);
                        return (
                          <li key={day.full}>
                            <span className={scheduled ? chipOn : chipOff}>
                              <span aria-hidden="true">{day.short}</span>
                              <span className="sr-only">
                                {day.full}
                                {scheduled ? ": scheduled" : ": not scheduled"}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex items-center gap-1.5">
                      {cells.map((cell, index) => (
                        <span
                          key={historyKeys[index]}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded border text-[0.625rem] font-semibold ${CELL_STYLES[cell]}`}
                        >
                          <span aria-hidden="true">{CELL_GLYPH[cell]}</span>
                          <span className="sr-only">
                            {historyKeys[index]}: {CELL_WORDS[cell]}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton type="button" variant="secondary" onClick={() => openEdit(habit)}>
                      Edit
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="quiet"
                      onClick={() => {
                        archive(habit.id);
                        if (editingId === habit.id) closeForm();
                      }}
                    >
                      Archive
                    </ActionButton>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        </section>
      )}

      {/* 3 — the Monday-start week, straight from weekView */}
      {anyHabits && week && (
        <SectionCard className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink">This week</h2>
          <p className="mt-1 text-xs text-ink-faint">
            The week is Monday to Sunday. A dash means the habit was not due that day.
          </p>

          <div
            className="relative mt-4 max-w-full overflow-x-auto"
            role="region"
            aria-label="This week at a glance"
            tabIndex={0}
          >
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <caption className="sr-only">
                Each active habit across the current week, with the number of habits completed out of
                those scheduled for each weekday.
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 text-left text-xs font-semibold text-ink-soft">
                    Habit
                  </th>
                  {week.days.map((day, index) => (
                    <th
                      key={day}
                      scope="col"
                      className="px-1 py-2 text-center text-xs font-semibold text-ink-soft"
                    >
                      <span aria-hidden="true">{WEEK_HEADERS[index].short}</span>
                      <span className="sr-only">{WEEK_HEADERS[index].full}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.rows.map((row) => {
                  // Read through historyEntries rather than the raw log: the
                  // week table needs the recorded value behind a quantity cell,
                  // and this is the only door to it.
                  const entries = historyEntries(store, row.habit.id, week.days);
                  return (
                    <tr key={row.habit.id} className="border-b border-line/60">
                      <th scope="row" className="py-2.5 pr-3 text-left font-normal text-ink">
                        <span className="block text-sm">{row.habit.name}</span>
                        {row.habit.kind === "quantity" && row.habit.target ? (
                          <span className="block text-xs text-ink-faint">
                            Target {row.habit.target}
                            {row.habit.unit ? ` ${row.habit.unit}` : ""}
                          </span>
                        ) : null}
                      </th>
                      {row.cells.map((cell, index) => {
                        const reading = cellReading(row.habit, cell, entries[index]);
                        return (
                          <td key={week.days[index]} className="px-1 py-2.5 text-center">
                            <span
                              className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1 text-[0.6875rem] font-semibold tabular-nums ${CELL_STYLES[cell]}`}
                            >
                              {reading ? (
                                <>
                                  {/* The number replaces the glyph in the same slot, so a
                                      measured week reads as figures rather than symbols. */}
                                  <span aria-hidden="true">{reading.visible}</span>
                                  <span className="sr-only">
                                    {WEEK_HEADERS[index].full}: {reading.spoken}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span aria-hidden="true">{CELL_GLYPH[cell]}</span>
                                  <span className="sr-only">
                                    {WEEK_HEADERS[index].full}: {CELL_WORDS[cell]}
                                  </span>
                                </>
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-3 text-left text-xs font-semibold text-ink-soft">
                    Done
                  </th>
                  {week.footers.map((footer, index) => (
                    <td key={week.days[index]} className="px-1 py-2.5 text-center text-xs text-ink-soft">
                      <span aria-hidden="true">
                        {footer.completed}/{footer.scheduled}
                      </span>
                      <span className="sr-only">
                        {WEEK_HEADERS[index].full}: {footer.completed} of {footer.scheduled} completed
                      </span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>
      )}

      {/* 4 — the inline add / edit form */}
      {formOpen && (
        <SectionCard className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink">
            {editingId ? "Edit habit" : "Add a habit"}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {editingId
              ? "Changing the schedule or name keeps every day you have already logged."
              : "Small and specific beats big and vague — name it the way you would say it out loud."}
          </p>

          <form className="mt-4 grid gap-4" onSubmit={submit} noValidate>
            {errors.length > 0 && (
              <InlineNotice tone="error">
                <ul className="list-disc space-y-1 pl-4">
                  {errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </InlineNotice>
            )}

            <FormField label="Name" hint="What you call it on the Today page.">
              <TextInput
                aria-label="Name"
                autoFocus
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
                placeholder="e.g. Ten pages before bed"
                maxLength={60}
              />
            </FormField>

            <fieldset>
              <legend className="text-xs font-semibold text-ink-soft">How is it tracked?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={draft.kind === "check" ? primaryButton : secondaryButton}
                  aria-pressed={draft.kind === "check"}
                  onClick={() => setDraft((d) => ({ ...d, kind: "check" }))}
                >
                  Just check it off
                </button>
                <button
                  type="button"
                  className={draft.kind === "quantity" ? primaryButton : secondaryButton}
                  aria-pressed={draft.kind === "quantity"}
                  onClick={() => setDraft((d) => ({ ...d, kind: "quantity" }))}
                >
                  Count towards a number
                </button>
              </div>
            </fieldset>

            {draft.kind === "quantity" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Target" hint="A whole number of 1 or more.">
                  <TextInput
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={draft.target}
                    onChange={(event) => setDraft((d) => ({ ...d, target: event.target.value }))}
                    placeholder="25"
                  />
                </FormField>
                <FormField label="Unit" hint="Optional. Shown after the number, like min or pages.">
                  <TextInput
                    value={draft.unit}
                    onChange={(event) => setDraft((d) => ({ ...d, unit: event.target.value }))}
                    placeholder="min"
                    maxLength={16}
                  />
                </FormField>
              </div>
            )}

            <fieldset>
              <legend className="text-xs font-semibold text-ink-soft">Which days?</legend>
              <p className="mt-1 text-xs text-ink-faint">
                Off days never count against a streak, so keep the list to the days you really mean it.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {DAY_CHIPS.map((day, index) => {
                  const on = draft.days.includes(index);
                  return (
                    <li key={day.full}>
                      <button
                        type="button"
                        className={on ? chipOn : chipOff}
                        aria-pressed={on}
                        onClick={() => toggleDay(index)}
                      >
                        <span aria-hidden="true">{day.short}</span>
                        <span className="sr-only">{day.full}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <ActionButton type="submit">{editingId ? "Save changes" : "Add habit"}</ActionButton>
              <ActionButton type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* 5 — archived, with delete behind an explicit second step */}
      {archived.length > 0 && (
        <section>
          <h2
            ref={archivedHeadingRef}
            tabIndex={-1}
            className="mb-3 font-display text-lg font-semibold text-ink"
          >
            Archived
          </h2>
          <div className="grid gap-3">
            {archived.map((habit) => (
              <SectionCard key={habit.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-ink">{habit.name}</h3>
                    <p className="mt-1 text-xs text-ink-faint">
                      Archived habits keep their history and stop appearing on the Today page.
                    </p>
                  </div>
                  <ActionButton type="button" variant="secondary" onClick={() => restore(habit.id)}>
                    Restore
                  </ActionButton>
                </div>

                {confirmDeleteId === habit.id ? (
                  <div className="mt-4 grid gap-3">
                    <InlineNotice tone="error">
                      Deleting {habit.name} removes it and every day you logged for it. This cannot be
                      undone.
                    </InlineNotice>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={dangerButton}
                        onClick={() => {
                          remove(habit.id);
                          setConfirmDeleteId(null);
                          moveFocusAfterDelete.current = true;
                          if (editingId === habit.id) closeForm();
                        }}
                      >
                        Yes, delete forever
                      </button>
                      <button
                        ref={cancelDeleteRef}
                        type="button"
                        className={secondaryButton}
                        onClick={() => { returnDeleteFocus.current = habit.id; setConfirmDeleteId(null); }}
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <ActionButton
                      id={`habit-delete-${habit.id}`}
                      type="button"
                      variant="quiet"
                      onClick={() => setConfirmDeleteId(habit.id)}
                    >
                      Delete forever
                    </ActionButton>
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
