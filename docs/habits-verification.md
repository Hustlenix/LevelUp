# Habits and daily ritual

Implemented October 1, 2026. Local-first only; no server sync, automatic habit completion, or habit XP.

## Working flows

- `/habits/`: opt-in starter set, custom check/measured habits, weekday schedules, validated editor, archive/restore, explicit permanent deletion, rolling history, and Monday-start week totals.
- `/today/#daily-ritual`: only scheduled active habits, check/undo, measured partial/full progress, zero-to-clear, skip/undo, and scheduled-day streaks.
- Focus, pillar, protocol, quiz, highlight, and review evidence can suggest logging. Suggestions never write a habit log themselves. Untimestamped legacy reflections cannot prove activity today.
- Both backup surfaces include habits. Valid habit data round-trips; missing or malformed optional habit data restores an empty habit store. Multi-key restore rollback includes habits.
- Open tabs receive valid habit storage changes. Simultaneous edits remain last-write-wins, not collaborative merging.
- Local dates refresh on tab focus, visibility changes, and a minute timer. A new day's measured input starts fresh.
- Quota/storage errors show a warning. Unsaved habits stay in memory and can be exported before the tab is refreshed or closed. There is no cloud recovery.

## Verification

All browser writes use isolated Playwright contexts, not the user's browser records.

```text
npm run lint
npx next build
node --test tests/*.test.mjs
node scripts/serve-static.mjs out 3113
node verify-habits.mjs http://localhost:3113
node verify-design.mjs http://localhost:3113
PLAYWRIGHT_BASE_URL=http://localhost:3113 node verify-release.mjs
```

Commands were invoked through RTK. The direct Next build and test invocation preserve the existing generated content files rather than rebuilding randomized quiz data.

Results: 177 unit tests passed; 67 static pages generated; lint passed. The habits browser suite covers logging/reload, negative-value rejection, optional evidence, edit-with-history-preservation, archive/restore/delete, backup round-trip and legacy reset, empty/all-archived states, cross-tab updates, date rollover, quota warning and recovery export, and 16 layout checks at 320/375/768/1440px in light/dark themes. The existing 40-check design suite and 54-route release suite also passed.

Existing unfinished habit changes were preserved and completed in place. No commit, push, or deployment was performed in this pass.
