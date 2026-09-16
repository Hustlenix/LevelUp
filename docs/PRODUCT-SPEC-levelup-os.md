# LEVELUP — MASTER BUILD PROMPT (Product Spec)

> Source of truth for the LevelUp product direction. This document is the full
> product vision as directed by the founder (2026-09-16). Feature work should be
> planned against this spec, phase by phase, without breaking the existing
> technical foundation.

## ROLE

Lead product architect, UX designer, behavioral-system designer, and senior
full-stack engineer evolving **LevelUp** into a serious personal-development
operating system.

Not a motivational website. Not another habit tracker. Not a generic
productivity dashboard. An **implementation system derived from a 20-hour
self-development source**: the source material is already distilled into a
structured body of knowledge, and the website converts that knowledge into
**real-world action**.

Product goal:

> A person should be able to enter LevelUp, understand what matters, decide what
> they are going to change, execute it every day, review their behavior, learn
> from the system, and become measurably better over time.

The website should feel like a combination of:

**book + operating system + coach + curriculum + execution dashboard +
reflection system + personal laboratory**

Never like:

**AI slop + quote page + generic habit tracker + gamified dopamine machine**

---

## 1. PRODUCT PHILOSOPHY

Pipeline:

```text
SOURCE KNOWLEDGE → DISTILLATION → UNDERSTANDING → PERSONALIZATION →
COMMITMENT → DAILY EXECUTION → MEASUREMENT → REFLECTION → ADJUSTMENT →
LONG-TERM TRANSFORMATION
```

The website exists to close the gap between "I know this." and "I actually live
this." Every important piece of content should answer at least one of:

- What does this mean?
- Why does it matter?
- What evidence supports it?
- What should I actually do?
- How often should I do it?
- How do I know whether I am doing it?
- What happens when I fail?
- How should I adjust?
- How does this connect to the rest of my life?

## 2. EXISTING FOUNDATION — PRESERVE AND BUILD ON IT

Existing knowledge system:

- 28 chapters; four pillars (Self 14, Wealth 8, Health 4, Love 2)
- ~32,000 words; 30 evidence-audited claims; A–D/U evidence grading
- 13 named protocols; 65-term glossary; 46-quote library
- 90-day roadmap; full-text search; chapter knowledge checks; reflection questions

Existing execution/progress features:

- Chapter completion, quiz scoring, XP, levels, badges, daily streak
- Progress dashboard, persistent highlights, bookmarks, reflections
- Reader settings, theme selection, font controls, high-contrast mode
- Keyboard navigation, reading-position restoration, backup/restore
- Local-first persistence

Technical foundation (preserve): Next.js, React, TypeScript, Tailwind, React
Markdown, MiniSearch, static export, GitHub Pages, localStorage, build-time
content compilation, client-side search, service-worker/offline support,
automated CI.

**Extend it intelligently. Reuse everything that works.**

## 3. CORE TRANSFORMATION

OLD: `Read → Quiz → Finish`
NEW:

```text
Learn → Understand → Choose → Commit → Execute → Track → Reflect → Review →
Adapt → Repeat
```

The user should never reach the end of a chapter and think "Cool." Instead the
product asks: "What are you going to do differently because you learned this?"

## 4. FIRST-RUN EXPERIENCE

1. **Why are you here?** — domains (discipline, focus, health, fitness, money,
   career, learning, relationships, confidence, emotional control, time
   management, purpose, personal growth, other). Multiple selections.
2. **Current situation** — lightweight baseline (routines, sleep consistency,
   exercise frequency, focus capacity, study/work consistency, financial
   habits, social habits, screen-time patterns, major obstacle). Not an
   exhausting questionnaire.
3. **What matters most right now?** — force prioritization: one **primary
   mission**, three **secondary areas**.
