# Level Up Manual

Live site: https://hustlenix.github.io/LevelUp/

A 28-chapter self-development book built from a 20-hour video transcript, every
claim graded against the research it cites. Local-first: your progress lives in
`localStorage`, never leaves the browser, and works without accounts, APIs, or
telemetry.

## What this is

Twenty-eight lessons across four pillars — Self (14), Wealth (8), Health (4),
Love (2) — roughly 32k words, distilled from a single long-form training by
a founder and content creator. Every notable claim is graded A–D/U against a
verified-facts file. No invented citations, no vibes-based research.

The source material:

https://www.youtube.com/watch?v=wvaY5bG5p7A&t=65s

## How it was built

The transcript was ~20k lines. Claude compacted it until tokens ran out. Gemini
ran out of tokens too. Opencode finished the summary across a few more passes.
Then a static site got built around it: content pipeline, search index, reader,
progress tracking, deploy workflow. The whole thing ships as static HTML to
GitHub Pages via Actions.

The content pipeline (`scripts/build-data.mjs`) compiles Markdown into SQLite
using Node's built-in `node:sqlite`, then emits JSON data files and a ~30KB
MiniSearch index to `public/data/`. Every chapter, audit claim, protocol,
glossary term, quote, quiz, and devlog entry flows through this pipeline before
the site is built.

## Why the grades are honest

Every notable claim gets a real grade and a real source. UCLA, not Stanford. The
5x flow figure is folklore. The 23-minute refocus number is journalistic. All
of it is verified against `content/reference/verified-facts.md`, the only
allowed source of external claims. The style guide enforces this: no invented
citations, no exaggerated claims, mentor-author tone, no hype.

## What's inside

**Content**
- 28 chapters with key concepts, evidence grades, and protocols
- 30 graded audit claims (A–D/U)
- 13 protocols — named, testable daily practices
- 65-term glossary, 46-quote library
- 90-day roadmap
- Full research document as the Research page
- 5 devlog entries documenting the build

**Reader features**
- Full-text search across chapters, claims, protocols, terms, and quotes
- Continue-reading button with auto-resume scroll position
- Four reader themes: Light, Dark, Deep Work, Cyberpunk
- Font size (85–130%), line-height (tight/normal/airy), font family (Source Serif vs Georgia)
- High-contrast toggle that works across all themes
- Text highlighting — select, mark, persists across sessions
- Keyboard navigation (J/K for chapter flips, Escape to close overlays)

**Progress tracking**
- Chapter completion with reading progress bars
- Knowledge checks at the end of each chapter (3 multiple-choice questions + reflection)
- Daily learning streaks with best-streak tracking
- XP and six progression levels (Apprentice through Grandmaster)
- Nine badges unlocked by real local state
- Schema-validated JSON backup and restore

**All local.** Progress, highlights, quiz scores, reflections, streaks,
bookmarks, theme, and reader settings live in `localStorage` under `levelup-*`
keys. Nothing is sent anywhere.

## Stack

- Next.js 16 static export (GitHub Pages)
- Tailwind v4
- `node:sqlite` build-time data pipeline
- Client-side MiniSearch for full-text search
- `useSyncExternalStore` reactive state in pure TS modules
- GitHub Actions CI: lint, test, build, deploy on every push to `main`

## Development

```bash
npm install
npm run dev          # local dev server (no base path)
npm test             # content + data integrity tests
npm run lint         # eslint
npm run build        # data pipeline + static export into out/
```

`npm run build` runs the data pipeline first, then `next build`. Tests validate
content integrity. CI runs lint, test, build, and deploy on every push to
`main`.

Deployment: GitHub Actions builds with `NEXT_PUBLIC_BASE_PATH=/LevelUp` (the
GitHub Pages path is case-sensitive — learned the hard way) and publishes
`out/` via `actions/deploy-pages`.

## Content rules

`content/reference/style-guide.md` and `content/reference/verified-facts.md`
govern chapter writing: 750–1150-word body prose, honest grades, no invented
citations, no emojis, mentor-author tone.