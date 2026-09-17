# Study Mode — Phase 1 Foundation: Design Spec

- **Date:** 2026-09-16
- **Status:** Draft for review
- **Scope:** Phase 1 of the LevelUp personalization upgrade
- **Approach:** A — Study Mode as its own area (user-approved 2026-09-16)

---

## 1. Context

LevelUp is a static Next.js app (App Router, React 19, Tailwind v4, TypeScript, static export to `out/` served from GitHub Pages under `/LevelUp`). All runtime state is client-side:

- `lib/progress.ts` — reading progress + related state, `useSyncExternalStore` pattern (subscribe/write/emit), persisted to `localStorage` key `levelup-progress-v1`.
- `lib/gamification.ts` — XP, levels, streaks (read-only from new code).
- `lib/actionTools.ts`, `lib/activity.ts`, `lib/dates.ts` — utilities; both frozen.
- `lib/analytics.ts` — GA4 adapter, **dormant by design** until `NEXT_PUBLIC_GA_ID` is set at build time.
- Design system: `components/ui.tsx` (PageShell, SectionHeading…) with gold/ink/paper tokens; themes light/dark/deepwork/cyberpunk.

**Frozen files (read-only, must not be modified):** `lib/actionTools.ts`, `lib/activity.ts`, `lib/progress.ts`, `lib/gamification.ts`, `lib/dates.ts`, `lib/analytics.ts`, and all event-wiring code. `backup.ts` is **not** frozen — it may be extended so the new profile rides along with existing backups (additive only).

**Key fact:** the current app is a self-improvement book (28 chapters, quizzes, focus sprints). It contains no CBSE/school curriculum content. The curriculum layer is net-new: user-built data (board → grade → subject → chapter → topic → tasks → completion), user-defined content trees, **no hardcoded curriculum DB**.

Deploy: `.github/workflows/deploy.yml` runs lint → test → build (`NEXT_PUBLIC_BASE_PATH=/LevelUp`) → deploy-pages. Live: https://hustlenix.github.io/LevelUp/ (HEAD = origin/main = `16106c0`, clean tree).

## 2. Goal

Phase 1 delivers the personalization **foundation** — the engine, the student profile, onboarding, and the personalized Study Mode home — as a clean extension. Nothing in the existing app breaks; existing users' data keeps working; everything stays private on-device.

## 3. Non-goals (deferred to later phases)

- Adaptive study plan generator and daily adaptation (Phase 2)
- Full curriculum tree UX beyond what onboarding needs (Phase 2)
- Focus Mode mission-wiring (Phase 3)
- Student portfolio/analytics view (Phase 3)
- Parent/guardian mode (Phase 4)
- Livestream "Study With Me" UI (Phase 4)
- Curriculum database / content authoring beyond manual entry (Phase 2+)

## 4. Architecture

### 4.1 Personalization engine — `lib/studentProfile.ts` (new)

Mirrors the `lib/progress.ts` store pattern (subscribe/emit + `useSyncExternalStore`):

- localStorage key: `levelup-studentProfile-v1` (new key; existing keys untouched).
- Central `studentProfile` object — single source of truth for ALL Study Mode screens. No hard-coded per-user values anywhere in Study Mode UI.
- Schema (versioned `schemaVersion: 1` + migration hook):

```ts
interface StudentProfile {
  schemaVersion: 1;
  onboarded: boolean;           // onboarding completed (or explicitly declined)
  identity: {
    name: string;               // optional; "" = use generic greeting
    age: number | null;
    grade: string;              // free-form + optional board/curriculum
    board: string | null;       // CBSE | ICSE | State Board | GCSE | IGCSE | NIOS | IB | Other | custom
  };
  subjects: Array<{
    id: string;                 // stable id
    name: string;
    isWeak: boolean;            // flagged as weak area
  }>;
  exams: Array<{
    id: string;
    subjectId: string;
    date: string;               // ISO date; null = no fixed date
  }>;
  schedule: {
    studyDays: number[];        // 0=Sun … 6=Sat
    preferredMinutesPerDay: number;  // e.g. 60
    preferredSessionMinutes: 25 | 50 | 90;  // focus-sprint length
  };
  preferences: {
    sound: 'silent' | 'lofi' | 'ambient';
    showQuotes: boolean;
  };
  goals: {
    weeklyStudyMinutes: number | null;  // optional self-set target
  };
  created: string;              // ISO timestamp
  updated: string;              // ISO timestamp
}
```