4. **What are you willing to commit to?** — concrete, measurable commitments
   ("I will train 4× this week.", "I will complete one 50-minute deep-work
   block each weekday.", …).
5. **Establish the baseline** — starting date, goals, starting metrics,
   selected protocols, current streak, initial self-assessment = **Day 0**.

## 5. THE DAILY OPERATING SYSTEM

Home screen = command center. First question: **"What matters today?"**

Daily dashboard shows: today, primary mission, today's critical actions, four
pillars, current streak, today's focus, current active protocol, progress toward
weekly targets, one learning/action recommendation, evening review status.

## 6. THE FOUR PILLARS

SELF (discipline, identity, emotional regulation, confidence, standards, focus,
resilience) · WEALTH (skills, career, business, earning, financial behavior,
leverage, long-term thinking) · HEALTH (exercise, nutrition, sleep, recovery,
physical environment) · LOVE (relationships, communication, friendship, family,
social connection, emotional generosity).

Each pillar: Knowledge, Protocols, Goals, Daily actions, Metrics, Reviews.

## 7. THE CHAPTER SYSTEM

- Chapter header: number, pillar, title, estimated reading time, completion
  status, evidence status.
- Content: use existing distilled content, do not rewrite source unnecessarily.
- Key ideas: concise extraction.
- Evidence: claim, grade, supporting research, uncertainty, limitations,
  source. Never turn weak evidence into certainty; never manufacture citations.
- "So what?" — explicit practical translation for the user's life.
- "Do this" — concrete actions.
- Protocols — activate relevant protocols immediately.
- Knowledge check — retain current quiz.
- Reflection — one meaningful question.
- **Action commitment (new critical component):** "What will you change because
  of this chapter?" → commitment with frequency, duration, why, start date.

## 8. KNOWLEDGE → ACTION ENGINE

Every major concept should be capable of becoming a habit, protocol, task,
rule, reflection, metric, challenge, goal.

```text
Concept → Protocol → Commitment → Schedule → Daily execution → Review
```

## 9. PROTOCOL SYSTEM

The 13 protocols become first-class interactive tools: Purpose, When to use,
Instructions, Duration, Frequency, Difficulty (beginner/intermediate/advanced),
Evidence grade, **START** button → adds to active routines, schedules daily
execution, completion UI, adherence tracking, notes, pause/modify/stop, weekly
review inclusion.

## 10. PERSONAL PROTOCOL BUILDER

Users eventually build their own protocols: name, trigger, behavior, minimum,
target, frequency, failure rule, review schedule.

## 11. HABIT SYSTEM

NOT a checkbox farm. Every habit: purpose, trigger, minimum viable version,
target version, frequency, completion, adherence %, current streak, best
streak, failure history, reflection, trend.

## 12. MINIMUM VIABLE DAY

Clearly visible **MINIMUM DAY** — when life goes badly the user can still
preserve the system (e.g. Health: 5-minute movement; Self: 10 minutes focused
work; Wealth: one meaningful forward action; Love: one meaningful human
connection). Missing one perfect day ≠ collapsed system. Design resilience in.

## 13. FOCUS SYSTEM

Expand the focus sprint: 25/50/90 min + custom. Before: what are you doing, why
does it matter, what is "done"? During: countdown, distraction capture, pause,
interruption logging, minimal UI. After: completed?, what happened?, how
focused?, what will you change next time? Track focus minutes, sessions,
completion rate, interruption count, average session length, weekly trend.

## 14. DAILY PLAN

One major outcome ("Today's WIN") + three important actions + optional actions.
Constant prioritization, no massive task lists.

## 15. TIME BLOCKING

Retain calendar `.ics` export; extend to deep work, workouts, study, learning,
recovery, relationships, reviews. Export without a server.

## 16. MORNING MODE

Focused flow: GOOD MORNING → what matters today (primary outcome) → today's
minimums (4 pillars) → what could derail you (choose) → Start Day. Optional
box breathing / intention setting. Practical, not spiritual/motivational.

## 17. EVENING REVIEW

Every evening: 1) What did you complete? 2) What did you fail to complete?
3) Why? (forgot / lacked time / low energy / distraction / poor planning /
unclear task / underestimated difficulty / external event / intentionally
skipped / other) 4) What worked? 5) What did you learn? 6) What changes
tomorrow? Generate concise daily review, store locally.

## 18. WEEKLY REVIEW

Every 7 days: completed actions, missed actions, focus minutes, protocol
adherence, chapter progress, quiz performance, streak, pillar activity,
strongest area, neglected area, repeated failure patterns, reflections, goals.
Then: What should continue? What should stop? What should change? What matters
next week?

## 19. 30 / 60 / 90 DAY SYSTEM

Day 0 baseline · Days 1–7 Foundation · Days 8–30 Consistency · Days 31–60
Capacity · Days 61–90 Integration. Not claimed as scientifically validated —
presented as the LevelUp implementation structure. Each phase: objective,
active protocols, weekly targets, review criteria, milestone.

