# Level Up Manual

**A 28-chapter self-development book where every claim is graded against the
evidence — built from a 20-hour video transcript, running entirely in your
browser.**

https://hustlenix.github.io/LevelUp/

---

## Project Story

Level Up Manual started with a single question: what if you could turn a
20-hour self-development video into something you could actually read, search,
and come back to? Not a summary, not a blog post — a real book, with every
claim graded against the research it cites, running without accounts, APIs, or
anyone tracking you.

The result is 28 chapters across four pillars (Self 14, Wealth 8, Health 4,
Love 2), roughly 32k words, a 30-claim evidence audit, 13 named protocols, a
65-term glossary, and a 46-quote library. Your reading progress, quiz scores,
highlights, streaks, and preferences all live in your browser's localStorage.
Nothing leaves your machine.

---

## Inspiration

The source material is a 20-hour video by a founder and content creator:

https://www.youtube.com/watch?v=wvaY5bG5p7A&t=65s

The ideas in that video are worth organizing, but the format makes it hard to
reference, search, or revisit specific claims. The original motivation was
simple: make something the author would actually use — a book you could
search, highlight, pick up where you left off, and verify for yourself.

A secondary motivation was the state of self-development content online: most
sites are designed to sell courses, not to be honest about what the evidence
actually supports. Level Up Manual grades every notable claim on a letter scale
(A through D/U) and shows its work.

## What it does

Level Up Manual is a static book-like site with:

- 28 chapters with key concepts, evidence grades, and named protocols
- 30 audit claims graded A–D/U against a verified-facts file
- 13 protocols — testable daily practices you can run one at a time
- 65-term glossary and 46-quote library
- 90-day roadmap for applying the content
- Full-text search (MiniSearch) across all content
- Knowledge checks at the end of each chapter (3 questions + reflection)
- Progress tracking: chapter completion, quiz scores, XP, badges, streaks
- Four reader themes: Light, Dark, Deep Work, Cyberpunk
- Typography controls: font size, line-height, font family, high-contrast toggle
- Text highlighting that persists across sessions
- Keyboard navigation (J/K chapter flips, Escape to close)
- Schema-validated JSON backup and restore
- Devlog hub documenting the build

Everything runs locally. Your data stays in your browser.

## How we built it

The transcript was ~20k lines. It got compacted into Claude until tokens ran
out. Then Gemini ran out of tokens too. Opencode finished the summary across a
few more passes. From there, the site was built in layers:

**Content pipeline.** `scripts/build-data.mjs` compiles Markdown chapters into
SQLite using Node's built-in `node:sqlite`, then emits JSON data files and a
~30KB MiniSearch index to `public/data/`. Every chapter, audit claim, protocol,
glossary term, quote, quiz, and devlog entry flows through this pipeline.

**Reader.** Next.js 16 static export to GitHub Pages. Tailwind v4 for styling.
`useSyncExternalStore` for reactive local state in pure TypeScript modules with
no React imports and SSR-safe fallbacks.

**Progress system.** LocalStorage under `levelup-*` keys: highlights, quiz
scores, reflections, streaks, bookmarks, reader settings. A `backup.ts` module
validates imports against a typed schema before writing anything.

**Deploy.** GitHub Actions runs lint, tests, build, and deploy on every push to
main. The build uses `NEXT_PUBLIC_BASE_PATH=/LevelUp` (the GitHub Pages path
is case-sensitive, which was learned the hard way) and publishes via
`actions/deploy-pages`.

## Challenges we ran into

**The QuoteCard CI spiral.** A React 19 client component was added to the home
page. Locally: build green, 22/22 tests, eslint clean. GitHub Actions failed
eight runs in a row with the same type error (`TS7006` — parameter implicitly
has `any` type). Every fix pushed identically failed. It was never a code bug;
it was the build environment disagreeing with us. The feature that caused it
was deleted rather than shipped broken. It ate an entire day.

**Turbopack's quiet type-checking.** The dev server uses Turbopack, which does
not run full type-checking. Three real type errors shipped in a PR that built
locally but failed in CI. Same lesson: `tsc` locally, or CI will explain the
difference between "builds" and "types."

**The header overflow.** A reported "distortion" in the nav turned out to be
flexbox crushing the brand text into stacked words at mid-widths because the
container was too narrow for a single row. Fix: a two-row desktop header with
`shrink-0 whitespace-nowrap` on the brand. Verified across seven viewport
widths.

**The empty line in the recap.** A Markdown file had a blank line before a
bulleted list. React rendered the bullet as raw text (`* thing`) instead of a
list. Caught in CI, fixed in one commit. Sometimes the smallest bugs look the
most alarming.

## Accomplishments that we're proud of

- **Honest grading.** Every notable claim is graded A–D/U against a single
  verified-facts file. No invented citations. UCLA, not Stanford. The 5x flow
  figure is folklore. The 23-minute refocus number is journalistic. The site
  says so.

- **Zero tracking by design.** No accounts, no APIs, no analytics, no cookies.
  Progress lives in localStorage. The data model is the entire user experience.

- **Full-featured without a backend.** Search, quizzes, highlights, streaks,
  badges, backup/restore, reader controls — all client-side, all offline-capable.

- **A build pipeline that compiles content into SQLite.** The data layer is not
  a pile of JSON files. It is a compiled artifact from Markdown, with a search
  index, served statically.

- **The devlog.** Five entries documenting the build honestly, including the
  day-long CI spiral and the decision to delete rather than keep fighting. A
  book about evidence shows its own work.

## What we learned

- Turbopack is fast but does not replace `tsc`. If it builds locally and fails
  in CI, the first thing to check is whether the dev server is actually running
  the full type-check.

- GitHub Pages serves paths case-sensitively. `LevelUp` and `levelup` are
  different. This is not obvious until it is too late.

- CI failures that reproduce identically across ten runs on a clean tree are
  usually environment disagreements, not code bugs. Sometimes the right move is
  to stop fixing and ship what you have.

- A feature that causes an eight-run CI spiral is a feature that is not ready.
  Deleting it was the right call. The home page is better for it.

- React renders Markdown bullets as raw text if there is a blank line before
  the list. This is technically correct behavior from the Markdown parser. It
  is also deeply annoying.

## What's next for Level Up Manual

- Continued content refinement and protocol expansion
- Additional reader features as they prove useful
- Ongoing evidence grading as new research emerges
- The devlog continues

## Try it out

**Live site:** https://hustlenix.github.io/LevelUp/

**Source code:** https://github.com/Hustlenix/LevelUp

**Run locally:**
```bash
git clone https://github.com/Hustlenix/LevelUp.git
cd LevelUp
npm install
npm run dev
```

**Tech stack:** Next.js 16, Tailwind v4, node:sqlite, MiniSearch, GitHub Pages