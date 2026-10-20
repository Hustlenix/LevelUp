# Habit Engine and Daily Ritual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Phase 1 habit engine: a `/habits/` manager page and a "Daily ritual" module on `/today/`, with day-level check-off/measured logging, chosen-weekday schedules, streak tracking over scheduled days only, smart-prompt hints (manual confirm only), and full backup integration — without breaking any existing route, localStorage key, or the static export build.

**Architecture:** Add a small pure domain module `lib/habits.ts` (no React, no module-scope `window`, erasable-only TypeScript so Node's type stripping can import it directly), a client store wrapper `lib/habitsStore.ts` ("use client") mirroring the proven `lib/activity.ts` snapshot/subscribe/`useSyncExternalStore` pattern, and thin UI layers reusing the existing workspace primitives. The ritual panel slots into the existing Today workspace shell; backup integration extends the existing `BackupState` with one optional chunk.

**Tech Stack:** Next.js 16.3.5 static export, React 19, TypeScript ^6.0.3 (type stripping), Tailwind CSS v4, Node test runner (`node:test`), Playwright.

## Global Constraints

- Local-first only: all habit state lives in localStorage under key `levelup-habits-v1`. No server, no sync, no accounts.
- Never change or overwrite other localStorage keys. Existing backups without the habits chunk must still restore (habits chunk is optional; missing/invalid chunk = empty habit store, no hard error).
- `lib/habits.ts` must stay pure: no `import "react"`, no `window`/`localStorage` at module scope (only inside functions), no `@/` alias imports, no enums/namespaces/parameter-properties (erasable-only). All date handling goes through existing pure helpers in `lib/dates.ts` (`localToday()`, `formatLocalDate(d)`, `localDateOffset(deltaDays)`).
- Verification gate (all must pass before the phase is reported done): `npm run lint` (eslint, 0 errors) → `npm run build` (runs `node scripts/build-data.mjs` then `next build`; expect 67/67 static routes — 66 existing + new `/habits`) → `npm test` (136 existing tests + the new habits suite) → Playwright walkthrough of the ritual and habits flows against the static build.
- House rules: no commit, push, or delete without explicit approval ("approved, continue"). Conventional commits, no emojis. Do not touch `.wakatime.cfg`. Do not disturb the dev server already running on port 3000 — serve the static build on another port during Playwright verification. Leave the tree clean between commits.
- The UI chain (taste-design → design-system-generator → build → playwright-ui-tester → web-design-guidelines → fix → re-verify) applies to the two new user-facing surfaces and runs as part of Task 4/6.

---

### Task 1: Pure habit domain core + tests

**Files:**
- Create: `lib/habits.ts`
- Create: `tests/habits.test.mjs`
- Modify: `package.json` (append `tests/habits.test.mjs` to the fixed `test` script file list)

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-09-29-habit-engine-design.md`; `localToday()`, `formatLocalDate()`, `localDateOffset()` from `lib/dates.ts`.
- Produces: the complete pure domain model below, unit-tested.

**Data model (locked):**
- `type HabitKind = "check" | "quantity"`
- `type HabitLink = "focus" | "pillars" | "protocol" | "quiz"`
- `interface Habit { id: string; name: string; kind: HabitKind; unit?: string; target?: number; days: number[] /* 0=Sun .. 6=Sat, non-empty */; template?: "focus" | "pillars" | "protocol" | "quiz-review" | "reflect"; link?: HabitLink; archived: boolean; createdAt: string /* ISO */ }`
- `interface HabitDayLog { status: "done" | "partial" | "skipped"; value?: number; updatedAt: string }`
- `interface HabitStore { version: 1; habits: Habit[]; log: Record<HabitId, Record<"YYYY-MM-DD", HabitDayLog>> }`
- Day keys are always `formatLocalDate()` of a local calendar date. All date logic handles local dates via `lib/dates.ts`; timezone is whatever the device reports.

**Starter templates (seeding is idempotent — only when `store.habits.length === 0`):**
1. `focus` — "Deep focus block", quantity, unit "min", target 25, days [1,2,3,4,5,6,0] (daily), link `focus`.
2. `pillars` — "Pillar floors", check, daily, link `pillars`.
3. `protocol` — "One protocol", check, days [1,2,3,4,5,6] (Mon–Sat), link `protocol`.
4. `quiz-review` — "Quiz or review", check, days [1,2,3,4,5] (Mon–Fri), link `quiz`.
5. `reflect` — "Highlight + reflection", check, daily, no link.

**Pure functions to implement and export:**
- `emptyHabitStore(): HabitStore`
- `starterTemplates(): Habit[]` (fresh objects each call; ids/createdAt filled by the caller so seeding stays pure and idempotence is testable)
- `seedStarterStore(store: HabitStore, mkId: () => string): HabitStore` — only seeds when `store.habits.length === 0`; stamps `id` via `mkId()` and `createdAt` `new Date().toISOString()` per habit
- `isHabitStore(json: unknown): json is HabitStore` — validates version === 1, habits array, each habit's shape (days = non-empty array of ints 0–6, kind ∈ {check, quantity}, name non-empty string, archived boolean), log is a record of habitId → record of date → HabitDayLog with valid status
- `addHabit(store, habit: Habit): HabitStore` (append; replacing an existing id keeps order)
- `updateHabit(store, id, patch: Partial<Omit<Habit, "id">>): HabitStore`
- `archiveHabit(store, id)`, `restoreHabit(store, id)` (flips `archived`), `removeHabit(store, id)` (delete forever)
- `isScheduledOn(habit, dateKey: string): boolean` (habit.days contains dateKey's weekday)
- `entryForValue(habit, value: number): HabitDayLog` — quantity: value >= target → `{ status: "done", value }`; 0 < value < target → `{ status: "partial", value }`; check kind → `{ status: "done" }`. (0/empty never creates an entry — callers delete instead.)
- `setDayLog(store, habitId, dateKey, log: HabitDayLog | null): HabitStore` (null removes the entry)
- `currentStreak(store, habitId, todayKey): number` — see algorithm below
- `bestStreak(store, habitId, todayKey, capDays = 400): number` — full-history scan, see algorithm below
- `todayRoutine(store, todayKey)` → `{ total, completed, items: Array<{ habit, entry? }> }` where total = active habits scheduled today, completed = those with a `done`|`partial` entry today (the "n / m done" summary)
- `weekView(store, todayKey)` — Monday-start calendar week containing today: per active habit a 7-cell row (cells are `"done" | "partial" | "skipped" | "none" | "off"` where `off` = weekday not scheduled, always rendered "—"), plus per-weekday column footers `{ completed, scheduled }` counted across active habits (x/y summary per day)
- `hasHabits(store): boolean` (true if any habits exist, archived or not)
- Storage functions (window only inside): `loadHabitStore(): HabitStore` (guarded `JSON.parse` + `isHabitStore`; any failure → `emptyHabitStore()`), `saveHabitStore(store)` (no-op when `typeof window === "undefined"`)

**Streak algorithm (formal, locked):**
- Only days where `isScheduledOn(habit, day)` participate. Off days never break a streak.
- `currentStreak(store, habitId, todayKey)`:
  1. Let `streak = 0`; start walking from the day *before* today.
  2. If today is scheduled AND today's entry is `done`|`partial`: start `streak = 1` (today counts now).
  3. Walk backward day by day: unscheduled → continue; entry `done`|`partial` → `streak++`; entry `skipped` → continue (neutral: no extend, no break); scheduled day with no entry → stop (break).
  4. Today pending or skipped never breaks the current-streak display (you lose it tomorrow, not today).
- `bestStreak(store, habitId, todayKey, capDays = 400)`: scan offsets 0..capDays-1 from today backward with the same rules (`done`|`partial` → run++, track best; `skipped`/unscheduled → continue; scheduled no-entry → run = 0, except offset 0 (today) which is pending-neutral). Cap the scan at 400 days; a run reaching the cap edge is reported as-is (no extrapolation).

**Tests to write (in `tests/habits.test.mjs`, pattern of `tests/progression.test.mjs`: `node:test` + `node:assert/strict`, importing `../lib/habits.ts` and `../lib/backup.ts` directly):**
- Seed suite: `seedStarterStore` on empty store creates 5 templates; second call is a no-op; store with an existing custom habit never seeds.
- Validation: `isHabitStore` accepts a canonical store; rejects wrong version, non-record log, bad `days` (empty/out-of-range/duplicates), unknown kind, malformed day-log status.
- CRUD: add/update/archive/restore/remove behaviors, including idempotent add and archive-excluded week view.
- Streak suite (exact cases):
  - Mon Tue Wed done, Thu = today pending → current 3, best 3; Thu done → 4/4.
  - Mon done, Tue skipped, Wed done, Thu pending → current 2 (Tue neutral), best 2.
  - Mon done, Tue (past, no entry), Wed done, Thu pending → current 1 (Tue broke), best 1.
  - Weekday-only habit (Mon–Fri): Fri done, Sat/Sun off, Mon(today) done → current 2; Fri done + Mon pending → current 1.
  - Quantity: Mon partial 10/25 → counts as 1; value ≥ target → done; empty/0 never writes an entry (entry removed).
  - Best-streak scan cap: build a run longer than capDays and assert best ≤ capDays.
- Today routine: totals and items correct across scheduled/off days, done/partial/skip/pending.
- Week view: Monday-start columns, per-day cells, x/y footers for a mixed week.
> **Amendment (user-approved):** backup round-trip tests moved to Task 5 (where `lib/backup.ts` changes); Task 1 keeps only pure habit tests.

- [ ] Add `tests/habits.test.mjs` and append it to the `test` script list in `package.json` so `npm test` includes it.
- [ ] Implement `lib/habits.ts` pure core and make the full suite pass with `node --test tests/habits.test.mjs`.
- [ ] Run `npm run lint` and `npm test` — both green (136 + new suite).

### Task 2: Client store glue

**Files:**
- Create: `lib/habitsStore.ts` ("use client")

**Interfaces:**
- Produces: `useHabitsStore(): HabitStore` via the `lib/activity.ts` pattern — module-level snapshot + subscribe + `useSyncExternalStore`; server-safe `EMPTY_SNAPSHOT` fallback; the hook never throws pre-hydration (UI guards with `useClientToday() !== ""`).
- Mutations (each saves via `saveHabitStore`, emits, and exposes a stable API for the views): `createHabit(input: Omit<Habit, "id" | "createdAt" | "archived">)` (stamps `crypto.randomUUID()`, `new Date().toISOString()`, `archived: false`), `editHabit(id, patch)`, `archive(id)`, `restore(id)`, `remove(id)`, `setLog(habitId, dateKey, log | null)`, `seedStarterSet()`.
- `restoreHabits(store: HabitStore | undefined)` — saves `store ?? emptyHabitStore()` and emits; called by backup import paths (mirrors `restoreHighlights`/`restoreQuiz` behavior).
- Baseline subscription must react to `restoreBackupAtomically`-driven writes: `restoreHabits` is always called by the import flow right after restore so the in-memory store and React state refresh.

- [ ] Implement the store mirroring `lib/activity.ts` conventions (subscribe, snapshot, USE_STORE_SYMBOL not needed — match existing architecture).
- [ ] Verify via `npm run build` that the module compiles inside the Next client bundle; no unit tests needed here (logic is in Task 1; wiring is exercised in Task 4 Playwright).

### Task 3: Habits manager route

**Files:**
- Create: `app/habits/page.tsx` (thin page: Metadata `{ title: "Habits" }`, `alternates: { canonical: "/habits/" }`, `robots: { index: false, follow: false }`; renders `<HabitsView />`)
- Create: `components/HabitsView.tsx` (client component)

**Interfaces:**
- Consumes: `useHabitsStore()`, `currentStreak`/`bestStreak`/`weekView`/`todayRoutine` from `lib/habits.ts`, primitives `SectionCard`, `FormField` + `TextInput`/`TextArea`, `EmptyState`, `InlineNotice`, `StatusPill` from `components/workspace/index.ts`, and the workspace style constants (`inputClass`, `primaryButton`, `secondaryButton`).
- Produces: the manager UI with sections, in order:
  1. **Empty state** (no habits at all): `EmptyState` "Build your first habit" with two actions — "Start with the starter set" (seeds 5 templates) and "Build my own" (opens the add form).
  2. **Active habits**: one card per active habit — name, optional link badge, weekday chips S M T W T F S (scheduled days emphasized), current + best streak, a 7-day mini history grid (today + previous 6 days: done/partial/skipped/off/none dots), Edit and Archive buttons.
  3. **This week** (only when habits exist): Monday-start table, one row per active habit, 7 status columns ("—" for off days; partial cells show value/target), column footer `x/y` per weekday = completed/scheduled among active habits.
  4. **Add / edit form** (inline, validated): name (required), kind toggle check/quantity, quantity → unit (optional text) + target (integer ≥ 1), weekday picker (at least one day required), archetype template badge when created from a template, Cancel/Save. Edit preserves logs.
  5. **Archived** (only when any exist): rows with Restore and "Delete forever" (Delete requires a confirm step — `InlineNotice` + explicit button, no `window.confirm`).
- All dates via `lib/dates.ts`. Hydration guard: render nothing meaningful until `useClientToday() !== ""`.
- Route is `noindex` — personal workspace convention.

- [ ] Implement `app/habits/page.tsx` and `components/HabitsView.tsx`; `npm run build` produces the 67th static route.
- [ ] Manual Playwright smoke (served static build on a port other than 3000): empty state → seed starter set → 5 cards appear; create habit with validation; edit; archive/restore; delete forever with confirm; week table renders with correct footers.

### Task 4: Daily ritual module on Today

**Files:**
- Create: `components/RitualPanel.tsx` (client)
- Modify: `components/LevelUpOSWorkspace.tsx` (import + render `<RitualPanel />` right after `<MetricStrip ... />` at line 375, before the `!activeGoal` onboarding block at line 376, today mode only)

**Interfaces:**
- Consumes: `useHabitsStore()`, `useClientToday()`, `todayRoutine()`, `currentStreak()`, `starterTemplates()`, raw-material snapshots for hints — `getFocusSessionsSnapshot()` from `lib/actionTools.ts`, `getQuizSnapshot()`/`getHighlightsSnapshot()`/`getReflectionsSnapshot()` from `lib/activity.ts`, `getPillarsSnapshot()` from `lib/actionTools.ts`, `getProtocolLogsSnapshot()` from `lib/actionTools.ts`, and workspace primitives + style constants.
- Produces the "Daily ritual" module (today mode only):
  - Header "Daily ritual" + summary "n / m done" (m = active habits scheduled today, n = done|partial) + "Edit ritual" link to `/habits/`.
  - One row per scheduled habit: name, streak chip (current streak), control, skip.
  - **Check habit control:** one toggle button → `done` (checkmark). Tapping again removes the entry. Tapping while `skipped` sets `done`.
  - **Quantity habit control:** inline numeric input (pre-filled with today's existing value) + Confirm button. Confirm: value ≥ target → `done`; 0 < value < target → `partial`; empty or 0 → removes the entry. The widget labels the target ("target 25").
  - **Skip:** button toggles `skipped`; tapping again removes the entry. Skipped habit shows a muted "Skipped" state; skip never changes streaks.
  - **Smart-prompt hint row** (below the row, `InlineNotice`/quiet text, informational only — **no auto-write, ever**): a line of advice when evidence exists, per mapping:
    - link `focus` → latest focus session dated today: "Focused for X min already — log it?" with the session minutes.
    - link `pillars` → today's pillar floors all four done: "Pillar floors all checked today."
    - link `protocol` → today's protocol log exists: "Protocol done today."
    - link `quiz` → `getQuizSnapshot()` has an entry with `ts` = today's start-of-day: "Quiz logged (score X/Y)."
    - link `reflect` → a highlight with `ts` today OR a reflection for today exists: "Highlight/reflection saved today."
  - Empty state (no habits at all): card with a hint + button that seeds the starter set (same idempotent seed) and one that links to `/habits/` to build custom.
  - Hydration guard: render nothing until `today !== ""`.

- [ ] Implement `RitualPanel.tsx` and wire it into `LevelUpOSWorkspace.tsx` at the pinned location.
- [ ] Run the UI chain (playwright-ui-tester + web-design-guidelines audit) against the static build: seed `levelup-habits-v1` in localStorage, verify ritual rows appear for scheduled habits only, check toggles update the summary, quantity confirm writes value, skip is neutral, smart-prompt hint appears when focus/quiz/reflection evidence is seeded, empty state seeds and links correctly.

### Task 5: Backup integration

**Files:**
- Modify: `lib/backup.ts` — add optional `habits?: HabitStore` to `BackupState`; include it in `buildBackup` output when defined; extend `validateBackup` **leniently** (habits missing or invalid → `ok: true`, `habits: undefined`, no error added; deliberate asymmetry vs other chunks, per spec "missing/invalid = empty store"); extend `entriesForBackup` to **always** emit `"levelup-habits-v1"` (default `JSON.stringify(emptyHabitStore())` when `data.habits` is undefined). `restoreBackupAtomically` needs no change.
- Modify: `components/BackupPanel.tsx` —
  - line 42 export assembly: add `habits: loadHabitStore()` to the assembled `BackupState` (unconditional — small, faithful round-trip; "optional" only refers to pre-feature files).
  - after line 75 (import restore block): `if (data.habits !== undefined) restoreHabits(data.habits)` — and import `restoreHabits` from `@/lib/habitsStore`, `loadHabitStore` from `@/lib/habits`.
- Modify: `components/ProgressView.tsx` — same two edits in its export/import flow (assembly near line 83, restore near lines 107/113).
- No change to restore semantics: an old backup without the chunk lands with `levelup-habits-v1` = empty store (fresh start for habits), and the app then shows the empty state.
- **Backup tests (moved here from Task 1 by user decision; live in `tests/habits.test.mjs`, import `lib/backup.ts`):** `buildBackup` with habits → `validateBackup` ok → `data.habits` deep-equals input; `restoreBackupAtomically(data, mockStorage)` with a fake storage map writes `levelup-habits-v1`; legacy file (no habits chunk) → `validateBackup` still `ok: true`, habits undefined; same legacy file restored via mock storage → the map contains `levelup-habits-v1` = empty store JSON (missing chunk → empty store, no error). Malformed habits chunk → lenient: `ok: true` with `habits` undefined and no error (deliberate asymmetry vs other chunks, per spec).

- [ ] Implement the `lib/backup.ts` changes; round-trip + legacy-file + malformed-chunk cases covered by the backup tests above.
- [ ] Update `BackupPanel.tsx` and `ProgressView.tsx`; verify export JSON now carries `levelup-habits-v1` and import restores habit state (Playwright: export → wipe the key → import file → habit rows return).

### Task 6: Full verification gate and commit plan

**Files:**
- None new (cleanup pass only).

- [ ] Baseline guards: `git status` clean, `.wakatime.cfg` untouched, port-3000 dev server untouched, no stray temp scripts in repo root.
- [ ] `npm run lint` → 0 errors. `npm run build` → 67/67 static routes. `npm test` → 136 existing + habits suite, all green.
- [ ] Playwright final pass on a static build served on a non-3000 port: `/today/` ritual flows (check/skip/quantity/hints/empty-state) + `/habits/` flows (seed, CRUD, week table, archive/delete) + backup export/import round-trip.
- [ ] Final diff review against the spec: no scope creep, no changes outside the files listed in this plan.
- [ ] Commits (each requires explicit "approved, continue", conventional, no emojis):
  > **Already applied (user-approved pre-flight):** `fix(lifeos): clear pre-existing lint errors` — e48a26a, 8 pre-existing eslint issues across `LifeOSOnboarding.tsx`, `Nav.tsx`, `lib/progression.ts`, `tests/mission.test.mjs`; baseline is now lint-clean.
  1. `feat(lifeos): habit engine core with streaks and tests` — Task 1 + package.json test list.
  2. `feat(lifeos): habits client store` — Task 2.
  3. `feat(lifeos): habits manager page` — Task 3.
  4. `feat(lifeos): daily ritual module on today` — Task 4.
  5. `feat(lifeos): habits backup integration` — Task 5.
- [ ] Report results with evidence (build/lint/test/Playwright output) and stop — Phase 1 done, Phase 2 (progression polish) discussion is next.

## Definition of Done

- [ ] `/habits/` route exists (noindex, canonical `/habits/`), builds as static route 67/67.
- [ ] Daily ritual module renders in Today mode only, shows scheduled-habits-only rows, n/m summary, working check/skip/quantity controls, smart-prompt hints that never auto-write.
- [ ] Streaks follow the locked algorithm (scheduled days only, partial = credit, skip = neutral, today pending never breaks display, best = 400-day capped scan).
- [ ] Template seeding idempotent; empty state seeds or links properly.
- [ ] Backups round-trip; legacy files restore with empty habit store and no errors; `levelup-habits-v1` never collides with other keys.
- [ ] `npm run lint`, `npm run build`, `npm test` all green; Playwright flows verified; tree clean; no push.

## Out of Scope (later phases, explicitly not here)

- Companion ritual-complete events, habit XP/badges, `/progress/` habit charts, onboarding auto-integration, auto-completion without user confirm, server sync, and any change to the primary navigation (entry point is the ritual module + its Edit link).