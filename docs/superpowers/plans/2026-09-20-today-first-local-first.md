# Today-First UI and Local-First Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved Today-first workspace upgrade and browser-domain reliability hardening without changing existing routes, localStorage compatibility, local-only Ollama behavior, or generated content artifacts.

**Architecture:** Keep the static Next.js export and existing domain modules. Add a small shared workspace component layer that receives already-derived data and callbacks, then use it in the existing OS workspace routes. Harden the browser boundary in the existing OS, backup, notification, portfolio, analytics, and path helpers instead of introducing a hosted API or new persistence system.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, Tailwind CSS v4, Node test runner, Playwright.

## Global Constraints

- Preserve all existing routes and useful compatibility behavior for `/today/`, `/dashboard/`, and `/action/`.
- Use only local Ollama `llama3.1:latest`; accept only loopback `/api/chat`; use deterministic local fallback for unavailable or invalid Ollama.
- Do not add a hosted backend, remote AI provider, cloud sync, accounts, or analytics payloads containing local user content.
- Preserve existing localStorage keys and reject corrupt state without destroying valid state.
- Protect `data/levelup.db`, `public/data/quizzes.json`, and `public/data/site.json`; they must not appear in the final diff.
- Keep public content indexable, personal workspaces `noindex`, and static assets correct under `/LevelUp`.
- Keep Fraunces/Source Serif, paper/ink/gold tokens, 12px card radius, restrained borders, visible focus rings, reduced-motion behavior, and 44px touch targets where practical.

---

### Task 1: Establish the implementation baseline and regression guard

**Files:**
- Create: `docs/superpowers/plans/2026-09-20-today-first-local-first.md`
- Test: existing `tests/*.test.mjs`, `verify-*.mjs`
- Protect: `data/levelup.db`, `public/data/quizzes.json`, `public/data/site.json`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-09-20-ui-ux-local-first-design.md`.
- Produces: a clean list of intended source files and baseline artifact hashes for final diff verification.

- [ ] Record `git status`, protected artifact hashes, and current scripts before implementation.
- [ ] Run the existing unit suite, lint, typecheck, and static build once to identify pre-existing failures.
- [ ] Restore only generated protected-artifact drift after recording it, and verify those paths are clean before source edits.

### Task 2: Add shared workspace primitives

**Files:**
- Modify: `components/ui.tsx`
- Create: `components/workspace/WorkspaceHeader.tsx`
- Create: `components/workspace/PrimaryActionCard.tsx`
- Create: `components/workspace/MetricStrip.tsx`
- Create: `components/workspace/EmptyState.tsx`
- Create: `components/workspace/StatusPill.tsx`
- Create: `components/workspace/ActionButton.tsx`
- Create: `components/workspace/FormField.tsx`
- Create: `components/workspace/InlineNotice.tsx`
- Create: `components/workspace/SectionCard.tsx`
- Create: `components/workspace/MobileBottomNav.tsx`

**Interfaces:**
- Components accept display data and handlers only; they do not read localStorage or import domain stores.
- `ActionButton` supports `primary`, `secondary`, and `quiet` variants with disabled/focus states.
- `EmptyState` accepts title, explanation, action label, and action handler or link.

- [ ] Add typed props and token-based styles with no direct storage access.
- [ ] Add reduced-motion-safe transition classes and minimum touch target sizing.
- [ ] Add component-level tests or pure helper tests for progress/label rendering where practical.

### Task 3: Simplify responsive navigation and shell hierarchy

**Files:**
- Modify: `components/Nav.tsx`
- Modify: `components/ui.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Desktop primary navigation is `Today | Learn | Goals | Progress | More`.
- Mobile bottom navigation is `Today | Learn | Goals | Progress`; secondary routes remain in More.
- Existing route hrefs remain reachable, active location is exposed with `aria-current`, Escape closes More, and browser back behavior remains native.

- [ ] Replace the crowded horizontal mobile row with the shared bottom navigation.
- [ ] Keep chapter/editorial access under Learn and preserve all existing More links.
- [ ] Add active styling that does not depend on client-only pathname reads during SSR hydration.
- [ ] Verify keyboard focus, Escape-to-close, menu semantics, and no horizontal overflow.

### Task 4: Reorganize Today and OS workspace routes around the execution loop

**Files:**
- Modify: `components/LevelUpOSWorkspace.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/action/page.tsx`
- Modify: `app/goals/page.tsx`
- Modify: `app/focus/page.tsx`
- Modify: `app/review/page.tsx`
- Modify: `app/progress/page.tsx`
- Modify: `app/portfolio/page.tsx`
- Modify: `app/roadmap/page.tsx`

