# LevelUp Today-First UI and Local-First Reliability Design

**Status:** Design approved in principle; implementation follows this contract.

## Goal

Make LevelUp feel like one coherent operating system for learning and action while preserving its editorial reader, local-first privacy model, and local Ollama AI.

## Product Direction

The canonical user journey is:

```text
Current goal -> next action -> focused session -> recorded evidence -> progress -> recovery or next step
```

`/today/` becomes the primary personalized entry point. `/dashboard/` and `/action/` remain compatibility routes and preserve their existing useful functionality, but they should point users toward the same execution loop rather than competing with it.

## Visual Direction

The interface should feel like a calm editorial workspace with the product discipline of Linear's settings and command surfaces:

- Preserve Fraunces/Source Serif typography, paper/ink/gold tokens, and evidence-audited editorial tone.
- Use one accent per view: gold for primary action, current state, and links.
- Use a consistent 12px card radius and restrained borders; avoid decorative gradients and excessive shadows.
- Increase whitespace around page-level decisions; reduce padding and visual weight inside secondary cards.
- Make the primary action visually dominant and keep secondary actions quiet.
- Use 150-250ms transitions, visible focus rings, and reduced-motion behavior.
- Keep touch targets at least 44px where practical.
- Keep all layouts usable at 375px, 768px, 1024px, and 1440px.

## Navigation

Desktop primary navigation:

```text
Today | Learn | Goals | Progress | More
```

The More menu contains Focus, Review, Roadmap, Playbook, Portfolio, Experiments, Protocols, Evidence, Research, Search, Settings, and Privacy.

Mobile navigation uses a compact bottom navigation for Today, Learn, Goals, and Progress. Secondary areas remain in a menu. Existing routes remain reachable and are not deleted.

Navigation must expose the current location with an active state, preserve browser back behavior, support Escape to close menus, and avoid the current crowded horizontal mobile row.

## Today Screen

The Today page is reorganized into progressive disclosure:

1. Page header: date, active goal, and one short outcome statement.
2. Primary action card: the next visible move, duration, reason, and Start button.
3. Small progress strip: goal progress, today's sessions, and current streak.
4. Recovery action: only appears when unfinished work exists.
5. Compact inbox: due session, review, or recovery reminder.
6. Secondary links: Goals, Focus, Review, and Portfolio.

When there are no goals, the empty state explains the value of a goal and presents a concise goal form or a link to Goals. The full route-builder form is not repeated below every card.

## Shared Workspace Components

Create or consolidate reusable components for:

- `WorkspaceHeader`
- `PrimaryActionCard`
- `MetricStrip`
- `EmptyState`
- `StatusPill`
- `ActionButton`
- `FormField`
- `InlineNotice`
- `SectionCard`
- `MobileBottomNav`

Components must consume existing tokens and accept data/handlers rather than reading localStorage directly.

## Core Flow Changes

### Goals

Goals focus on choosing and editing an outcome. The user sees the active goal, current progress, route, milestones, and next session. Creation is a short form; deeper editing is progressive.

### Focus

Focus opens directly into the current ready session. The timer, pause, interruption, note, and completion controls are visually grouped. A completed session produces an evidence summary and links to Review/Portfolio.

### Review

Review starts with what happened, not empty inputs. It shows completed sessions, unfinished sessions, local pattern insights, and a concise daily/weekly reflection form. Recovery is an action, not a warning.

### Progress

Progress leads with outcome progress and mastery. XP and badges remain secondary. The page should not repeat all backup controls; backup is a dedicated workspace.

### Portfolio

Portfolio uses a calm evidence ledger. Artifact creation is simple, and each record can link to a goal, chapter, session, or completion event. Empty state explains that the portfolio is built from completed work.

## Local-First Backend Boundary

The application has no hosted backend. The backend reliability pass means hardening the browser domain boundary:

- All domain state flows through typed `lib/os` commands and projections.
- Components do not directly read arbitrary localStorage keys.
- Existing keys remain compatible.
- New state remains versioned and migratable.
- Backup import validates the entire payload before writes.
- Legacy multi-key restore journals failures and supports safe recovery.
- Portfolio, notifications, experiments, and OS state participate in backup/restore.
- Local-only data never enters analytics.
- Corrupt state is rejected without destroying valid state.
- Core product behavior remains available without network, Ollama, or analytics.

## Local Ollama Boundary

The only model provider is local Ollama with model `llama3.1:latest`.

- Accept only loopback `/api/chat` endpoints.
- Reject LAN, cloud, arbitrary, or user-selected model endpoints.
- Keep model name locked in the provider.
- Use a short timeout and bounded request/response sizes.
- Validate JSON and the operation schema.
- Use deterministic local fallback on unavailable Ollama or invalid output.
- Never send Ollama prompts or responses to analytics.
- Never persist raw prompts or complete raw responses.
- Explain that public visitors need their own local Ollama instance.

## Error and Empty States

Every primary workspace needs:

- Empty state with a next action.
- Loading state for async/local checks.
- Error message with recovery action.
- Disabled state with explanation.
- Success state with the next recommended action.

No page should present a large blank card stack when there is no user data.

## Analytics and SEO

- Use the existing centralized analytics module.
- Add only safe entity categories, durations, and enum values.
- Never send user-entered titles, descriptions, notes, reflections, or AI content.
- Keep public content indexable.
- Keep personal workspaces `noindex` and out of the sitemap.
- Keep absolute canonical URLs and `/LevelUp` base-path asset handling.

## Testing Contract

Required before release:

- Existing unit/data/AI/OS/backup tests pass.
- New reducer/state tests are test-first for behavior changes.
- Goal creation, session start/complete, recovery, review, portfolio, notifications, backup, and reload persistence pass in Playwright.
- Desktop and mobile routes have one H1, no horizontal overflow, no console/page errors, and visible focus states.
- Public route assets resolve under `/LevelUp`.
- No remote provider or secret strings exist in source or generated client assets.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, and `NEXT_PUBLIC_BASE_PATH=/LevelUp npm run build` pass.

## Non-Goals

This pass does not add:

- Accounts or cloud sync.
- A hosted API.
- Remote AI providers.
- Shared notifications.
- Social feeds or leaderboards.
- A visual redesign of the editorial chapter content itself.
