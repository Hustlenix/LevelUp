# LEVEL UP

### Improve your life. Build a world alongside you.

**Level Up is an offline-first self-improvement operating system with a persistent living companion. Reading, studying, focusing, completing goals, and applying protocols change how the companion behaves and how its tiny world develops — entirely on your device.**

**Live:** https://hustlenix.github.io/LevelUp/

---

## What is Level Up?

Level Up began as a way to turn a 20-hour self-development video into something more useful than another summary. The source became a 28-chapter manual with evidence-graded claims, protocols, search, quizzes, highlights, and a 90-day roadmap.

Then the project grew into a Today-first operating system: goals become roadmaps, milestones, tasks, and bounded focus sessions; reviews keep a local record of what actually happened; Study Mode adds student workflows; progress, streaks, badges, and a portfolio make the record visible.

It worked, but it still felt like software.

This version asks a different question:

> What if progress did not only change a chart? What if it changed a place that was living beside you?

That is the Living Companion Engine.

## The memorable part

Milo is not a chatbot pasted into the corner of the app.

Milo has persistent local state, an event journal, traits, activity, cooldowns, room state, and deterministic behaviour. Real Level Up actions feed that system.

Start a focus block and Milo works beside you.

Open a Health chapter and the behaviour can shift toward stretching. Open Wealth and the room context can shift toward a ledger. Complete real progress and objects appear in the room.

Leave for a while and nothing bad happens. There is no starvation, sickness, guilt loop, or streak punishment. On return, the system simply continues.

## How it works

```text
LEVEL UP ACTIONS
       |
       v
 DOMAIN EVENTS
       |
       +-------------------+
       |                   |
       v                   v
OS COMPLETION JOURNAL   PENDING EVENT QUEUE
       |                   |
       +---------+---------+
                 |
                 v
          COMPANION PUMP
                 |
                 v
       PURE STATE REDUCER
                 |
       +---------+----------+
       |         |          |
       v         v          v
    TRAITS    UNLOCKS   EVENT JOURNAL
       |         |          |
       +---------+----------+
                 |
                 v
        BEHAVIOUR SELECTOR
                 |
       +---------+----------+
       |         |          |
       v         v          v
  ANIMATION   DIALOGUE   WORLD STATE
```

The interesting engineering problem is not drawing a mascot. It is keeping one persistent creature aware of actions across an offline-first app with multiple local stores, without requiring a backend.

See **[docs/COMPANION-ENGINE.md](docs/COMPANION-ENGINE.md)** for the architecture and testing contract.

## Companion world

The room is a second representation of the same progress data used elsewhere in Level Up.

Current examples include:

- first completed chapter -> book
- five completed focus sessions -> desk lamp
- ten highlights -> corkboard
- first roadmap milestone -> trophy shelf
- completed pillars -> larger room changes
- completed 90-day road -> expanded window view

Unlocks are threshold-based, persistent, and replay-safe. Refreshing the app cannot grant the same object twice.

The companion can be turned off completely. Motion supports **Full / Reduced / Off**, dialogue supports **Normal / Minimal / Off**, and interaction and sound have independent controls. A system `prefers-reduced-motion` request is respected automatically.

## Reviewer demo

A reviewer should not need seven days of personal data to understand the system.

Open the Companion Space and choose **Experience reviewer demo**. The demo runs the production reducer against a disposable deterministic fixture:

1. start focus
2. complete focus
3. open a Health chapter
4. complete the chapter
5. reach a roadmap milestone

The saved companion is not overwritten. The Engine view exposes current behaviour, traits, context, room state, and recent domain events.

## The rest of Level Up

The companion sits on top of a substantial product rather than replacing it:

- 28 self-development chapters across Self, Wealth, Health, and Love
- evidence grades and a research audit
- 13 named protocols
- Today-first workflow
- goals, roadmaps, milestones, tasks, and focus sessions
- daily and weekly reviews
- Study Mode and student planning tools
- full-text search with MiniSearch
- chapter quizzes and reflections
- persistent highlights and bookmarks
- XP, badges, streaks, and progress views
- portfolio and roadmap views
- local backup/restore with validation and rollback journal
- offline/static-first deployment
- optional local model features with deterministic fallbacks
- devlogs and release verification scripts

## Local-first by design

Core Level Up works without an account, backend, or cloud AI.

Progress and companion memory live in browser storage. Backup/restore includes companion state when present. The companion engine never needs an LLM to choose an animation or decide what an event means.

Optional local AI functionality is separate. See **[docs/AI-LOCAL-OLLAMA.md](docs/AI-LOCAL-OLLAMA.md)**.

When a Google Analytics measurement ID is supplied at build time, Level Up can send only the explicitly whitelisted non-content events in `lib/analytics.ts`. Typed notes, reflections, highlight text, companion traits, companion journal entries, room state, and dialogue are not analytics payloads. Without a measurement ID, analytics is a no-op.

## Companion design rules

The project deliberately avoids Tamagotchi-style pressure.

Milo does **not** become sick, hungry, sad, or degraded because the user took a break. A failed quiz is calibration, not punishment. A broken streak does not create a guilt notification. The creature can live quietly while the user is away.

The product must remain useful with the companion disabled.

## Technical stack

- Next.js 16 static export
- React 19
- TypeScript
- Tailwind CSS v4
- `useSyncExternalStore` local repositories
- MiniSearch
- Node `node:sqlite` content build pipeline
- Playwright release checks
- GitHub Actions + GitHub Pages
- optional local Ollama / browser model experiments where supported

No application server is required for the core experience.

## Persistence model

The main app and companion use versioned local schemas.

The companion layer adds:

- validated companion state
- bounded event journal
- pending event queue
- adapter cursors
- deterministic seed
- room unlock ownership
- cooldown state
- settings migration

The reducer is replay-safe by event ID. OS completion events are consumed exactly once. Existing backups remain compatible because companion data is additive and validated before restore.

## Performance approach

The companion is intentionally lightweight:

- CSS/SVG character art rather than a large animation runtime
- React renders state changes, not every animation frame
- CSS owns ambient motion
- event pumps write only when events exist
- bounded event journals and pending queues
- deterministic behaviour instead of continuous model calls
- no remote character assets
- reduced-motion path for lower animation cost and accessibility

## Development story

Level Up started as a book built from a long video transcript.

The next version became an operating system with Today, goals, focus, reviews, study workflows, and local evidence of progress.

But useful software can still be emotionally flat.

The Living Companion Engine is an attempt to make the same progress data tangible. Reading, studying, focusing, completing goals, and applying protocols now alter a persistent local simulation. The visible character is only the surface; underneath it is a domain-event adapter, journal, pure reducer, unlock engine, behaviour selector, persistence layer, and deterministic reviewer fixture.

That is the part of the project meant to make another hacker ask:

> How did one creature stay aware of the whole app without a backend?

## Run locally

```bash
git clone https://github.com/Hustlenix/LevelUp.git
cd LevelUp
npm install
npm run dev
```

Production preview:

```bash
npm ci
npm run build
npm start
```

Then open `http://localhost:3000`.

The public deployment uses the case-sensitive GitHub Pages base path:

```text
/LevelUp
```

Do not put GitHub tokens, API secrets, or private keys in source files, frontend environment variables, or build output.

## Validate before shipping

```bash
npm run lint
npm test
npm run build
```

For production-route and responsive checks:

```bash
npx playwright install chromium
node verify-release.mjs
```

To run the release checks against the public deployment:

```bash
PLAYWRIGHT_BASE_URL=https://hustlenix.github.io/LevelUp node verify-release.mjs
```

## Source

**Repository:** https://github.com/Hustlenix/LevelUp

The goal is not to maximize feature count.

The goal is for Level Up to feel like a coherent, authored system whose progress is visible in two forms: the record you can inspect and the world you can watch change.