## 20. GOALS

Goal, Why, Metric, Baseline, Target, Deadline, Current, Next action. No vague
goals ("Become disciplined" ✗; "Complete 20 focused work sessions by October
15" ✓).

## 21. METRICS

Small set of useful indicators (focus minutes, workouts, sleep consistency,
reading, learning hours, completed commitments, protocol adherence, financial
actions, social actions, reflections, days active). No 50 meaningless metrics.

## 22. PROGRESS ENGINE

Retain XP/levels/badges/streaks but gamification subordinate to actual
behavior. XP only from meaningful actions. No XP for opening the site, no
infinite dopamine loops. Make the user progressively **less dependent on the
app**.

## 23. BADGES

Retain meaningful badges (First Step, Halfway, Finisher, Quiz Master, Three
Days, One Week, One Month, Bibliophile, Scribe) and add execution badges: First
Protocol Completed, 10 Focus Sessions, 7-Day Commitment, 30-Day Commitment,
First Weekly Review, 10 Reflections, Recovered From Failure, Completed 90-Day
Cycle. Achievements must correspond to real behavior.

## 24. FAILURE / RECOVERY SYSTEM

Don't punish streak breaks. On a miss: "You missed yesterday. What happened?
[Reason] What is the smallest action that gets you moving again? [Action]
Resume." Track **Recovery Rate** (e.g. average recovery after missed
commitment: 1.4 days) — can be more meaningful than streak length.

## 25. PERSONAL PATTERN DETECTION

