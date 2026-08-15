# Level Up

Live site: https://hustlenix.github.io/LevelUp/

This is my trust-worthy, non-tracked website for leveling up in your life. It
somehow works without any login or stuff — the tracking just works, but it
never leaves your browser. Progress lives in `localStorage` on your machine. No
accounts, no sign-in, none of that boring email auth, no corporates tryna track
you. Just chapters that remember where you stopped.

## How I built this

It started with a 20-hour video that is totally worth it:

https://www.youtube.com/watch?v=wvaY5bG5p7A&t=65s

I wanted the whole thing as something I could read, search, and actually come
back to. So I got the transcript of that video — 20k lines. Then I pasted it
into Claude to compact it, and it ran out of tokens. I tried Gemini too, sadly
it too ran out of tokens. Lastly I tried Opencode a few times, and it finally
gave me the summary for this.

After a few hours I finished the website, pushed the code to GitHub, branched
it real good, and finally started a build and deploy workflow in Actions and
got this running.

That transcript is the reason the site is built the way it is: 28 chapters
(Self 14 / Wealth 8 / Health 4 / Love 2), around 32k words, plus a glossary, a
quote library, and a 90-day roadmap. It's a book, basically — but one you can
⌘K through.

## Why the grades are honest

Every notable claim in the content is graded A–D/U with the real verdict and
the real source. No invented citations, no vibes-based research. For example:
it was UCLA, not Stanford; the 5x flow figure is folklore; the 23-minute
refocus number is journalistic. Every external claim is verified against
`content/reference/verified-facts.md` — the only allowed source of external
claims. That's the whole ethos of this project: grades are honest, claims are
sourced.

## What's inside

- 28 chapters across four pillars — Self (14), Wealth (8), Health (4), Love (2)
- 30 graded audit claims (A–D/U, honest verdicts)
- 13 protocols — named, testable daily practices
- Glossary (65 terms), quote library (46 quotes)
- 90-day roadmap
- Full research document rendered as the Research page
- Search across chapters, claims, protocols, terms and quotes (⌘K)
- Reading progress in your browser only (localStorage, no accounts)

## Reading experience

Because this is a book you read over weeks, not a blog you skim:

- Dark mode toggle (persisted, no flash on load)
- Typography controls for comfortable reading
- Continue-reading button + auto-resume scroll position
- Progress per chapter, kept in your browser

## Stack

- Next.js 16 static export (GitHub Pages)
- Tailwind v4
- Build-time data pipeline: `scripts/build-data.mjs` compiles the content into
  SQLite (Node's built-in `node:sqlite`) and emits `public/data/*.json` plus
  the search index
- Client-side MiniSearch for ⌘K search
- `localStorage` for reading progress — no backend, no tracking
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)

## Development

```bash
npm install
npm run dev        # local dev server (no base path)
npm test           # content/data integrity tests
npm run lint       # eslint
npm run build      # data pipeline + static export into out/
```

`npm run build` runs the data pipeline first, then `next build`. Tests validate
content integrity. CI runs lint → test → build → deploy on every push to `main`.

Deployment: GitHub Actions builds with `NEXT_PUBLIC_BASE_PATH=/LevelUp` (matches
the `hustlenix.github.io/LevelUp/` Pages URL — GitHub Pages serves the
repo-name path case-sensitively, which I learned the hard way) and publishes
`out/` via `actions/deploy-pages`.

## Content rules

`content/reference/style-guide.md` and `content/reference/verified-facts.md`
govern chapter writing: 750–1150-word body prose, honest grades, no invented
citations, no emojis.

STAY HARD GNG!!!!!!!!