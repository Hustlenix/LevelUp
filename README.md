# The Level Up Manual

A book-like website distilling twenty-eight self-development trainings — belief
engineering, identity, focus, discipline, and the one-person business — into a
single manual where **every notable claim is graded against the research**.

Built with Next.js 16 (static export), Tailwind v4, a build-time SQLite data
pipeline (Node's built-in `node:sqlite`), and client-side MiniSearch.

## Live site

https://hustlenix.github.io/levelup/

## What's inside

- **28 chapters** across four pillars — Self (14), Wealth (8), Health (4), Love (2)
- **Verification audit** — 30 empirical claims, each graded A–D/U with the honest
  verdict and the actual source (e.g. it was UCLA, not Stanford; the 5x flow figure
  is folklore; the 23-minute refocus number is journalistic)
- **13 protocols** (2.1–2.13) — named, testable daily practices
- **Glossary** (65 terms), **quote library** (46 quotes), **90-day roadmap**
- **Full research document** rendered as the Research page
- **Search** across chapters, claims, protocols, terms and quotes (⌘K)
- **Reading progress** tracked locally in the browser (no accounts)

## Architecture

Static export only (GitHub Pages), so the "full-stack" layer runs at build time:

```
content/chapters/*.md   ─┐
content/*.json          ─┤→ scripts/build-data.mjs ─→ data/levelup.db (SQLite)
                         │        │
                         │        └─→ public/data/*.json + search-index.json
                         └── Next.js static export (out/)
```

`npm run build` runs the data pipeline then `next build`. Tests (`npm test`)
validate content integrity; CI runs lint → test → build → deploy on every push
to `main`.

## Development

```bash
npm install
npm run dev        # local dev server (no base path)
npm test           # content/data integrity tests
npm run lint       # eslint
npm run build      # pipeline + static export into out/
```

Deployment: GitHub Actions (`.github/workflows/deploy.yml`) builds with
`NEXT_PUBLIC_BASE_PATH=/levelup` (matches the `hustlenix.github.io/levelup/`
Pages URL) and publishes `out/` via `actions/deploy-pages`.

## Content rules

`content/reference/style-guide.md` and `content/reference/verified-facts.md`
govern chapter writing: 750–1150-word body prose, honest grades, no invented
citations, no emojis. The verified-facts file is the only allowed source of
external claims.