---
slug: one-creature-many-stores
date: 2026-09-24
title: "Making One Creature Aware of the Whole App"
---

Level Up did not have one giant global state object. That was a good thing for the product and an awkward thing for a persistent companion.

Reading progress, highlights, quizzes, reflections and streaks already lived in small local stores. Goals, roadmaps, tasks, focus sessions and reviews lived in a separate typed operating-system store with its own reducer and completion journal.

The wrong solution would have been to import mascot code into every page.

The companion now has two inputs instead:

```text
small Level Up stores ----> pending domain-event queue
                                   |
OS completion journal ------------+
                                   |
                                   v
                            companion pump
                                   |
                                   v
                              pure reducer
```

The OS adapter keeps a cursor, so the same completed focus session is never replayed just because React rendered again. Smaller stores emit bounded pending events and wake the global runtime with a browser event. Both paths end in the same reducer.

The result is that the visible character knows about the app without owning the app.

That separation matters. A focus page can remain a focus page. A chapter can remain a chapter. Milo only receives the domain fact: **FOCUS_STARTED**, **CHAPTER_COMPLETED**, **QUIZ_FAILED**, **HIGHLIGHT_CREATED**, and so on.

The event journal is also the debugging surface. If the room changes, I can inspect which event caused it instead of guessing which animation fired.
