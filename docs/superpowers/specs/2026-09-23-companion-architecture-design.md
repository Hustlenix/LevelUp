# Super Star — Living Companion Architecture Design

> Phase 2 of the Super Star transformation (2026-09-23). Companion working name: **Milo**.
> Extends `docs/PRODUCT-SPEC-levelup-os.md` (§42 data architecture, §43 backup, §45 AI-optional, §54 a11y, §63 quality bar). Does not replace any existing spec.

## 1. Goal

Turn LevelUp from a personal-development operating system into one with a **persistent living companion** whose behaviour and tiny world are driven by the user's real actions. Success is defined by feel:

- ✅ **Success:** "This creature actually lives inside LevelUp, and my actions change its life and its room."
- ❌ **Fail:** "Level Up, but now there is a pet."

Milo is not a cosmetic pet. It is a **readout of the user's own system** — a deterministic mirror of progress, focus, recovery, and absence, rendered as a small life.

## 2. Non-negotiables (binding)

1. **Real deterministic internal state**, persisted locally. Energy, mood, curiosity, focus, knowledge, confidence, relationship — all derived from real user events, never random at read time.
2. **No dark-pattern tamagotchi.** No guilt, no starving, no sickness-for-neglect, no dying. Absence → calm reunion: "lived its own life" while the user was away.
3. **Deterministic core.** Behaviour engine is a pure step function: `(state, event, worldClock) → (nextState, reactions)`. No `Math.random()` in the core; all randomness is injected via a seeded PRNG (from identity seed + date + event id) so the demo and tests are reproducible.
4. **No API-per-click. No LLM in the reaction loop.** AI (Ollama/WebGPU) is optional and only for dialogue text; the core works fully without AI. Animation/behaviour choices are hand-authored rules, not model outputs.
5. **Hand-designed art.** Consistent, calm, a little charming; no glossy AI mascot, no AI-slop gradients.
6. **Settings and a11y.** Companion ON/OFF; Motion Full/Reduced/Off; Dialogue Normal/Minimal/Off; sound; respects `prefers-reduced-motion`; never obstructs controls; everything reachable without the companion. Companion is an enhancement — the OS must be fully usable with it off.
7. **Mobile-first.** The companion must work on a phone: small footprint, no horizontal overflow, tap-target sized, its own space vs. the bottom nav (which is fixed, `z-40`, safe-area aware).
8. **Offline-first.** Everything local. Backup must include companion state.
9. **Schema-versioned + migrations**, following the existing `lib/os` pattern (migrate → validate → persist).

## 3. Event pipeline (the spine)

Two existing clean event sources were confirmed in the audit. The companion adapter consumes both and normalises into a **companion event journal**.

```
┌─ OS store (levelup-os-state-v1) ─┐     ┌─ legacy chokepoints ─────────────┐
│ completionEvents journal         │     │ markComplete (lib/progress)      │
│ session-completed                │     │ addHighlight (lib/activity)      │
│ task-completed                   │     │ saveQuizResult (lib/activity)    │
│ goal-progressed                  │     │ saveReflection (lib/activity)    │
│ session-interrupted              │     │ recordActivity (lib/activity)    │
│ recovery-started                 │     └──────────────┬───────────────────┘
│ review-completed                 │                    │
└──────────────┬──────────────────┘                    │
               │ (subscribe: read journal tail         │ (instrument: 1-line
               │  since last ingested index)           │  append, no behaviour change)
               ▼                                       ▼
        ┌───────────────────────────────────────────────────┐
        │  lib/companion/events.ts  (adapter + journal)     │
        │  canonical companion events, deduped by id,       │
        │  stored in levelup-companion-v1                   │
        └───────────────────────┬───────────────────────────┘
                                ▼
        ┌───────────────────────────────────────────────────┐
        │  lib/companion/reducer.ts  (pure step function)   │
        │  → derived traits → behaviour priorities          │
        │  → reactions (dialogue lines, poses, world items) │
        └───────────────────────┬───────────────────────────┘
                                ▼
        ┌───────────────────────────────────────────────────┐
        │  components/companion/*  (viewport, scene, art)   │
        │  + animation scheduler (motion-gated)             │
        │  + debug view                                     │
        └───────────────────────────────────────────────────┘
```

### 3.1 Canonical companion events

