---
slug: under-the-hood-local-first
date: 2026-08-19
title: "Under the Hood: A Static Site That Thinks"
---

A book about evidence should show its work — and this site is no exception.
Here is what happens under the hood when you open a chapter, search, or
adjust your reading experience.

## Local storage, the only "server"

Every dynamic thing on this page derives from the browser's own storage. No
APIs, no telemetry, no third-party scripts. The key namespaces live under
`levelup-*`:

- `levelup-streak-v1` — current/best streak, last date
- `levelup-quiz-v1` — per-chapter quiz scores `{slug: {score, total, ts}}`
- `levelup-highlights-v1` — array of `{id, slug, quote, createdAt}`
- `levelup-reflections-v1` — `{slug: text}`
- `levelup-progress-v1` — `{slug: {complete, maxScroll, updatedAt}}`
- `levelup-reader-scale` — `1`, `0.85`, `1.15`, or `1.3`
- `levelup-reader-lh` — line-height preset: `tight`/`normal`/`airy`
- `levelup-reader-font` — font family: `source`/`serif`
- `levelup-reader-contrast` — `true` enables a higher-contrast token set

Read/write is orchestrated via `useSyncExternalStore` in
`lib/activity.ts` and `lib/progress.ts`: a store subscribe/emit pattern that
keeps React cellular and persisted across sessions. The core contract is in
`addHighlight`, `saveQuizResult`, `recordActivity`, and `markComplete` — each
reads the current snapshot, mutates it, JSON-stringifies it, and writes it
back. If `window.localStorage` is absent (e.g. private browsing), the fallbacks
are empty arrays/objections so the UI degrades gracefully.

```javascript
// From lib/activity.ts — highlight storage snapshot
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
```

```javascript
// From lib/search.ts — MiniSearch engine bootstrap
import MiniSearch from "minisearch";

export async function getSearchEngine() {
  if (engine) return engine;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${window.location.origin}${base}/data/search-index.json`);
  const docs = (await res.json()) as Doc[];
  engine = new MiniSearch({
    fields: ["title", "sub", "teaser", "text"],
    storeFields: ["id", "type", "title", "sub", "teaser", "url"],
    searchOptions: {
      boost: { title: 4, sub: 2, teaser: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  engine.addAll(docs);
  return engine;
}
```

## How search works

When you press ⌘K (or click the magnifying glass), a Modal opens and
fetches the prebuilt index at `public/data/search-index.json` (generated at
build time by `scripts/build-data.mjs`). MiniSearch initializes on first open
and is cached for the session. Typing ≥2 characters triggers `engine.search(query)`
with fuzzy matching, prefix support, and title/sub/teaser boosting. Results
appear instantly — the entire index is ~30KB and lives in the browser.

## Reader customization

Three knobs live in local storage and affect the `.book-prose` root:

- **Font size** (A−/A+): scales `font-size` via `--reader-scale` (85–130%).
- **Line height** (tight/normal/airy): sets `data-reader-lh`, which maps to
  `line-height` in `globals.css`.
- **Font family** (serif/sans): sets `data-reader-font`, which maps to
  `font-family` in `globals.css`.
- **High contrast** (toggle): sets `data-contrast="high"`, which swaps the
  colour palette in `globals.css` for stronger ink/line contrast and neutralizes
  muted `text-ink-faint` roles.

All four values persist across sessions and are honored on page load without
a round-trip.

## How this was made (AI transparency)

The raw text of the twenty-eight chapters was originally processed by an LLM
to extract key concepts, evidence grades, and protocol references — roughly
20 000 lines of transcript compressed into structured data. The LLM also
helped clean up syntax and format the devlog entries you're reading now.

The architecture, UI, state layer, Navigation accordion, search indexing,
build pipeline, and deployment workflow are all mine. I wrote the
`localStorage` handlers, structured the nested accordion menu, built the
reading progress tracker, and saw the project through from static export to
GitHub Pages deploy. The LLM was a utility for compressing raw transcript text
into structured chapters — not a substitute for hands-on code ownership.

## Demo

<video controls autoplay loop style="max-width: 100%; height: auto;">
  <source src="/devlog/demo-reading-flow.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

<video controls autoplay loop style="max-width: 100%; height: auto;">
  <source src="/devlog/demo-theme-switcher.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

*(Videos are short GIF/MP4 exports of the reading flow and theme/typography
switcher captured via headless Chrome + ffmpeg. They are not embedded in the
live deployed site but appear in this devlog for transparency.)*