Without AI initially, derive patterns from local data ("You complete focus
sessions more often before noon.", "You frequently miss workouts on days with
3+ commitments."). Descriptive, not pseudo-psychological diagnoses.

## 26. ADAPTIVE SYSTEM

Transparent recommendations with basis ("Your target is 90 minutes. You
completed 25 minutes on 4 of the last 5 sessions. Consider temporarily using a
25-minute minimum."). "You have completed this habit for 14 days. Would you
like to increase the target?"

## 27. PERSONAL DASHBOARD

Where am I? (progress, goals, protocols, phase) · What matters? (mission,
today's outcome, priorities) · Am I actually doing it? (adherence, completed
actions, focus, trends) · What should I change? (review insights, neglected
areas, failed commitments, recommended adjustment).

## 28. KNOWLEDGE GRAPH

Connect Pillar → Chapter → Concept → Evidence → Protocol → Habit → Goal →
Metric. Clicking a concept reveals its relationships. The book becomes a
navigable knowledge system, not isolated pages.

## 29. SEARCH

Retain MiniSearch. Search chapters, concepts, protocols, glossary, quotes,
evidence claims, user's own notes, reflections, goals, actions. Filters:
Knowledge, Protocol, Evidence, Action, My Notes.

## 30. HIGHLIGHTS AND NOTES

Retain persistent highlighting. Add: personal note attached to highlight, tags,
source chapter, date, searchability.

## 31. REFLECTION LIBRARY

Searchable archive of the user's reflections; filter by date, chapter, pillar,
protocol, goal, tag. A personal timeline.

## 32. PERSONAL PLAYBOOK

**MY PLAYBOOK** page: principles, active goals, active protocols, rules,
routines, commitments, lessons, important reflections. The book starts generic;
the Playbook becomes personal.

## 33. PERSONAL RULES

Create rules ("No phone during deep work.", "Train before entertainment.",
"Plan tomorrow before bed.", "Never miss twice."): rule, rationale, date
created, adherence, review date.

## 34. EXPERIMENT SYSTEM

Hypothesis, Duration, Baseline, Variable, Metric → at the end: Result, Evidence,
Reflection, Decision (Keep / Modify / Abandon / Repeat). A personal laboratory.

## 35. EVIDENCE SYSTEM

Every substantive claim: Claim, Evidence Grade (A strong / B moderate / C
weak-mixed / D poorly supported / U uncertain), Source, Confidence,
Limitations. Visual design must never make a D-grade claim feel as
authoritative as an A-grade claim.

## 36. GLOSSARY

Retain; improve cross-linking — a term referenced in a chapter is clickable →
definition, related chapters, related protocols, evidence, user's notes.

## 37. QUOTE LIBRARY

Retain, but quotes support content, never the primary experience.

## 38. THEMES / VISUAL SYSTEM

Retain Light, Dark, Deep Work, Cyberpunk; highly readable. Visual language:
seriousness, clarity, intentionality, craftsmanship, calm, progress. Avoid
excessive gradients, floating blobs, generic SaaS cards, oversized AI
illustrations, excessive glassmorphism, meaningless animations, fake futuristic
UI. Feel like a **personal instrument**: editorial + operating system + field
manual.

## 39. UX PRINCIPLES

1. One primary action per screen. 2. Low cognitive load. 3. Progress visible,
never addictive. 4. The app gets out of the way — goal is life improvement, not
app engagement. 5. Every statistic needs meaning.

## 40. MOBILE

Must be excellent on mobile: daily dashboard, quick completion, focus mode,
habit actions, reflection, protocols, reading. Large touch targets, no
horizontal overflow, no tiny controls, fast interactions.

## 41. OFFLINE-FIRST

Local-first. Core features work without an account and offline: chapters,
search, protocols, habits, focus, goals, reflections, progress, highlights.
Local data stays locally owned unless an explicit future cloud-sync feature.

## 42. DATA ARCHITECTURE

Strongly typed state. Separate content state (immutable/build-generated:
chapters, claims, protocols, glossary, quotes, quizzes) from user state
(mutable/local: progress, goals, commitments, habits, protocol runs, focus
sessions, reflections, notes, highlights, metrics, experiments, preferences).
Versioned schemas, migration paths, no casual key renames.

## 43. BACKUP / RESTORE

Retain schema-validated backup/restore, eventually covering profile, goals,
commitments, habits, protocols, focus sessions, reflections, notes, highlights,
experiments, metrics, quiz scores, progress, badges, streaks, settings.
Validate before import; never partially corrupt user data.

## 44. PRIVACY

Local-first: no account, no tracking, no analytics, no advertising, no
unnecessary APIs, no sale of behavioral data. Privacy is a product feature.
Explain where the user's data lives.

## 45. AI — OPTIONAL, NOT FOUNDATIONAL

Core system works deterministically without AI. AI can later assist with
weekly summaries, reflection synthesis, pattern descriptions, personalized
suggestions, protocol recommendations, goal decomposition. AI must not pretend
to be a therapist/doctor/financial advisor/omniscient life coach.
AI-generated recommendations clearly identified; user retains control.

## 46. HOME PAGE

One sentence: **"Turn the ideas you learn into the life you actually live."**
Supporting: "LevelUp turns a 20-hour self-development source into a practical
system for learning, experimenting, executing, and improving." Show
Learn → Build → Execute → Review → Level Up. No generic landing-page hype, no
fake testimonials, no invented social proof.

## 47. NAVIGATION

Primary: Today, Learn, Protocols, Goals, Focus, Progress, Review, Playbook.
Secondary: Search, Glossary, Quotes, Experiments, Settings, Backup, Devlog.
Don't overload the header; keep mobile nav simple.

## 48. DASHBOARD INFORMATION HIERARCHY

TODAY: primary outcome → critical actions → Minimum Day → active protocol →
focus → progress → review. Execution comes first — not quotes, stats, badges,
random articles, marketing.

## 49. MICROINTERACTIONS

Use sparingly. Good: completion transition, protocol activation, timer state
changes, progress updates, subtle page transitions. Bad: confetti everywhere,
floating particles, bouncing, attention-grabbing effects. Users feel more
focused after using the app, not more stimulated.

## 50. CONTENT QUALITY

> No invented evidence.

For any claim: identify it, determine the evidence, grade it, explain
uncertainty, cite the actual source, separate fact from interpretation,
translate into practical action. The product must be unusually honest vs.
typical self-development websites.

## 51. IMPLEMENTATION PRIORITY

- **PHASE 1 — FOUNDATION:** preserve reader/chapters/search/quiz/evidence/
  highlights/progress/streak/themes/backup; add onboarding, daily dashboard,
  commitments, daily actions, evening review.
- **PHASE 2 — EXECUTION:** protocols, habit system, focus system, goals, daily
  planning, weekly review.
- **PHASE 3 — TRANSFORMATION:** 30/60/90 day system, personal playbook,
  personal rules, experiments, adaptive recommendations, pattern detection.
- **PHASE 4 — POLISH:** UX, mobile, accessibility, performance, animations,
  transitions, keyboard support, empty states, onboarding, recovery flows.

Do not build every feature simultaneously.

## 52. TECHNICAL QUALITY REQUIREMENTS

Gates: `tsc --noEmit`, `eslint`, `npm test`, `npm run build`. No feature is
finished until all pass, responsive behavior verified, keyboard navigation
works, accessibility labels exist, local persistence survives reload,
backup/restore works, no data corruption. Add tests for behavioral logic:
streak calculations, habit adherence, commitment completion, goal calculations,
backup migration, protocol state, date boundaries, recovery behavior, XP,
badges, progress calculations.

## 53. ERROR HANDLING

Never silently fail. On breakage: "Something went wrong. Your saved data is
still intact." Never overwrite valid local data with invalid state. Safe
fallbacks.

## 54. ACCESSIBILITY

Keyboard navigation, visible focus states, semantic headings, aria labels,
screen readers, sufficient contrast, reduced motion, readable typography,
logical tab order.

## 55. PERFORMANCE

Nearly instantaneous. No unnecessary network calls, loading screens,
client/server complexity, giant bundles, repeated computations. Exploit the
local architecture.

## 56. CORE DATA MODEL

Typed structures: UserProfile, Goal, Commitment, Habit, Protocol, ProtocolRun,
DailyPlan, FocusSession, Reflection, WeeklyReview, Highlight, Note, Metric,
Experiment, ChapterProgress, QuizResult, Badge, Streak, ReaderSettings,
AppSettings. Versioned schemas; migrations before adding substantial state.

## 57. DAILY STATE MACHINE

NOT_STARTED → PLANNED → IN_PROGRESS → PARTIALLY_COMPLETE → REVIEW → COMPLETE.
Never force rigid workflows; users can recover from incomplete days.

## 58. THE "ONE THING" SYSTEM

Every day has a clear primary outcome. Ten priorities? Force the question:
"Which one matters most if everything else fails?"

## 59. "NEVER MISS TWICE" RECOVERY

Miss once → understand. Miss twice → investigate. Repeated misses → redesign.
No shame; failure is information.

## 60. THE PRODUCT'S REAL LOOP

```text
READ SOMETHING → UNDERSTAND IT → TEST IT → TRACK IT → REFLECT ON IT →
KEEP / MODIFY / DELETE → BUILD PERSONAL PLAYBOOK → REPEAT
```

## 61. WHAT THE USER SHOULD FEEL

7 days: "I know what I'm working on." · 30 days: "I can see what I actually
do." · 60 days: "I understand my patterns." · 90 days: "I have built a personal
system that works for me." The system gives tools, structure, feedback,
evidence — the user still has to execute.

## 62. NON-GOALS

No social feeds, follower counts, fake leaderboards, motivational spam,
endless quote feeds, fake testimonials, subscription walls, manipulative streak
mechanics, notification addiction, unnecessary accounts, unnecessary cloud
infrastructure, generic AI chatbot homepage, pseudo-scientific personality
scoring, fake "life score", arbitrary productivity scores presented as
objective truth.

## 63. QUALITY BAR

Before shipping any feature: Does this help the user act? understand? measure?
learn? recover? reduce friction? If the answer to all six is no — **don't build
it.**

## 64. FINAL PRODUCT DEFINITION

> **A local-first personal development operating system that converts a large
> body of self-development knowledge into an evidence-aware, executable,
> measurable, and continuously improving personal practice.**

```text
20-HOUR VIDEO → 28-CHAPTER MANUAL → KNOWLEDGE → PROTOCOLS → COMMITMENTS →
DAILY ACTION → DATA → REFLECTION → EXPERIMENTS → PERSONAL PLAYBOOK →
A SYSTEM THE USER CAN ACTUALLY LIVE
```

## 65. DEVELOPMENT INSTRUCTION

Before writing code: inspect the repository completely, understand every page,
component, content pipeline, localStorage schema, and test. Preserve working
behavior. Identify duplicated logic. Define new state model and information
architecture. Create an implementation plan. Build incrementally; for each
feature: Design → Data model → State logic → UI → Persistence → Testing →
Responsive verification.

No fake placeholders. No unfinished systems marked complete. No fabricated
content or evidence. When unsure about intended behavior, infer from the
existing product philosophy and architecture. The standard is not "Does this
look impressive?" — the standard is:

> **"Does this make it easier for a real person to turn knowledge into better
> behavior?"**