| Event | Source | Notes |
|---|---|---|
| `app_opened` | adapter (visibility) | once per day first open |
| `returned_after_absence` | adapter (lastSeenAt diff) | triggers "lived its own life" simulation |
| `chapter_started` | chapter page | viewport enter |
| `chapter_completed` | `markComplete(chapter-slug)` | |
| `quiz_passed` / `quiz_failed` | `saveQuizResult` | pass = end-state ≥ threshold (already graded) |
| `highlight_created` | `addHighlight` | |
| `reflection_saved` | `saveReflection` | |
| `focus_started` / `focus_completed` / `focus_interrupted` | OS `session/start`, `session/complete`, `session/interrupt` | plus pause/recover → `session_recovered` |
| `goal_created` / `goal_progressed` / `goal_completed` | OS `goal/add`, `goal/progress`, `roadmap/milestone` completion | goal completed = current ≥ target |
| `protocol_started` / `protocol_completed` | `lib/actionTools.ts` recordActivity sites | protocol log events |
| `streak_continued` / `streak_broken` | adapter (diff on streak store read) | streak is already computed; adapter emits on change |
| `study_session_*` | `lib/study` / study mode | AI study sessions |
| `roadmap_milestone` | OS milestone complete | |
| `day_completed` (evening review) | OS `review/complete` | |
| `interaction_*` | companion itself (tap/poke/pat) | not from OS, but journaled for state |

## 4. Companion domain model (`lib/companion/types.ts`)

Versioned, local-only:

```ts
const COMPANION_KEY = "levelup-companion-v1";
const COMPANION_SCHEMA_VERSION = 1;
```

**State shape** (~conceptual; exact types in code):

```
CompanionState {
  schemaVersion
  identity { name ("Milo"), bornAt, seed }
  traits {             // 0..100, derived, updated by reducer
    energy, mood, curiosity, focus, knowledge, confidence, relationship
  }
  currentActivity       // "idle" | "reading" | "focusing" | "recovering" | "sleeping" | "away"
  lastSeenAt
  lastWakeAt
  room {                // persistent tiny world
    variant             // "basic" | "self" | "wealth" | "health" | "love" | "full"
    items: UnlockItem[] // { id, kind, unlockedAt, sourceEventId }
  }
  journal: CompanionEventRef[]   // ring buffer (last N, e.g. 64), for reactions + debug
  stats { totalFocusMinutes, sessionsCompleted, chaptersCompleted, streaksKept, ... }
  flags { metCompanion (first-run intro), lastMilestoneReactionId }
}
```

## 5. Behaviour engine (`lib/companion/behaviour.ts`)

Pure, deterministic, testable:

```
step(state, event, ctx { now, timeOfDayBucket, prng, settings }) -> { state, reactions[] }
reactions: { kind: "dialogue"|"pose"|"room"|"emote", text?, poseId?, itemId?, cooldownKey }
```

**Priorities (per tick):** 1) milestone/first-time reactions (celebratory but calm), 2) event-driven reactions, 3) absence-reunion, 4) time-of-day maintenance (wake/sleep), 5) ambient idle.

**Trait deltas are explicit tables** (event kind → per-trait delta), e.g.:

| Event | energy | mood | curiosity | focus | knowledge | confidence | relationship |
|---|---|---|---|---|---|---|---|
| focus_completed | -6 | +3 | +2 | +4 | +1 | +2 | +1 |
| focus_interrupted | -2 | -1 | 0 | -2 | 0 | -1 | 0 |
| chapter_completed | -3 | +4 | +3 | +3 | +5 | +3 | +2 |
| quiz_failed | -2 | -1 | +1 | 0 | 0 | -1 | 0 |
| streak_broken | 0 | -2 | 0 | 0 | 0 | -1 | -1 |
| returned_after_absence | +2 | +3 | +2 | 0 | +1 | 0 | +1 (reunion warmth) |

**Cooldowns:** identical events within a window (e.g. 5 min) compress into one reaction; journal dedupe by event id already guarantees idempotent replay. Prevent spam; batch by "lived its own life" summary.

**Absence simulation (no guilt):** on `returned_after_absence` with absence > some hours, the engine deterministically generates 1–3 short "while you were away" lines derived from what *did* happen during absence (completed tasks, streak status, nothing at all → reads/walked/practiced by itself). Never negative, never shaming.

**Sleep:** night hours (local) → `sleeping` pose, no ambient animations, no dialogue except a soft wake greeting on return. `prefers-reduced-motion` or Motion=Off → reactions emit state only; no animated poses; dialogue still allowed if enabled.

## 6. The tiny world (unlock rules — deterministic, threshold-based)

Unlocks are pure functions of `stats`, checked after every event step:

| Unlock | Trigger (threshold) | World effect |
|---|---|---|
| First book | first chapter completed | book appears on desk |
| Reading lamp | 5 focus sessions completed | lamp on desk |
| Workout mat | first health protocol completed | mat in corner |
| Pillar shelf (self) | all Self chapters complete | room variant → study nook (warm wall, shelf) |
| Pillar desk (wealth) | all Wealth chapters complete | desk upgrade, ledger |
| Pillar window (health) | all Health chapters complete | bright window corner, plant |
| Pillar nook (love) | all Love chapters complete | framed photo, second chair |
| Full room | all 4 pillars complete | room fully evolved (visible transformation) |
| Corkboard | 10 highlights | notes on wall |
| Trophy shelf | first roadmap milestone | small trophies |
| Window to outside | 90-day roadmap complete | window opens to daylight |

