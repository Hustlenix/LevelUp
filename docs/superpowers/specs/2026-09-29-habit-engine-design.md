# Habit Engine + Daily Ritual — Design

**Date:** 2026-09-29
**Phase:** 1 of 4 (Habit engine → Progression → Coach → Visual redesign)
**Status:** Approved (design), pending implementation plan

## Problem

LevelUp already records focus sessions, pillar floors, urge pauses, and protocol logs, and it tracks a single overall day streak — but there is no repeatable *habit* layer. Students cannot define "do this on these days," see per-habit streaks, or complete a guided daily ritual. All the raw tracking exists; none of it is organized into a repeatable system.

## Goal

Introduce a local-first habit engine: student-defined habits with chosen-weekday schedules, per-habit streaks, and a "Daily ritual" checklist on `/today/` that connects to the app's existing activity logs. Nothing leaves the device; everything rides the existing backup/restore transaction.

## Out of scope (later phases)

- Level-up / XP / badge surfacing over habit data (Phase 2)
- Companion-coach context built on ritual history, weekly review conversation (Phase 3)
- Dark mode + visual redesign pass (Phase 4)
- Onboarding changes (ritual setup stays on `/habits/` for now)

## 1. Data model — `lib/habits.ts`

### Habit

```ts
export type HabitKind = "check" | "quantity";

export interface Habit {
  id: string;                 // stable id (crypto.randomUUID / fallback)
  name: string;               // human name, e.g. "Deep focus block"
  kind: HabitKind;
  unit?: string;              // "min" | "pages" | "reps" | ... — required when quantity
  target?: number;            // target value — required when quantity
  days: number[];             // 0 = Sunday .. 6 = Saturday; non-empty
  template?: string;          // template id when created from the starter set
  link?: "focus" | "pillars" | "protocol" | "quiz"; // enables smart prompts
  archived: boolean;          // soft delete; archived habits are hidden, not lost
  createdAt: number;          // epoch ms
}
```

### Day log

```ts
export type HabitStatus = "done" | "partial" | "skipped";

export interface HabitDayLog {
  status: HabitStatus;
  value?: number;             // recorded amount for quantity habits
  updatedAt: number;
}
```

### Storage

Single key `levelup-habits-v1` in `localStorage`:

```ts
interface HabitStore {
  version: 1;
  habits: Habit[];
  log: Record<habitId, Record<date, HabitDayLog>>; // date = "YYYY-MM-DD" local
}
```

New key — no migration of existing data. Missing/invalid reads fall back to an empty store (mirrors `readJson` pattern in `lib/actionTools.ts`).

### Derivation, never stored

- **Scheduled day:** `habit.days.includes(weekday-of-date)`.
- **Streak (current/best per habit):** scan the log backward from today. Only scheduled days count. `done` or `partial` advances; `skipped` is neutral (neither advances nor breaks); an untouched scheduled day breaks. Best = longest run found scanning the full available history (a 400-day cap is sufficient for any realistic streak; histories shorter than that scan entirely).
- **Week totals:** per habit, count completed scheduled days in the current week (Mon start) against scheduled count → "4/5".

## 2. Starter templates

Five templates, offered as one-tap quick-adds, never force-created:

| Template id | Name | kind | target | days | link |
|---|---|---|---|---|---|
| `focus` | Deep focus block | quantity | 25 min | 0–6 (daily) | focus |
| `pillars` | Pillar floors | check | — | 0–6 (daily) | pillars |
| `protocol` | One protocol | check | — | 1–6 (Mon–Sat) | protocol |
| `quiz-review` | Quiz or review | check | — | 1–5 (Mon–Fri) | quiz |
| `reflect` | Highlight + reflection | check | — | 0–6 (daily) | — |

Creating a habit from a template copies its values; `template` records provenance (used by smart prompts, not by progression yet).

First visit to `/habits/` with zero active habits shows an empty state: **"Start with the starter set"** (creates all five) plus a **"Build my own"** link to the add form. `/today/`'s ritual module shows a compact "Set up your ritual" link instead of an empty list.

## 3. `/today/` — "Daily ritual" module

