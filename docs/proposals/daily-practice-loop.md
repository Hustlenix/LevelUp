# Proposal — The Daily Practice Loop

**Status:** DRAFT — review before deciding to build.
**Scope guard:** no accounts, no sync, no payments. Everything below already exists in the app; this proposal only reshapes how the daily routine is presented and ordered.
**Related:** `docs/IMPL-reader-first-frontdoor.md` (front door), `docs/DESIGN-reader-first-frontdoor.md` (design brief).

---

## 0. Why this proposal exists

The app already contains every piece of a daily practice system: a 4-pillar non-zero floor tracker, focus sprints, urge-delay protocols, streaks, XP, levels, badges, and a 28-day consistency matrix. What it does not have is a single, named **loop** that ties them together — a fixed daily sequence the reader can memorize and run without opening the manual.

This proposal adds one thing only: a **named, ordered daily loop** (Step 1) plus copy changes in the existing dashboard and progress pages that make that loop legible (Steps 2–4). No new storage, no new features.

---

## 1. The loop (the core of the proposal)

A single daily sequence, named **"The Steady Loop"**, presented top-to-bottom on the dashboard's Today view in exactly this order:

1. **Set the day** (calibration, Protocol 2.3) — pick today's four floors, one per pillar.
2. **Hit the floors** (4-pillar non-zero floor section) — minimums that make the day non-zero.
3. **Block one focus sprint** (Protocol 2.6) — one guided sprint, scheduled.
4. **Pause the urge once** (Protocol 2.8) — one urge-delay when the pull comes; log it.
5. **Close the loop** (End-of-day) — one tap in the consistency matrix before bed.

Rationale: each step is the *smallest* daily action from the existing protocols. The loop is complete in roughly 20 minutes and requires zero willpower decisions — the order is fixed.

**Why these five and not more:** every other feature (XP, levels, badges, streaks, quotes) is reward machinery around the same five actions. Naming the loop gives the rewards something to point at.

---

## 2. Copy changes (already applied in this phase)

The following semantic/copy hardening is **done** (part of the accessibility pass, not gated on this proposal):

- Dashboard Today view: "Focus Soundscape & Sprints" and "Instant Action Protocols" section titles promoted `span` → `h2` (they were visually headings but not navigable as such). Zero visual change — identical classes.
- Progress page: "Level & badges" and "Backup & restore" promoted `p` → `h2` for the same reason.
- Kickers that sit *above* real headings ("Daily Baseline Enforcer", "Evidence Curriculum") intentionally stay as spans.

**Known tradeoff:** the chapter list on the Progress page has no heading of its own (it follows the page h1 directly). Adding one would mean new visible copy; left as-is to avoid scope creep. Flag for a future pass.

---

## 3. What "The Steady Loop" would touch (if approved)

| File | Change | Risk |
|------|--------|------|
| `components/HomepageDashboard.tsx` | Rename Today-view section titles to Step 1–5 of the loop; add a one-line loop label above them | Low — copy and order only, no logic |
| `components/DailyActionHub.tsx` | Reorder the top action chips to match Step 1–5 | Low — presentational |
| `components/ProgressView.tsx` | Subtitle copy: one line naming the loop ("The Steady Loop: five moves, every day") | Low — copy only |

Storage keys (unchanged, frozen): `levelup-pillar-floors-v1`, `levelup-daily-calibration-v1`, `levelup-focus-sessions-v1`, `levelup-urge-pauses-v1`, `levelup-streak-v1`, `levelup-progress-v1`.

---

## 4. What this does NOT do (boundaries)

- No new database keys, no migrations, no backend.
- No new protocols or content — only naming and ordering of what exists.
- No change to `/`, `/action/`, `/protocols/`, or any reading experience.
- Does not rename any file or route.

---

## 5. Open questions for the CEO (review before building)

1. **Name.** "The Steady Loop" is a working title. Alternatives: "The Daily Five", "Non-Zero Loop", "The Base Loop". The word "steady" matches the existing tagline ("stay steady") — recommended.
2. **Order.** Is urge-delay (step 4) correctly placed *after* the sprint? Some readers may prefer it earlier in the day. Current reasoning: the urge tends to arrive after the day's real work begins.
3. **Scope.** Should step 1 include the daily calibration prompt, or stay purely on floors? Calibration currently exists as a separate morning action; folding it into the loop makes the loop longer but complete.

No code should change until these three answers land.