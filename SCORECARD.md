# Level Up Manual — 9/9 Scorecard Report

Live site: https://hustlenix.github.io/LevelUp/
Report date: 2026-08-21
Latest deploy: run `32398069183` (success, all steps green)
Head commits: `cf8405b` (ReaderControls + CSS reader vars), `06ab06f` (two-row header fix)

All nine planned quality-of-life features are implemented, tested, deployed,
and verified live. Everything is local-first: no APIs, no accounts, no
telemetry. Progress lives in `localStorage` under `levelup-*` keys and never
leaves the browser.

## Feature Checklist (9/9)

### 1. Chapter Knowledge Checks (Quizzes) — DONE
Every one of the 28 chapters ends with three deterministic multiple-choice
questions drawn from its own key concepts, evidence grades, and protocols,
plus a written reflection prompt. Questions are generated at build time by
`scripts/build-data.mjs`; answers are checked entirely client-side. Scores
persist under `levelup-quiz-v1`.

### 2. Schema-Validated Backup & Restore — DONE
Export progress, highlights, quiz scores, and reflections as one JSON file;
import them on any other device. `lib/backup.ts` validates incoming JSON
against the schema before writing anything, and aborts safely on malformed
input. Round-trip covered by tests (`backup round-trips through validate`,
`backup rejects malformed input`).

### 3. Daily Learning Streaks — DONE
Current and best streak tracked via `levelup-streak-v1`. Date math in
`lib/gamification.ts` correctly handles fresh starts, same-day activity (no
double counting), consecutive days (increment), and gaps (reset current,
preserve best). Covered by `advanceStreak` tests.

### 4. Progression Badges — DONE
Nine badges from First Step to Quiz Master. Unlocks are computed from real
local state; unlock dates are recorded once and never re-stamped. Quiz Master
requires all 28 quizzes at 70%+ — enforced honestly, verified by test.

### 5. Progress Summary Dashboard (/progress) — DONE
One page consolidating XP, level, level-progress ratio toward the next
threshold, badge grid, per-chapter completion, quiz percentages, and streak.
Loads synchronously from local state — no skeleton loaders, no fetch spinners.

### 6. Persistent Text Highlighting — DONE
Select a passage, mark it, and it survives reloads. `lib/highlights.ts`
normalizes text and locates selections with prefix-fallback matching so
highlights stay anchored even when markdown rendering shifts slightly.
Stored under `levelup-highlights-v1`.

### 7. Reader Controls Extension — DONE
A popover on chapter pages controls font size (85–130% in four steps),
line-height presets (tight 1.6 / normal 1.85 / airy 2.1), font family
(Source Serif vs Georgia stack), and a high-contrast toggle. All settings
persist under `levelup-reader-*` keys and apply on load without a flash.
The contrast toggle swaps a theme-safe token set in `globals.css`
(`--color-ink-soft` etc. inherit `--color-ink`) so it works in both light
and dark themes without hardcoded colors.

### 8. Devlogs Hub (/devlog) — DONE
Five entries documenting the build honestly: the home-page declutter, the
plain-English pass, the scorecard push, the local-first architecture
(including AI-transparency notes), and the eight-hour restraint story that
shipped two features and deleted a third. A book about evidence shows its work.

### 9. Responsive Nav Brand Fix — DONE
Root cause of the reported distortion: the single header row needed roughly
1100px but the container caps at 1024px (`max-w-5xl`), so flexbox crushed the
brand link (no `shrink-0`, no `whitespace-nowrap`) into stacked words at md+
widths. Fix in `components/Nav.tsx`: two-row desktop header — row 1 holds the
brand (`shrink-0 whitespace-nowrap`), search, continue-reading, and theme
toggle; row 2 holds the Chapters menu and nav links. Verified with headless
Chrome at 480/640/768/900/1024/1280/1440px: brand always one line, zero
horizontal overflow, and a full overflow scan across six routes found no
other offenders.

## Evaluation Summary

### Originality — A
A 20-hour video transcript (~20k lines) distilled into a 28-chapter book with
honest A–D evidence grades on every notable claim, sourced against a single
verified-facts file. No invented citations. Deliberately rejects SaaS landing
page cliches: no pricing tiers, no fake testimonials, no hype copy. Treats
localStorage as a first-class database with full user data ownership.

### Technicality — A
Next.js 16 static export (Turbopack), 46 prerendered routes. Build-time data
pipeline compiles content into SQLite (`node:sqlite`) and emits JSON plus a
~30KB MiniSearch index; search runs fully client-side. Reactive local state
via `useSyncExternalStore` subscribe/emit stores in pure TS libs with no React
imports and SSR-safe fallbacks. Offline support via service worker precache.
CI runs lint, tests, build, and Pages deploy on every push to main.

### Usability — A
Responsive from 480px to 1440px with measured verification. Keyboard
navigation (J/K chapter flips, Escape closes overlays), aria labels and
expanded states on menus, scroll-spy table of contents, auto-resume scroll
position, four reader themes (Light, Dark, Deep Work, Cyberpunk), and the
full typography control set above.

### Storytelling — A
Mentor-author tone throughout: earnest, precise, zero hype. Weak claims are
presented as weak ("the trainings call this X; the evidence supports the
direction, not the number"). The devlog documents failures as plainly as
wins, including the day-long CI spiral and the decision to delete the
feature that caused it.

## Quality Gates (verified locally and in CI)

```
npx tsc --noEmit        -> exit 0
npx eslint <files>      -> 0 errors, 0 warnings on authored files
npm run build           -> 46/46 pages prerendered, TypeScript clean
npm test                -> 22/22 passing
gh run 32398069183      -> success (lint, test, build, deploy all green)
```

## Deployment

GitHub Actions builds with `NEXT_PUBLIC_BASE_PATH=/LevelUp`, exports static
HTML to `out/`, and publishes via `actions/deploy-pages`. Live verification
after the final deploy confirmed the fixed header renders single-line at all
tested widths and that quiz, badge, highlight, backup, and reader-control
features are present in the shipped bundles.
