## Whole-Site Refinement: Cleaner & More Elegant — Design Doc

**Date:** 2026-09-11
**Author:** Agent
**Status:** Approved (all sections) — awaiting written-spec review

### Problem
The site works and reads well, but the design is busy and boxy: every section is built from bordered cards, small uppercase labels, and pills; the navigation spans two heavy rows; and the typography hierarchy is flattened by too many competing text treatments. The brief: make the site **noticeably cleaner and more elegant** across the whole site, while keeping the warm cream-and-gold "book" identity, all four themes, and every feature.

### Direction (approved)
A deliberate combination:
- **A · Whitespace-first** — trading borders for whitespace, one calm nav row, hairline dividers, typography as the primary hierarchy.
- **C · Soft surfaces** — warm rounded surfaces kept *only* where grouping earns them (pillar panels, callout, quiz, popovers).
- **B · Near-zen reading** — the chapter body and audit list drop almost all framing: type, whitespace, and a single gold hairline carry the experience.

Ground rule: **one accent per view.** Pillar colors appear only where a pillar is literally identified (tag, filter, chapter marker) — never as decorative borders. Everything not covered here stays exactly as-is (function, data, routes, accessibility behavior).

---

### 1 · Foundations (design tokens & typography)

**Fonts (unchanged families, tightened use):**
- Display: `Fraunces` (kept). Used at larger, more confident sizes: home title ~72px, section titles ~36-40px, tighter leading.
- Body: `Source Serif 4` (kept) at 17px, line-height 1.7, max-width ~70ch in the reader.
- Introduce one consistent scale in `app/globals.css` under `@theme` (semantic, not one-off utilities):
  - `--text-display`, `--text-title`, `--text-heading`, `--text-subhead`, `--text-lead`, `--text-body`, `--text-small`, `--text-micro`
  - A single `.eyebrow` treatment (currently repeated as `font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold`) — one class, applied only at section headers, not inside cards/rows.

**Color (warmer, more ordered neutrals; same identity):**
| Token | Current | New |
|---|---|---|
| `--color-paper` | `#f7f2e7` | `#faf5ea` (softer) |
| `--color-paper-deep` | `#efe6d3` | `#f1e8d4` |
| `--color-card` | `#fbf8ef` | `#fdfaf2` |
| `--color-ink` | `#221d16` | `#1e1a13` |
| `--color-ink-soft` | `#5c5345` | `#57503f` |
| `--color-ink-faint` | `#6f6557` | `#6a6252` |
| `--color-line` | `#ddd2ba` | `#e6dbc3` (lighter hairline) |
| `--color-gold` | `#96772c` | `#8f7128` |
| `--color-gold-soft` | `#c9a94e` | `#c4a44c` |

Pillar colors (self/wealth/health/love), dark/deepwork/cyberpunk theme overrides, and `--hue`/`--reader-*` variables stay structurally identical — each theme gets its own tuned neutrals to match the lighter hairlines and softer gold. Grade badge colors (emerald/sky/amber/rose/stone) stay (they are semantic, not decorative).

**Layout rhythm:**
- Section padding standardizes to `py-16 sm:py-24` on home; secondary pages `py-12 sm:py-16`.
- Replace every hard `border` on containers with either a hairline (`border-line/60`, `border-line/40`) or nothing + whitespace. Full-strength `border-line` used only for page-level separators.
- Consistent corner radius tiers: soft panels `rounded-xl`; interactive rows `rounded-lg`; controls `rounded-full`; hairlines square.

---

### 2 · Navigation (one calm row)

**Header (`components/Nav.tsx`) restructure:**
- Collapse to a single row: wordmark left; right side = **Contents** (dropdown), **Search** (⌘K), **Continue Reading**, **Theme**. Mobile = burger with same Contents + links.
- The old second row (Audit, Protocols, Roadmap, Glossary, Quotes, Research, Devlog, Search, Progress...) moves into the **Contents** menu grouped sections and the footer. Every destination stays reachable; no page is removed.
- Surface: keep sticky + backdrop blur; change `border-b border-line` to a subtle hairline `border-b border-line/60`.

---

### 3 · Home page (`app/page.tsx`)

- **Hero:** eyebrow → Fraunces title (larger: `text-5xl sm:text-7xl`) → single lead paragraph. Remove the boxed stat strip (4 `rounded-xl border bg-paper` cards); replace with three display numerals separated by vertical hairlines, no borders. Keep PrivacyBadge + ThemeTimeShift + buttons (pill shapes retained; "Begin Reading" solid ink, "Check the Evidence" outline).
- **Four pillars:** replace four bordered cards with an editorial row of soft surface panels — hairline edge or none, large chapter-count numeral, description, italic verse; pillar color appears as a small dot or underline only. Hover = gold underline rises; stagger fade-in 50ms.
- **How to read:** three plain blocks separated by hairlines, no card borders; `h3` in display font, body in soft ink.

---

### 4 · Chapters index (`app/chapters/`, `components/ChapterList.tsx`, `ui.tsx`)

- **List over cards:** rows with chapter number (`font-display` gold), title (ink), pillar dot (14px/10px), duration; hairline `divide-y divide-line/60`; generous `py-3`; no per-row borders. Remove the `view=cards|compact` toggle — one good list (visual change only; the `view` param may be left reading but ignored).
- **Grouped sections** (per `BOOK_GROUPS`) keep headings with a single hairline under the group title; drop the small-uppercase per-row readouts where redundant.
- **Filters/sort:** quiet segmented control (pillar / bookmarked / chapter-order / reading-time) — lighter borders (`border-line/60`), active = `bg-paper-deep text-ink` or gold dot, inactive = `text-ink-faint`.

