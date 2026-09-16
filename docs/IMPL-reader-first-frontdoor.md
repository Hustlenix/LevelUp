# Implementation Plan — Reader-First Front Door

**Status:** Draft for build — validate, then execute in order.
**Design reference:** `docs/DESIGN-reader-first-frontdoor.md` (the approved brief, "Option 1").
**Scope guard:** no accounts, no sync, no payments, no new features. This plan only reshapes what exists.

---

## 0. Pre-implementation (mandatory, before any code)

1. **Read the modified Next.js docs first.** This repo runs Next.js `16.3.5` with breaking changes vs. training data. The official guides ship in the package: `node_modules/next/dist/docs/` exists (verified: `01-app`, `02-pages`, `03-architecture`, `04-community`). Read the relevant `01-app` routing / metadata / client-component guides before writing or editing any page. Heed deprecation notices.
2. **Baseline the tree.** Confirm `git status` is clean except untracked `docs/`; record `git log -1`. Run `npm run build` on the untouched tree and confirm green. That build is the rollback artifact.
3. **Freeze the storage layer.** The ten localStorage keys below are the entire user state. They are origin-scoped, so a route move cannot lose them — only code churn can. Do not edit `lib/actionTools.ts`, `lib/activity.ts`, `lib/progress.ts`, `lib/gamification.ts`, or `lib/dates.ts`.

---

## 1. Design validation (what the code actually says)

**Feasibility: high.** This is a small, well-scoped reshape of a static Next.js site (`output: "export"`, `trailingSlash: true`, `basePath` from `NEXT_PUBLIC_BASE_PATH`, deployed under `https://hustlenix.github.io/LevelUp`). The dashboard already exists as a self-contained client component; the home page already exists as a thin server wrapper around it. Every requested behavior maps to existing code.

**Verified data facts:**
- 28 chapters, 4 pillars: `self` = 14, `wealth` = 8, `love` = 2, `health` = 4.
- Lowest-numbered chapter per pillar (derivable at build time — do not hardcode slugs): `self` → ch1 `belief-engineers-reality`, `wealth` → ch12 `effortless-achievement`, `love` → ch14 `the-unified-life`, `health` → ch16 `the-high-frequency-human`. Chapter 1 is the "Start reading" target.
- Storage keys (all origin-scoped, verified in source): `levelup-progress-v1`, `levelup-streak-v1`, `levelup-pillar-floors-v1`, `levelup-daily-calibration-v1`, `levelup-focus-sessions-v1`, `levelup-urge-pauses-v1`, `levelup-protocol-logs-v1`, `levelup-highlights-v1`, `levelup-quiz-v1`, `levelup-reflections-v1`.

**Conflicts and corrections found:**

| # | Finding | Correction |
|---|---------|------------|
| 1 | `app/page.tsx` today renders `JsonLd` `@type: "WebApplication"` + `<HomepageDashboard />`. A book front door marked as "WebApplication" mischaracterizes the page to search engines. | Home page gets a `Book` JSON-LD block; the existing WebApplication block moves verbatim to `/dashboard` (where it is accurate). `JsonLd` accepts object or array — no component change. |
| 2 | `components/Nav.tsx` contains **three** links to `/` (logo line ~16, desktop "Dashboard" lines ~39–41, mobile "Dashboard" line ~67). | Logo keeps `/`. Both "Dashboard" links retarget to `/dashboard/`. |
| 3 | `ContinueReading` (global header widget) reads progress and links to `/chapters/{next}/`. On the new home it is not clutter — it is a reader-relevant CTA and hidden on mobile anyway. | No change. |
| 4 | Mobile nav is currently two stacked rows; the brief wants one two-layer treatment on both breakpoints. | Restructure Nav into primary row + one "More" disclosure on both desktop and mobile, reusing the existing ChaptersMenu outside-click + Escape pattern for the disclosure. |
| 5 | HomepageDashboard is a client component using `useSyncExternalStore` with frozen server snapshots — already SSR/static-export-safe. | No change; just re-import it from the new route. |
| 6 | `app/sitemap.ts` enumerates all routes including `/action/` and `/progress/` but not `/dashboard`. | Add `/dashboard/` entry. |
| 7 | Tests (`npm test` → data, features, gamification) assert on content/data only — no route or DOM assertions. | Nothing breaks; run them anyway as a regression gate. |
| 8 | Footer has no link to `/` or a dashboard. | Add `/dashboard/` to the footer (recommended, tiny). |
| 9 | `manifest.ts` `start_url: "/"` — correct for reader-first. `robots.ts`, `feed.xml`, `not-found.tsx` unaffected. | No change. |

---

## 2. File-by-file change list

