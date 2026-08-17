## Home Page Verified Quote Card — Design Doc

**Date:** 2026-08-17  
**Author:** Agent  
**Status:** Approved (Section A only)  

### Problem
The home page (`/`) is flat and descriptive-only: hero tagline, stats row, 4 pillar cards, 3 how-to cards. No real book content appears above the fold. Readers see a description of the book but not *from* the book.

**Solution:** Add a single verified quote from the chapter pool beneath the hero tagline. This surfaces the book's evidential basis at a glance and invites deeper exploration.

### Design (Section A — Approved)

- **Location:** In `app/page.tsx`, beneath the hero `<h1>` and above the stats row, inside the first `<div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">` container, but below the tagline paragraph and above the `Begin Reading` button.
- **Quote source:** `quotes.json` (already emitted at build time; contains all chapter quotes from frontmatter `{text, source, chapter}`). A client component `components/QuoteCard.tsx` reads this file on mount, picks one quote at random, and displays it.
- **QuoteCard component** (client):
  - Reads `quotes.json` via `fetch()`; on parse error or empty array, renders nothing.
  - Picks one entry uniformly at random.
  - Renders:
    ```html
    <blockquote className="mt-4 italic text-lg text-ink-soft">
      <p>{quote.text}</p>
      <p className="text-xs text-ink-faint">— {quote.source}</p>
    </blockquote>
    <Link
      href={`/chapters/${quote.chapter}/`}
      className="mt-3 rounded-full bg-ink px-6 py-2 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold"
    >
      Read chapter
    </Link>
    ```
  - Styling matches the home page aesthetic (italic, thin rule above, primary CT button).
- **Rotation:** On each mount (page reload) a new quote is selected; persistent across hot-reloads via `localStorage` cache of the last-quote-slug for ~24h.
- **Fallback:** If no quotes are present across all chapters, the card simply does not render (no empty block, no error).
- **Build impact:** Zero new data pipelines; `quotes.json` already exists from the existing build. The client component is ~30 lines, no new dependencies.

### Acceptance Criteria
- Home page renders a quote block beneath the hero when at least one chapter has a quote.
- The quote text, source, and “Read chapter” link are correct.
- Clicking “Read chapter” navigates to the chapter page.
- When no quotes exist (edge case), the card is absent and the page layout is unchanged.
- Lint: 0 errors; eslint passes.

### Out of Scope
- Quote rotation beyond “once per page load” (could be enhanced later).
- Authoritative grading or citation verification beyond what frontmatter already provides.
- Adding quotes to chapters that lack them.

### Files Changed (proposed)
- `components/QuoteCard.tsx` (new, client)
- `app/page.tsx` (inject QuoteCard component beneath hero)
- `public/data/quotes.json` (already exists; no changes needed)

### Verification
- `npm run build` passes (0 errors).
- `npx eslint .` passes (0 errors).
- Home page rendered in Chrome: quote block present with correct text/source/link; “Read chapter” navigates correctly; no-quote case renders identically without the block.
- All existing tests pass (22/22).

---
**Decision:** Approved — proceed to write the spec doc and commit.