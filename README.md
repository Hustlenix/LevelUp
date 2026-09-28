# Level Up

[![Deploy](https://github.com/Hustlenix/LevelUp/actions/workflows/deploy.yml/badge.svg)](https://github.com/Hustlenix/LevelUp/actions/workflows/deploy.yml)
[![Live Release Smoke](https://github.com/Hustlenix/LevelUp/actions/workflows/live-release-smoke.yml/badge.svg)](https://github.com/Hustlenix/LevelUp/actions/workflows/live-release-smoke.yml)
[![PR CI](https://github.com/Hustlenix/LevelUp/actions/workflows/pull-request-ci.yml/badge.svg)](https://github.com/Hustlenix/LevelUp/actions/workflows/pull-request-ci.yml)
![Last commit](https://img.shields.io/github/last-commit/Hustlenix/LevelUp)
![Repo size](https://img.shields.io/github/repo-size/Hustlenix/LevelUp)

**Level Up is a local-first self-improvement and study web app.** It combines a 28-chapter evidence-audited manual with goals, focus sessions, reviews, study tools, progress tracking, backups, and a persistent companion called Milo.

**Live site:** https://hustlenix.github.io/LevelUp/

**Milo demo:** https://hustlenix.github.io/LevelUp/today/?milo=demo

## What is in the project right now?

The app has two main sides.

The first is **The Level Up Manual**. It contains 28 chapters split across Health, Wealth, Love, and Self. The manual also has quizzes, protocols, research notes, an evidence audit, quotes, a glossary, search, highlights, and progress tracking.

The second is the **Level Up workspace**. It adds Today, Goals, Focus, Review, Progress, Portfolio, Roadmap, Backup, Study Mode, and other tools for turning the reading into actual work.

Milo sits across the app as a persistent local companion. Focus sessions, chapter activity, goals, milestones, and other Level Up events can change what Milo is doing and unlock parts of the room.

The core experience does not require an account or application server.

## Current project data

These numbers were read from the generated data and release checks on the current `main` branch.

| Data | Current count |
| --- | ---: |
| Chapters | 28 |
| Audited claims | 30 |
| Protocols | 13 |
| Glossary entries | 65 |
| Quotes | 46 |
| Chapter quizzes | 28 |
| Devlogs | 8 |
| Public routes checked by the release smoke test | 54 |

The content counts come from `public/data/site.json` and `public/data/devlog.json`. The route count comes from `verify-release.mjs`.

## Screenshot

![Level Up homepage](public/devlog/after-home.png)

## Main features

- Read and search all 28 chapters.
- Complete chapter quizzes and save reflections.
- Save highlights and bookmarks locally.
- Create goals, roadmaps, milestones, tasks, and focus sessions.
- Use Today as the daily workspace.
- Complete daily and weekly reviews.
- Track progress, XP, streaks, and badges.
- Use Study Mode with a personal plan, daily mission, XP, and optional local Ollama help.
- Export and restore local data from the Backup page.
- Use Milo, the persistent companion linked to real activity inside the app.
- Run without a login for the core experience.
- Install/use the static site from GitHub Pages.

## Tech stack

The versions below match the current `package.json`.

| Tool | Version |
| --- | --- |
| Next.js | 16.3.5 |
| React | 19.2.8 |
| TypeScript | 6.0.3 |
| Tailwind CSS | 4.3.3 |
| MiniSearch | 7.2.0 |
| Motion | 13.2.0 |
| Playwright | 1.63.0 |
| Node used in CI | 24 |

The production build is a **Next.js static export**. GitHub Pages serves the generated `out` directory with the `/LevelUp` base path.

## Getting started

### Requirements

Install:

- Node.js
- npm
- Git

### Clone the project

```bash
git clone https://github.com/Hustlenix/LevelUp.git
cd LevelUp
```

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Build the static production version

```bash
npm run build
npm start
```

## Validation

The pull-request workflow runs lint, tests, and a production build.

You can run the same checks locally:

```bash
npm run lint
npm test
npm run build
```

The deployed site also has a Playwright release smoke test:

```bash
npx playwright install chromium
PLAYWRIGHT_BASE_URL=https://hustlenix.github.io/LevelUp node verify-release.mjs
```

The current smoke test checks every public route plus search, quiz persistence, practice records, the Goals → Today → Focus flow, backup/restore, the 13-plan protocol library, responsive layouts, and Milo's deterministic demo.

## Local data and privacy

Most personal state is stored on the device in browser storage.

The app supports exporting and restoring that state from the Backup page.

Google Analytics is optional. It only runs when a `NEXT_PUBLIC_GA_ID` is supplied at build time. The analytics module only accepts a small whitelist of non-content event fields and does not send notes, reflections, highlight text, search text, Milo state, or other browser-storage content.

## Deployment

Pushes to `main` run the GitHub Pages workflow:

1. install dependencies
2. lint
3. test
4. build the data pipeline and static site
5. deploy `out` to GitHub Pages
6. run the live Playwright smoke test against the deployed site

The badges at the top of this README show the current workflow status directly from GitHub Actions.

## Useful paths

```text
/                    Home / manual front door
/chapters/           All chapters
/today/              Daily workspace
/goals/              Goals and roadmaps
/focus/              Focus sessions
/review/             Reviews
/progress/           Progress
/portfolio/          Portfolio
/study/              Study Mode
/backup/             Export / restore
/audit/              Evidence audit
/research/           Research notes
/protocols/          Protocol library
/devlog/             Devlogs
```

## License

The written site content is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

See [LICENSE](LICENSE) for the full license text and repository-specific details.

The source code is not included under that content license unless explicitly stated.