| File | Action | Purpose | Notes |
|------|--------|---------|-------|
| `app/page.tsx` | **Modify** | Home becomes the reader front door. | Remove `JsonLd` (WebApplication) + `HomepageDashboard`. Add Book JSON-LD, optional page `metadata` export, and `<ReaderFrontDoor chapters={chapters} />`. Stays a server component. |
| `app/dashboard/page.tsx` | **Create** | New home for the operating system, byte-for-byte behavior. | Copy current `app/page.tsx` body: `getSiteData()` → WebApplication `JsonLd` + `<HomepageDashboard protocols={protocols} chapters={chapters} />`. Add page `metadata` (title e.g. "Dashboard"). |
| `components/ReaderFrontDoor.tsx` | **Create** | The only new UI. Server component, no `"use client"`. | Renders: title + one-liner + evidence badge; single "Start reading" → Chapter 1; 4 pillar entry cards (derived lowest chapter per pillar, rendered in fixed order health, wealth, love, self); trust strip → `/audit/` + `/research/`; quiet "Open your dashboard" → `/dashboard/`. Props: `{ chapters: Chapter[] }`. Reuse design tokens (`text-ink`, `text-gold`, existing background tokens, Fraunces display type) — no new palette. |
| `components/Nav.tsx` | **Modify** | Two-layer menu, desktop + mobile; retarget Dashboard links. | Primary: Chapters (existing `ChaptersMenu`) · Daily Action (`/action/`) · Protocols (`/protocols/`) · Dashboard (`/dashboard/`). More: Verification (`/audit/`) · Glossary (`/glossary/`) · Quotes (`/quotes/`) · Analytics (`/progress/`). Keep logo→`/`, Search button, `ContinueReading`, `ThemeToggle` untouched. "More" needs `aria-expanded`/`aria-haspopup`, outside-click + Escape close (copy ChaptersMenu pattern). Unify the two stacked mobile rows into one. |
| `app/sitemap.ts` | **Modify** | Index the new route. | Add `{ url: `${SITE_URL}/dashboard/`, lastModified }`. |
| `components/Footer.tsx` | **Modify** (small) | Dashboard discoverability. | Add `Dashboard` link (`/dashboard/`) to the existing Browse group (or its own entry beside it). Nothing else changes. |

**No files deleted.** Untouched-but-frozen: `HomepageDashboard.tsx`, `ChaptersMenu.tsx`, `ContinueReading.tsx`, `JsonLd.tsx`, `SearchProvider.tsx`, `ThemeToggle.tsx`, `AmbientAudioPlayer.tsx`, the modals, `lib/*` (all), `app/layout.tsx` (leave global metadata as-is), `manifest.ts`, `robots.ts`, `feed.xml`, `not-found.tsx`, `scripts/build-data.mjs`, tests.

---

## 3. Component reuse strategy

- **Reuse unmodified:** `HomepageDashboard` (imported by the new dashboard route), `ChaptersMenu` (both nav tiers), `ContinueReading` (header), `JsonLd` (both pages), `SearchProvider`/`ThemeToggle` (nav).
- **Move, don't duplicate:** the WebApplication JSON-LD block moves from home to `/dashboard` — one source of truth for that schema. `HomepageDashboard` stays put as a file; only its import site changes.
- **Build new, minimal:** `ReaderFrontDoor` is the sole new component. It is a pure server component (static `<Link>`s, no client state, no store imports) — deliberately boring so the home page cannot regress into dashboard behavior.
- **Do not touch:** any `lib/` store module. The dashboard's live streak/floors/matrix/protocols all depend on those modules and their exact storage keys.

---

## 4. Routing strategy

- `/` remains the site entry (manifest `start_url`, canonical, logo) — but it is now the **reader face**: book, one CTA, pillar entry points, trust signals, quiet dashboard link at the bottom.
- `/dashboard` is a new static route hosting the full OS, rendering **exactly** what `/` renders today.
- Link inventory and retargets:
  - `Nav.tsx` line ~16 logo `href="/"` → keep.
  - `Nav.tsx` lines ~39–41 desktop "Dashboard" `href="/"` → `/dashboard/`.
  - `Nav.tsx` line ~67 mobile "Dashboard" `href="/"` → `/dashboard/`.
  - `Footer.tsx` → add `/dashboard/` (recommended).
  - `ContinueReading` → `/chapters/{next}/`, untouched.
  - Grep gate: after the change, `href="/"` should appear only for the logo (and any 404/textual home links that are intentional).
- **SEO:** home keeps the book-oriented global metadata and gains a `Book` JSON-LD (name, one-liner, `SITE_DESCRIPTION`, author, `PUBLISHED_DATE`, `inLanguage: "en"`). The dashboard page is titled plainly ("Dashboard") and keeps `WebApplication` schema so it does not compete for the book's SERP identity. `sitemap.ts` gains `/dashboard/`.

---

## 5. Build order (each step independently verifiable)