**Interfaces:**
- Today renders date/goal/outcome, one primary next action, a compact metric strip, conditional recovery, compact inbox, and quiet secondary links.
- Goals prioritize active goal, progress, route, milestone, and next session; creation remains short and progressive.
- Focus starts with the ready session and groups timer, pause, interruption, note, completion, and evidence links.
- Review starts with completed/unfinished sessions and local patterns before reflection inputs.
- Progress leads with outcome/mastery; Portfolio is an evidence ledger; Roadmap remains an editing workspace.

- [ ] Extract repeated card/button/input styles into shared primitives while keeping domain dispatch in the workspace container.
- [ ] Add explicit loading/empty/error/success/disabled states to every primary workspace.
- [ ] Ensure no-goal Today has one concise next action and does not repeat the full route builder below every card.
- [ ] Ensure completion surfaces Review and Portfolio next steps and recovery is an action, not a warning-only state.

### Task 5: Harden browser-only persistence, backup, and migrations

**Files:**
- Modify: `lib/os/store.ts`
- Modify: `lib/os/migrations.ts`
- Modify: `lib/backup.ts`
- Modify: `lib/notifications.ts`
- Modify: `lib/portfolio.ts`
- Modify: `components/BackupJournalNotice.tsx`
- Modify: `components/BackupPanel.tsx`
- Test: `tests/os.test.mjs`
- Test: add focused backup/migration tests under `tests/`

**Interfaces:**
- Server snapshots remain stable and browser storage is touched only in browser-safe functions/effects.
- Backup validates the complete payload before any write and restores OS, portfolio, notifications, experiments, and legacy keys atomically.
- Additive migrations remain backward compatible and journal rollback failures without deleting valid state.

- [ ] Add safe storage wrappers for unavailable/throwing localStorage.
- [ ] Validate optional domain payloads rather than accepting arbitrary records.
- [ ] Ensure corrupt new state falls back without overwriting a valid old state.
- [ ] Add tests for browser-only reads, malformed payload rejection, migration, rollback, and reload persistence.

### Task 6: Finish Ollama boundary and deterministic fallback hardening

**Files:**
- Modify: `lib/ai/ollama-provider.ts`
- Modify: `lib/ai/local-provider.ts`
- Modify: `lib/ai/services.ts`
- Modify: `lib/ai/schemas.ts`
- Test: `tests/ai.test.mjs`

**Interfaces:**
- The provider remains locked to loopback `/api/chat` and `llama3.1:latest`.
- Request/response sizes, timeout, JSON structure, and operation schemas remain bounded.
- Every provider failure returns deterministic local output without persisting raw prompts/responses or analytics content.

- [ ] Reject non-loopback, credentialed, LAN, cloud, arbitrary-model, and non-chat endpoints.
- [ ] Keep fallback output stable for identical saved state and request inputs.
- [ ] Add tests for invalid endpoints, model lock, invalid response, timeout, oversized payloads, and fallback reason.

### Task 7: Fix hydration, base paths, focus, empty states, and accessibility details

**Files:**
- Modify: `lib/sitePaths.ts`
- Modify: `components/ContinueReading.tsx`
- Modify: `components/ThemeToggle.tsx`
- Modify: `components/BackupJournalNotice.tsx`
- Modify: relevant workspace components/pages
- Modify: `app/globals.css`
- Test: `tests/paths.test.mjs` and focused UI/state tests

**Interfaces:**
- Server-rendered output is stable until browser state is available.
- Absolute and asset URLs resolve exactly once under `/LevelUp`.
- Every async/local check exposes a recoverable loading/error/success state and focus returns sensibly after menu/modal actions.

- [ ] Remove client-only values from server-rendered markup or defer them behind mounted/browser snapshots.
- [ ] Audit links, images, service worker, metadata, and canonical paths under the static base path.
- [ ] Add `prefers-reduced-motion`, visible focus, and focus restoration/initial focus behavior where needed.

### Task 8: Run release verification and browser QA

**Files:**
- Modify: only files required by verified failures
- Add/modify: Playwright verification script(s) if the existing scripts do not cover the required routes

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `NEXT_PUBLIC_BASE_PATH=/LevelUp npm run build`.
- [ ] Run desktop/mobile/a11y/keyboard Playwright checks across Today, Goals, Focus, Review, Progress, Portfolio, Roadmap, Dashboard, and Action.
- [ ] Run secret scans and ensure no remote provider URLs/tokens are present in source or generated client assets.
- [ ] Verify protected artifacts are unchanged and not staged.

### Task 9: Review, commit, deploy, and verify

**Files:**
- Commit only intended source/tests/docs/config files; never generated protected artifacts.

- [ ] Review `git diff`, `git diff --check`, and `git status`.
- [ ] Commit with a concise implementation message.
- [ ] Push `main` only after all requested checks are green.
- [ ] Watch the GitHub Pages workflow and verify the public `/LevelUp` URL plus representative route assets.
- [ ] Report exact commands, pass/fail results, commit, workflow status, public URL, and any residual limitations.