- Pure helpers exported for testing:
  - `defaultProfile()` — fresh profile with schemaVersion 1.
  - `loadProfile()` / `saveProfile(p)` — localStorage read/write with try/catch, corrupt-data → fresh profile + console warning.
  - `updateProfile(patch)` / `resetProfile()` — write paths used by UI.
  - `getProfileAgeTier(profile)` → `'child' | 'teen' | 'adult'` (≤12 / 13–17 / 18+; thresholds configurable constants).
  - `todayMission(profile, now)` → deterministic Mission object (see §5).
  - Backup integration hooks: `toBackupPayload()` / `fromBackupPayload(data)`.

### 4.2 Onboarding — `components/study/OnboardingWizard.tsx` (new) + `app/study/` pages

- **Entry:** new **Study Mode** section in main nav; first visit to `/study/` (or `/study/onboarding/`) shows onboarding; **Skip Study Mode** always available (writes `onboarded: false` → Study Mode home shows a lightweight "How your study plan works" card instead; existing app unchanged).
- **Editable later:** `app/study/settings/` page to view/edit/delete profile anytime (§1 satisfaction: onboarding is skippable AND editable).
- **4 steps** (progressive disclosure — never asks what isn't needed):
  1. Who am I: name (optional), age (optional: powers age tier + grade wording), grade/board.
  2. My subjects: add subjects, mark weak areas. (Phase 1 records weak flags only; strengths are implied as not-weak. A full strengths/weaknesses list is Phase 3 §9.)
  3. My schedule & focus: study days, preferred minutes/day, session length (25/50/90), sound.
  4. Goals & extras: weekly minutes target (optional), show quotes toggle.
- **Progressive disclosure:** later steps are optional; any step can be skipped; completion = `onboarded: true`.

### 4.3 Study Mode home — `app/study/page.tsx` + `components/study/StudyHome.tsx`

- Greeting by time of day + name.
- **Today's Mission** card: deterministic, from §5.
- **Progress tiles** — read existing systems read-only:
  - streak (from gamification read API),
  - XP / level,
  - consistency (reading progress store read-only),
  - exam countdown (from `profile.exams`; nearest upcoming exam, "12 days to Math exam").
- **Age-tier UI density (§3):** `child` → simplified header/tiles, bigger type, ONE mission, no analytics jargon; `teen`/`adult` → full tiles + weekly goal progress.
- **Grade-aware wording (§4):** mission and greeting labels come from a tiered wording map in the engine (e.g., child → "Let's review your science lesson", teen/adult → "Mission: Review [subject]"), so the same engine produces age-appropriate copy.
- Empty/onboarding-declined state: helpful "set up your study plan" card with CTA to `/study/onboarding/`.

### 4.4 Today's Mission (Phase 1 deterministic version)

`todayMission(profile, now)` — pure, testable, no fabricated data:

1. Determine "school day" from `schedule.studyDays` (default weekdays).
2. Mission types (cycle with preference):
   - **Review concepts** (default),
   - **Solve N practice questions** — N from deterministic suggestion `max(5, floor(preferredMinutes / 5))` (no question bank — we never fabricate content; the task says "practice questions" as an action the student chooses),
   - **Review mistakes**, (Phase 1: only if profile has no mistake data → falls back to Review)
   - **Focus sprint** (session length from preferences).
3. Weight weak subjects: if any `isWeak` subject exists, mission targets a weak subject cyclicly (rotate by day-of-year mod subject count).
4. Exam within 14 days → mission switches to **Revision mode** for that subject.
5. Cap time at `preferredMinutesPerDay`.
6. Optional `weeklyStudyMinutes` goal → show "X of Y minutes this week". Phase 1 tracks this with a minimal in-profile counter (a "+1 session" button on the Mission card adds the session length). Focus-sprint auto-wiring is deferred to Phase 3.

### 4.5 Privacy (spec §14, Phase 1 scope)

- All data stays on-device (localStorage). No server, no account, no cloud.
- No location, no unnecessary PII. Name/age/grade collected only because the spec's personalization needs them; all optional.
- Analytics: profile data NEVER sent to GA. Existing `lib/analytics.ts` stays dormant unless `NEXT_PUBLIC_GA_ID` is provided at build time (user supplied `G-8XYX364FLC` on 2026-09-16 — activation happens only via that env var; see §9).
- Livestream/parent data: Phase 3/4 concern, profile stays private; no exclusivity obligations entered now.

### 4.6 Backup integration (additive)

`backup.ts` export: append `{ studentProfile }` (only if a profile exists). Import: restore profile when present; validate shape; ignore gracefully if absent (old backups keep working). Tests cover round-trip + legacy backup without profile.

## 5. Tests & verification (definition of done)

- New `tests/studentProfile.test.mjs` (+ extend to include backup round-trip):
  - default profile shape + schemaVersion,
  - save/load round-trip; corrupt JSON → fresh profile,
  - age-tier boundaries (12/13/17/18),
  - `todayMission`: school day vs off day; weak-subject rotation; exam-within-14-days → revision; no fabrications (N deterministic),
  - onboarding skip → `onboarded:false` path renders fallback,
  - backup payload append + legacy restore (no profile → ignored).
- Full gates (existing scripts): `npx tsc --noEmit`, `npm run lint`, `npm test` (node --test; tests/*.test.mjs), `npm run build`.
- UI checks: `/study/` onboarding → home; skip path; settings edit; mobile viewport (child tier bigger type); existing pages still render (verify-* harnesses + serve-static).
- No deploy/push — leave working tree uncommitted for review.

## 6. Files

**New:** `lib/studentProfile.ts`, `components/study/OnboardingWizard.tsx`, `components/study/StudyHome.tsx`, `components/study/MissionCard.tsx`, `components/study/ProgressTiles.tsx`, `app/study/page.tsx`, `app/study/onboarding/page.tsx`, `app/study/settings/page.tsx`, `tests/studentProfile.test.mjs`.

**Modified:** `components/Nav.tsx` (add Study Mode link), `lib/backup.ts` (additive profile section), possibly `components/ui.tsx` (only if a shared Study tile component is needed — prefer composing existing primitives first).

**Frozen (must NOT change):** `lib/actionTools.ts`, `lib/activity.ts`, `lib/progress.ts`, `lib/gamification.ts`, `lib/dates.ts`, `lib/analytics.ts`, event-wiring code.

## 7. Design principles honored

- Extension, not rebuild; existing nav/features/data preserved.
- Reuse existing design system primitives (PageShell, SectionHeading, tokens, themes).
- Never fabricate unsupported functionality (no question bank, no auto-generated curriculum, no fake AI).
- Real student product, not a children's game: younger = simpler/bigger/calmer; adolescents/adults = full feature density.
- Light gamification only (existing streak/XP read-only; no new points systems in Phase 1).

## 8. Out of scope reminders (to avoid scope creep)

No adaptive planner, no curriculum DB, no parent mode, no livestream, no new analytics events wiring, no question bank, no content authoring.

## 9. Analytics activation note (separate small change, pending user go-ahead)

User provided GA4 measurement ID `G-8XYX364FLC` (2026-09-16). `lib/analytics.ts` is dormant until `NEXT_PUBLIC_GA_ID` is set. Activation = add the ID to the build env (GitHub Actions variable / `.env.local` for local builds) and redeploy. This is a deploy-time change; it is NOT part of this spec's code work and requires explicit deploy approval per workspace rules. No consent-banner work is scheduled (no ads; measurement only); EEA consent-mode guidance noted for a future phase if the user wants it.