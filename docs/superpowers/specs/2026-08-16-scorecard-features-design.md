# Scorecard 9/9 Feature Push — Design Spec

Date: 2026-08-16
Status: Approved by user (design gate)

## Context

Repo `Hustlenix/LevelUp` (live at https://hustlenix.github.io/LevelUp/), static Next.js 16.3.0 export + Tailwind v4 + React 19 on GitHub Pages, basePath `/LevelUp`. Content pipeline: `scripts/build-data.mjs` compiles `content/**/*.md` into SQLite → `public/data/*.json` at build time. `getSiteData()` in `lib/content.ts` serves it server-side.

Goal: lift the project to 9/9 on a judging scorecard (Originality / Technicality / Usability / Storytelling) with local-first features. No backend, no accounts, no new npm deps beyond what exists (MiniSearch already present in `lib/search.ts`).

Already exists (do NOT rebuild): MiniSearch fuzzy full-text search, theme + reader-scale persistence (`levelup-theme`, `levelup-reader-scale`), reading time per chapter, accordion Chapters nav (`components/ChaptersMenu.tsx`, groups in `lib/groups.ts` BOOK_GROUPS), reading progress (`levelup-progress-v1`), bookmarks (`levelup-bookmarks-v1`), evidence GradeBadge pills, group breadcrumb on chapter pages.

House rules (binding): no emojis in UI; `no-print` on UI-only elements; lint rule `react-hooks/set-state-in-effect` ENFORCED (state changes from event handlers / derived values only); localStorage keys prefixed `levelup-`; honest-grading identity; plain-English content voice.

## Delivery: two deployable phases

Phase 1 commit+deploy, then Phase 2 commit+deploy. Both in one session.

## Phase 1 — Reading experience

### 1.1 Knowledge checks (deterministic "Quizzer")
- New build step in `scripts/build-data.mjs` generates `public/data/quizzes.json` from the DB's own chapter data, 3 MCQs per chapter:
  1. "Which of these is a key concept of this chapter?" — correct = one of the chapter's own keyConcepts; distractors = keyConcepts drawn from OTHER chapters (3 distractors).
  2. "What grade does this study get?" — correct = the chapter study's real grade; distractors = real grades not equal to the answer (pick from {A,B,C,D,U}).
  3. "Which protocol belongs to this chapter?" — correct = one of the chapter's protocols; distractors = protocols from other chapters.
- If a chapter lacks studies or protocols, that question is skipped (min 2 questions per chapter).
- Shape: `[{ slug, title, questions: [{ q, options: [{t, correct}], explanation? }], reflection: string }]`.
- `reflection`: one free-form prompt per chapter — template from the chapter's Apply Today section, phrased "Apply one idea from this chapter today. What will you do, and what input will you log?" (no hand-authoring per chapter).
- `site.json` gains a `quizzes` entry; `lib/content.ts`/`lib/types.ts` (`SiteData`) extended.
- Chapter pages (server) pass their quiz to a client component `components/ChapterQuiz.tsx` rendered at the end of the article body: one question at a time, option buttons, instant correct/incorrect feedback, score summary, retry button, and the reflection textarea (saved to `levelup-reflections-v1` as `{ [slug]: string }`). Quiz completion + score stored in `levelup-quiz-v1` as `{ [slug]: { score, total, ts } }`. No-print. `aria-live` for feedback. Buttons not radios (simpler a11y).
- Quiz data must be verified against real chapter data (test 1.7).

### 1.2 Text highlighting
- Client-only, works in all browsers. On selection within the chapter body, show a small floating toolbar ("Highlight" button, gold). Clicking saves `{ id, slug, text, color, ts }` to `levelup-highlights-v1` (array). Id = crypto.randomUUID().
- Renderer `components/HighlightRenderer.tsx`: after mount (and when highlights change), walk the chapter body container with a TreeWalker over text nodes, find the quoted `text` (normalized whitespace; substring match; first unmarked occurrence), wrap in `<mark data-hi="id">`. Skip text nodes already inside a `[data-hi]` mark. Removes existing marks whose id was deleted.
- Click a mark → confirm-less toggle? No — click removes with a tiny undo toast? Keep minimal: clicking a mark removes it (title="Remove highlight"). Count shown in the chapter sidebar ("N highlights" line). All marks styled with gold background (`mark[data-hi]`), dark-mode aware.
- Pure text-finding helper `lib/highlights.ts` (unit-testable, no DOM): `findText(html: string, text: string): number | null` and `normalize(s)`.
- Export/import includes highlights (1.6).

### 1.3 Scroll-spy TOC sidebar
- `components/ChapterToc.tsx` (client): replaces the static "In this chapter" list in the chapter aside. IntersectionObserver watches the section headings; active heading gets gold text + `aria-current`. Headings need stable ids — `components/Markdown.tsx` BookMarkdown gives each `## N — Title` heading `id="sec-<num>"`. Sticky sidebar retained; add `scroll-margin-top` (~7rem) on headings so anchor clicks clear the sticky header.
- Works with the existing "Key Ideas / Apply Today / The Science" list items (they map to section markers in the body; those are rendered inside BookMarkdown as headings too — give them ids as well: `sec-keyideas`, `sec-apply`, `sec-science`).

### 1.4 Keyboard shortcuts
- `components/ChapterKeys.tsx` (client, chapter pages only): `J`/`ArrowRight` → next chapter, `K`/`ArrowLeft` → previous (soft nav via `useRouter().push`). Ignored when event target is input/textarea/select or contenteditable. Listeners attached in `useEffect` (allowed: the lint rule bans setState in the effect body, not listeners).

### 1.5 Group intro banner
- In `app/chapters/[slug]/page.tsx`: when `chapter.number` is the first of its group (1, 12, 16, 21), render a banner card above the header block: "Group N of 4 · {group.name}" + "{message} Chapters {start}–{end}." + a "Back to contents" link. Styled card (`bg-paper-deep`, gold border), `no-print`.

### 1.6 JSON backup / restore
- `lib/backup.ts` (pure, unit-testable): `buildBackup(state)` → `{ schema: 1, exportedAt, theme, readerScale, progress, bookmarks, highlights, quiz, reflections, streak }`; `validateBackup(json)` → `{ ok, errors: string[], data? }` with strict shape checks per key (arrays of expected shapes; ignore unknown keys; reject schema mismatch).
- UI on `components/ProgressView.tsx`: "Backup & restore" section — Export button (Blob download `levelup-backup-v1.json`), Import file input (FileReader → validate → merge-write to localStorage → `location.reload()`). Errors shown inline, no crash.

### 1.7 Phase 1 tests (add to existing node:test suite)
- quizzes.json shape: every chapter has ≥2 questions; correct answers resolve to real data fields (option text of correct option appears in the chapter's own keyConcepts/studies/protocols).
- `buildBackup`/`validateBackup` round-trip with a fixture state; rejects bad shapes.
- `findText`/`normalize` fixtures (whitespace collapse, no match, first occurrence).

## Phase 2 — Engagement + platform

### 2.1 Gamification (all local, derived state)
- `lib/gamification.ts` (pure): 
  - `computeXp(state)` — derived from stored state: +50 per completed chapter, +25 per quiz ≥70%, +10 bonus per perfect quiz, +2 per highlight, +5 per reflection. Level thresholds: 0 Apprentice, 100 Practitioner, 250 Specialist, 500 Expert, 900 Master, 1500 Grandmaster. Level = highest threshold ≤ XP.
  - `computeStreak(activityDates)` — stored separately as `levelup-streak-v1` `{ current, best, last }`, updated on chapter completion or quiz finish (activity event). Rules: same-day repeat no-op; yesterday → current+1; older gap → current resets to 1.
  - `badgesFor(state)` — deterministic rules: first-chapter (≥1 complete), halfway (≥14), finisher (28), quiz-master (all quizzes ≥70%), streak-3/7/30, bibliophile (≥10 highlights), scribe (≥5 reflections). Returns `[{ id, name, blurb, unlocked }]` with unlock dates recorded in `levelup-badges-v1` `{ [id]: isoDate }` (derived check + persisted for stable display).
- Progress page gets a gamification panel: current level + XP bar, streak flame-less counter ("Day N · best M"), badge grid (locked shown dimmed with name + rule). ProgressView is client; computed on mount from stores.

### 2.2 Reader themes
- `app/globals.css`: add `[data-theme="deepwork"]` (warm low-glare paper palette: softer paper, sepia ink) and `[data-theme="cyberpunk"]` (near-black bg, neon cyan/magenta accents, gold kept for identity) variable sets. Must meet AA contrast for body text.
- `components/ThemeToggle.tsx` becomes a 4-way picker (Light / Dark / Deep Work / Cyberpunk) — small label buttons with swatch dots, `aria-pressed`, keyboard reachable; writes `levelup-theme`, updates `data-theme`. `layout.tsx` theme-init script extended to accept the two new values.

### 2.3 PWA offline
- `app/manifest.ts` (metadata route, `force-static`): name, short_name, start_url `"${basePath}/"`, display standalone, theme_color + background_color, icons (existing `icon.svg` + `apple-icon.png`).
- `public/sw.js` (plain JS, no build step): cache name `levelup-v1`; install → precache app shell (home, /chapters/, /progress/, icon files); fetch → network-first for navigations (fallback to cached home shell offline), stale-while-revalidate for `data/*.json`, cache-first for other same-origin GETs (hash-stable assets). Activate → delete old caches. Register from a client component `components/ServiceWorkerRegister.tsx` with `?v=1` param, `process.env.NEXT_PUBLIC_BASE_PATH` prefix, only when `'serviceWorker' in navigator` and `location.protocol === 'https:'` (also skip in dev). Failure is graceful (site works without SW).
- Add `<link rel="manifest">` via the metadata route automatically.

### 2.4 Devlog page (storytelling)
- `content/devlog/*.md` entries with frontmatter `{ date, title, slug }`; parsed by build-data.mjs into `data/devlog.json` (body markdown + date + title).
- `/devlog` page (server): list + full entries styled like chapters (PageShell + BookMarkdown). Footer gains a "Devlog" link.
- Entries: (1) origin story — the "pilot's cockpit" feedback → declutter → accordion nav (quote the user's own feedback, they approved), (2) plain-English rewrite pass, (3) this scorecard push (after Phase 2 lands).
- Screenshots: capture before/after home page with headless Edge or Chrome if available (`msedge --headless --screenshot`) against local static servers (old build from commit `21e1399` in a temp git worktree vs current `out/`), store in `public/devlog/`. If no headless browser exists on the machine, skip screenshots and note it in the entry.

## Verification (every phase)
1. `npm run build` (re-seeds DB + JSON; quizzes/devlog in site.json), `npx eslint .` = 0, `npm test` all pass (8 existing + new).
2. Local smoke on `:3000` (Node static server, trailing-slash → index.html; PS 5.1: `Invoke-WebRequest` Content may be byte[] — UTF8-decode): chapter page HTML contains quiz container + group banner where expected; /progress contains backup section; /devlog lists entries; manifest.json + sw.js reachable.
3. Commit per phase, push, wait ~90s, `gh run list --workflow=deploy.yml` success, live-verify key markers (same checks + quiz HTML marker).

## Error handling
- Import validation returns per-key errors; never writes partial data.
- SW failure/unsupported → site behaves exactly as today.
- Quiz with missing data → question skipped at build time, never at runtime.
- Highlight text no longer found (content changed) → silently skipped, entry retained in storage.

## Explicitly out of scope
Real AI (no API), accounts/cloud sync, leaderboards, quizzes for non-chapter pages, hand-authored question banks, native app packaging, analytics.