---

### 5 · Reading experience (near-zen; `app/chapters/[slug]/page.tsx`, `components/ReaderControls.tsx`)

- **Chapter header:** group label becomes a quiet gold line/text (no card). Keep chapter number/meta row, but as flat text with dot separators (already has that) and drop the card. Large Fraunces title; italic teaser.
- **Body:** no surrounding card. Keep `book-prose` + drop cap; increase max reading width slightly (~70ch); hairline rules between sections instead of spacing blocks. Reader controls (A−/A+/settings) restyle to quiet flat circle buttons (`border-line/60`); settings popover keeps its `bg-card` surface (soft C surface).
- **Right rail:** Chapter TOC + reading time + evidence badges stay sticky; card borders become hairlines/white.
- **Prev/Next:** two quiet text links with a hairline separator — no boxes.

---

### 6 · Secondary pages (audit, protocols, glossary, research, roadmap, quotes, search, progress, devlog)

- **Audit (`app/audit/page.tsx`) — most visible change:** `<details>` claim cards become flat rows divided by hairlines; grade badge left, claim text, verdict right, plus indicator for open. Expansion reveals detail + source with a gold left rule (existing `border-l-2 border-gold` pattern kept). Grade summary strip: five flat stat tiles with hairline separators (no per-tile borders).
- **Protocols / glossary / research / roadmap / quotes / devlog:** plain lists and rows, hairline dividers, eyebrows only as section headers; all flow through the shared `PageShell` / `SectionHeading` (which inherit the new type scale).
- **Progress / gamification (`components/ProgressView.tsx`, gamification surfaces):** retain every feature (streaks, badges, bookmarks, next-up); render as a clean reading dashboard — numerals + progress bars on whitespace; boxes removed.

---

### 7 · Themes (all four, kept and refined)

- Structure unchanged (`[data-theme=...]` overrides in globals.css); only token values tuned per theme (paper/ink/line/gold to match the new neutrals). Dark stays deep (`#181510`) with softer gold; Deep Work stays cream; Cyberpunk keeps its dark + accent identity, tamed to the same discipline.
- Reader scale / line-height / font / contrast settings: functions untouched; menu UI restyled.

---

### 8 · Motion & details

- Transitions 150–200ms ease-out; hover = background shift on rows, 1–2px translate on buttons only where meaningful; staggered fade-in (50ms) for pillar panels and chapter rows; `prefers-reduced-motion` respected (existing behavior).
- Focus rings: 2px gold ring, offset (add if not already present on all interactive controls).
- Empty states and 404 stay as designed (already cared for); no content/copy changes except where a label caption shrinks.

---

### Acceptance Criteria
- Home page renders the refined hero (no boxed stat cards, larger title) + editorial pillar panels.
- Header is a single row with Contents menu; all previous destinations still reachable (check each link in Contents + footer).
- Chapters index shows hairline rows with pillar dots; no card borders; filters still work.
- Chapter reader shows frameless body with reader controls and right rail; A−/A+/settings/scale/font/contrast all function.
- Audit shows hairline rows; grade summary reads correctly; details open with gold rule.
- All four themes render with tuned tokens and no contrast regressions (manual check in browser).
- Every feature intact: bookmarks, streaks, badges, progress, quiz, highlights, search, themes, devlog.
- `npx eslint .` → 0 errors; `npm run build` → 0 errors; all 22 tests pass; 46 prerendered routes.

### Files Changed (proposed)
- `app/globals.css` — token values, type scale, `.eyebrow`, hairline discipline.
- `components/ui.tsx` — `ChapterCard` → row treatment (or new `ChapterRow`), `SectionHeading`/`PageShell` inherit new scale, `PillarTag` dot refinement.
- `components/Nav.tsx` — one-row header + Contents menu; `components/ChaptersMenu.tsx` — content expansion.
- `components/Footer.tsx` — absorb relocated links; keep quiet style.
- `app/page.tsx` — refined hero, stats row, pillar panels, how-to-read.
- `app/chapters/page.tsx`, `components/ChapterList.tsx` — list treatment + filters.
- `app/chapters/[slug]/page.tsx` — frameless header/body; `components/ReaderControls.tsx` — restyle.
- `app/audit/page.tsx` — flat claim rows + grade strip.
- Secondary pages (protocols, glossary, research, roadmap, quotes, search, progress, devlog) — inherit tokens; targeted de-card where cheap.
- No new dependencies. No changes to `lib/`, data build, or routes (except ignoring `view=compact`).

### Out of Scope
- Content/copy rewrites, new features, removing features.
- Changing grade semantics, evidence text, or citation rules.
- Reader behavior beyond visual restyle (scale, lh, font, contrast logic unchanged).

### Verification
- `npm run build` passes (0 errors).
- `npx eslint .` passes (0 errors).
- All 22 existing tests pass.
- Manual check in Chrome at 375px, 768px, 1440px: home, chapters, a chapter body, audit, progress, a themed (cyberpunk) page; tabs/readers/menu keyboard navigation; reduced-motion.
- Playwright visual pass after implementation (per routing chain).

---
**Decision:** Approved (all sections) — proceed to implement review by user, then write the implementation plan.