New module in `LevelUpOSWorkspace` (mode `today`), placed after the metric strip, before the other activity modules.

Layout per scheduled habit row:
- Name + streak chip (e.g. "3-day streak")
- Control per kind: check-off toggle for `check`; number input + target ("18 / 25 min") for `quantity`
- "Skip day" text action (sets `skipped`)
- Smart-prompt state for linked habits (see below)
- Summary line: "4 / 5 done today"

Interactions:
- Toggling to `done` on a check habit, or saving a quantity value, writes the day log and re-derives the streak live.
- `partial` is produced automatically for quantity habits with `0 < value < target`. There is no manual "partial" button.
- Un-toggling a completed habit removes the day's entry (back to nothing = missed if the day stays unfinished at midnight; the row shows unfinished as "pending" during the day).

Smart prompts (no auto-writes):
- For habits with `link: "focus"`, read today's focus sessions and show "22 min logged → Confirm". Confirm writes `value = 22`, status `done`.
- `link: "pillars"` → today's pillar floors all `done: true` → "Pillar floors checked → Confirm" (check).
- `link: "protocol"` → today's protocol logs → "1 protocol logged → Confirm" (check).
- `link: "quiz"` → today's quiz activity → "Quiz/review recorded → Confirm" (check).
- If the linked data shows nothing, no hint is shown; the habit is a normal manual row.
- Purely informational: nothing writes until the student taps Confirm or checks manually.

## 4. New page — `/habits/` (manager + weekly view)

`app/habits/page.tsx` (thin, metadata pattern: title "Habits", description, canonical `/habits/`, `robots: { index: false, follow: false }`) + `components/HabitsView.tsx` (default export, like the other views).

Sections, top to bottom:
1. **Active habits** — one card per habit: name, schedule chips (S M T W T F S with active days filled), current streak, best streak, 7-day mini-grid (last 7 dates, filled by status color), Edit / Archive actions.
2. **Weekly ritual review** — table: rows = active habits, columns = last 7 weekdays; cell shows done/partial/skipped/missed state; footer row: per-day completion "x/y". Filtered to habits scheduled that day (cell shows "—" for non-scheduled days).
3. **Add a habit** — form: name; kind toggle (check / measured); target + unit (measured only); weekday picker (at least one required); quick-add template buttons above the form.
4. **Archived** — collapsed list with Restore and Delete forever (delete shows a confirm dialog; permanent).

Edit = the add form pre-filled, saving updates the habit (logs keyed by habit id survive — id is stable).

## 5. Backup & restore

`lib/backup.ts`: add habits as an optional chunk (`entries["levelup-habits-v1"]`), validate shape on restore, treat missing/invalid as empty store (consistent with the other optional blocks like `osState`). Older backups without the chunk still restore cleanly.

## 6. Testing — `tests/habits.test.mjs`

- Streak: advances on scheduled done; partial advances; skip is neutral; missed scheduled day breaks; non-scheduled days never affect the streak.
- Quantity: value ≥ target → done; 0 < value < target → partial; 0 → no entry.
- Weekly totals: Monday-start week aggregator, non-scheduled days excluded.
- Templates: seeding creates five habits with correct values; idempotent (re-seeding after user edits does not overwrite).
- Add / edit / archive / delete flow on the store functions.
- Backup round-trip: habits chunk serializes, restores, and bad shapes are rejected with a clear error without wiping other data.

## 7. Verification gate

- `node scripts/build-data.mjs` (unchanged data) → `npx next build` compiles **67/67** static pages including `/habits`; TypeScript clean.
- `npx next lint` — 0 errors, 0 warnings.
- `node --test` — 136 existing + new habits suite green.
- Playwright on the static build: `/today/` ritual module renders and completes a check + quantity habit; `/habits/` empty-state → starter set → streak chips appear; weekly review correct; mobile 375 px: no horizontal overflow.

## 8. Explicit non-goals (guard against scope creep)

- No companion events for ritual completion (Phase 3).
- No habit charts on `/progress/` (Phase 2/4).
- No onboarding integration (later phase if wanted).
- No auto-completion from logs — Confirm is always manual.
- No server/remote sync; local-first remains.