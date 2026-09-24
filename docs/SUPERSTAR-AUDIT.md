# Super Star transformation audit

This audit was written before the visible companion layer was integrated. Its purpose is to protect the parts of Level Up that already work and keep the transformation focused on identity rather than feature count.

## KEEP

### Content and evidence system
- 28-chapter source structure across four pillars
- evidence grading and audit data
- protocols, glossary, quotes, quizzes, and learning guides
- compiled content/search pipeline

These are Level Up's credibility layer. The companion must never dilute them.

### Today-first operating system
- `/today` next-action flow
- goals -> roadmaps -> milestones -> tasks -> sessions
- focus sessions and interruption/recovery records
- daily/weekly review evidence

This is the most useful behavioral spine of the product and provides high-quality domain events.

### Local-first architecture
- typed OS store and reducer
- schema validation and migrations
- local progress/activity stores
- rollback-safe backup/restore
- static GitHub Pages deployment
- service worker/offline support

This architecture is the reason a persistent companion can exist without accounts or a backend.

### Learning and student tools
- reader controls
- full-text search
- highlights
- quizzes and reflections
- Study Mode
- progress, streaks, badges, portfolio

These already generate meaningful actions. They should become inputs to the living world rather than be replaced by new dashboards.

### QA and release discipline
- Node test suite
- Playwright release verifier
- lint/build/test deployment pipeline

The companion engine should increase the amount of testable logic, not hide behind animation.

## IMPROVE

### Progress representation
Before: mostly numbers, cards, charts, XP, and completion states.

After: keep those inspectable records, but add a room whose objects and state are driven by the same underlying evidence.

### Cross-product event awareness
Before: each feature knew about its own store; companion foundation existed but had no mounted runtime.

After: OS completion journal + pending event queue feed one reducer. The global runtime is the adapter boundary, so unrelated pages do not own mascot code.

### Companion settings
Before: engine settings existed for enabled, motion, dialogue, and sound, but no global UI exposed them.

After: Companion Space exposes enabled state, Full/Reduced/Off motion, Normal/Minimal/Off dialogue, sound, and interaction. Legacy settings are migrated additively.

### Technical storytelling
Before: README still framed Level Up primarily as a manual.

After: README leads with the local-first operating system and explains the event -> reducer -> behaviour -> world architecture.

### Reviewer comprehension
Before: understanding the project required exploring many routes and accumulating real local data.

After: a disposable deterministic fixture demonstrates the production reducer and event journal in a few clicks without modifying saved state.

## REFACTOR

### Companion foundation -> runtime
The existing `lib/companion` implementation was worth keeping. It already had deterministic PRNG, replay-safe events, reducer logic, unlock rules, persistence, migrations, and tests.

The refactor is architectural integration, not replacement:

```text
existing local stores
      |
      +-- OS completion journal
      +-- pending companion events
      |
      v
companion pump
      |
      v
pure reducer
      |
      v
visual behaviour selector
      |
      v
global CompanionLayer
```

### Failure semantics
Internal negative trait deltas for failed quizzes, interrupted focus, and broken streaks were removed. Those events remain useful information, but they no longer quietly lower relationship/confidence/mood in ways that could turn the character into a guilt mechanic.

## HIDE / DE-EMPHASIZE

No strong feature was deleted merely to make the redesign look dramatic.

Instead, the transformation deliberately avoids making secondary tools the main story. Experiments, extra dashboards, themes, AI helpers, and monetization-style ideas are not the Super Star narrative. They can remain available where already useful, but the primary experience is:

1. know what to do next
2. do real work
3. keep evidence
4. watch the same progress change a living world

Unfinished monetization, social-feed, leaderboard, and generic chatbot work should not be added to this branch.

## Main gap found during the audit

The repository already contained a surprisingly mature companion core and tests, but no global component mounted that engine into the product. In other words, the technically interesting half existed while the memorable half was invisible.

This transformation focuses on closing that gap instead of rebuilding working systems.