Rules: counts come from `stats`; unlocks auto-apply; each unlock emits one calm reaction (pose + one line). No unlock spam — one at a time, in order.

## 7. Rendering (`components/companion/*`)

- **Viewport:** fixed-position, bottom corner (desktop) / above bottom-nav (mobile, safe-area aware), `pointer-events` only on its own bounds, `aria-live="polite"` for dialogue, `role="complementary"`, focusable but not in the primary tab flow when de-emphasised. Never covers controls; minimal footprint; hide-to-minimize affordance on mobile.
- **Scene:** hand-built SVG/CSS art — one room, a small creature (simple geometric body, 3–4 pose states), props layer rendered from `room.items`. Static, crisp, on-theme with the existing editorial visual language (paper/ink/gold tokens from `app/globals.css`).
- **Animation scheduler:** motion (already in repo) throttled; poses are discrete, short, loop-safe; everything gated by Motion=Full/Reduced/Off.
- **Interaction:** tap/click → gentle reaction (emote + occasional line), bounded cooldown; no interaction required for progress. Companion is present, not needy.
- **Debug view** (`/settings` or dev-only route): live `CompanionState` JSON, last N journal events with sources, trait graph, unlock log. Honest about what drives it.

## 8. Persistence & backup

- New store follows the existing `lib/os` pattern: `migrate()` (v1 → future), `validate()`, `restore()`, `useSyncExternalStore`-style subscription, storage-event safe.
- **Backup integration** (`lib/backup.ts`): add `companion: CompanionState` to `BackupState`, include in `entriesForBackup`/restore, validate before import (existing pattern).
- Journal is bounded (ring buffer) so backup stays small.

## 9. Demo mode (Phase 5)

Deterministic ~60-second scripted sequence (seeded): app opens → focus session → chapter complete → quiz pass → streak broken then recovered → absence → reunion → one unlock. Feeds scripted events through the real reducer; renders into a page for the reviewer trade — and the same script doubles as an integration test.

## 10. Integration points (audit conclusions)

- **KEEP / don't touch:** `lib/os` store (already the event journal), content system, study tools, AI layer (WebGPU constraints stay), gamification/XP (subordinate), backup shape, `/today`, `/chapters`, `/goals`, `/progress`, `/focus`, `/review`, `/study`, `/protocols`, `/roadmap`.
- **REFACTOR (safe renames):** `components/ChapterCompanion.tsx` → rename to avoid colliding with the new companion concept (it's an editorial reading guide; new companion gets the name).
- **HIDE/REMOVE:** fewer top-level nav entries (audit: MORE_ITEMS 14-entry dropdown is clutter). `/dashboard` is a duplicate of `/today` (renders `LevelUpOSWorkspace mode="today"`) → route collapse/HIDE-REMOVE target. `/audit`, `/research`, `/quotes`, `/playbook`-as-nav reduce noise; keep functionality reachable. (Implemented in Phase 6 — polish — not in the companion core.)
- **Mount point:** companion provider in `app/layout.tsx` inside the existing provider tree; safe zones center on the fixed mobile bottom nav (`z-40`) and desktop header so nothing is ever covered.

## 11. Testing strategy

- `tests/companion.test.mjs`: reducer determinism (same input → same output), trait deltas, absence simulation (0h/8h/7d), unlock thresholds, cooldown/batch, migration v0→v1, backup roundtrip, settings gates (motion off → no pose reactions; companion off → no state writes; AI absent → core still runs).
- Reuse existing gate: `rtk lint` → `rtk tsc --noEmit` → `rtk test` → `npm run build`; Playwright headless flow for the visible companion + mobile viewport.

## 12. Scope guardrails (from the brief)

Not building: payments, auth, cloud sync, social, chatbots, AI-mascot dialogue as the core experience, symbolic "life score" hacks. The companion must never be required to use the OS, and never punish the user.

## 13. Delivery phases

- **Phase 3 Foundation:** event adapter + journal + state schema + reducer + behaviour engine + persistence + backup + settings keys. (No UI yet — unit-tested core.)
- **Phase 4 Magic:** viewport/scene/character art, props/unlocks, focus & chapter-aware behaviour surfaces, milestone reactions, debug view.
- **Phase 5 Demo:** seeded reviewer demo page.
- **Phase 6 Polish:** rename `ChapterCompanion`, nav declutter + `/dashboard` collapse, theme/motion/settings polish, a11y pass.
- **Phase 7 Prove:** full gate + Playwright + mobile + persistence + reduced-motion verification.
- **Phase 8 Story:** README, architecture diagram, devlogs, screenshots, ship description.