1. **Baseline** — `npm run build` + `npm test` green; record `git log -1` / `git status`. (No code change.)
2. **Create `/dashboard`** — `app/dashboard/page.tsx` = current home body minus nothing (JsonLd WebApplication + HomepageDashboard). Verify: build green; `npm run start` → `/dashboard/` looks and behaves exactly like today's home.
3. **Flip the front door** — create `components/ReaderFrontDoor.tsx`; rewrite `app/page.tsx` (Book JSON-LD, ReaderFrontDoor, optional metadata). Verify: build green; home shows zero dashboard clutter; `/dashboard/` still intact.
4. **Two-layer nav** — restructure `Nav.tsx`; retarget both Dashboard links. Verify: build green; walk all primary + More items on desktop and mobile; logo, search, ContinueReading, theme toggle still work.
5. **Sitemap + footer** — add `/dashboard/` to `sitemap.ts` and footer. Verify: build green; `out/sitemap.xml` contains `/dashboard/`; grep `href="/"` shows only intended targets.
6. **Full pass** — `npm run build`, `npm test`, manual checklist (below), then hand back with the diff reviewed.

Each step is small enough that a failure isolates to the last change; never proceed past a red build.

---

## 6. Test / verification plan

**Commands (exact):**
- `npm run build` — regenerates `public/data` and static-exports; must be green after every step.
- `npm test` — data/features/gamification suites; expected green and unchanged (no route assertions exist — verified).
- `npm run start` — serve the build for manual checks.

**Manual checks (from design brief §6):**
1. Site still works end-to-end: `/`, `/dashboard/`, `/action/`, `/chapters/`, `/protocols/`, `/audit/`, `/glossary/`, `/quotes/`, `/progress/`, `/research/`, `/roadmap/`, `/search/`, `/devlog/`, plus one `/chapters/{slug}/` page and the 404 page.
2. Home shows the book and nothing else: title, one-liner, evidence badge, one "Start reading" button → `/chapters/belief-engineers-reality/`, 4 pillar cards, trust strip → `/audit/` + `/research/`, quiet "Open your dashboard" → `/dashboard/`. No streak/floor/matrix content.
3. Dashboard live for returning readers: streak, four daily floors, consistency matrix, protocol launchers all behave exactly as before (exercise a floor toggle and a protocol launch).
4. Nav on phone and desktop: primary items + "More" disclosure, everything reachable; ChaptersMenu, Search, ContinueReading, theme toggle intact; keyboard: Tab order, Enter on "More", Escape / outside-click closes.

**Data integrity check:** in a profile with existing progress, hard-refresh `/dashboard/` and confirm streak/floors persist (storage keys unchanged — see §0.3).

**A11y spot-check:** "More" disclosure has `aria-expanded` + `aria-haspopup`; pillar cards are real links; contrast of badge/trust strip text meets existing token standards.

---

## 7. Rollback safety

- **No destructive operations anywhere in this plan.** No deletions, no data migrations, no localStorage schema changes (all ten keys frozen), no dependency changes.
- **Revert procedure:** `git restore app/page.tsx components/Nav.tsx components/Footer.tsx app/sitemap.ts`; delete `app/dashboard/page.tsx` and `components/ReaderFrontDoor.tsx`. That returns the tree to the §0.2 baseline.
- **Deployment rollback:** the site is a static export (`output: "export"`). Re-publishing the pre-change `out/` restores the old site; there is no server or database involved.
- **State safety:** all user state lives in the browser's localStorage under origin-scoped keys. A route move cannot orphan it; the only mechanism that could is editing the store modules, which this plan forbids.
- **Commit policy:** do not commit unless explicitly asked; leave the working tree with only the intended diff plus the existing untracked `docs/` files.

---

## Appendix A — data facts for the implementer

- `getSiteData()` reads `public/data/site.json` (generated by `scripts/build-data.mjs` from `content/chapters/*.md`); chapters carry `number, slug, title, pillar, teaser, ...`.
- Pillar entry helper: `chapters.filter(c => c.pillar === p).sort((a,b) => a.number - b.number)[0]` for `p` in `["health","wealth","love","self"]`. Display order per brief: Health, Wealth, Love, Self.
- Site constants: `SITE_URL = "https://hustlenix.github.io/LevelUp"`, `SITE_NAME = "The Level Up Manual"`, `SITE_DESCRIPTION`, `SITE_AUTHOR = "Hustlenix"`, `PUBLISHED_DATE = "2026-08-15"` — all in `lib/site.ts`.
- Dashboard entry targets: `self` → ch1 `belief-engineers-reality` (also the "Start reading" target), `wealth` → ch12 `effortless-achievement`, `love` → ch14 `the-unified-life`, `health` → ch16 `the-high-frequency-human`. Derive from data; do not hardcode slugs.