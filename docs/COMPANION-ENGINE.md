# Living Companion Engine

Level Up's companion is not a chatbot and not a decorative sprite. It is a deterministic, local-first simulation driven by the same actions that already power the rest of the app.

## Data flow

```text
LEVEL UP ACTIONS
       |
       v
 DOMAIN EVENTS
       |
       v
 PENDING EVENT QUEUE  <---- OS completion journal
       |
       v
 COMPANION PUMP
       |
       v
 PURE STATE REDUCER
       |
       +----------+-----------+
       |          |           |
       v          v           v
    TRAITS     UNLOCKS    EVENT JOURNAL
       |          |           |
       +----------+-----------+
                  |
                  v
         BEHAVIOUR SELECTOR
                  |
       +----------+-----------+
       |          |           |
       v          v           v
   ANIMATION   DIALOGUE    ROOM STATE
```

Everything above runs in the browser. No account, backend, or model call is required.

## Why two event sources?

Level Up already has a typed operating-system store for goals, roadmaps, tasks, sessions, and reviews. Durable completion events are recorded there. Other parts of the product — chapter reading, quizzes, highlights, reflections, and protocols — use smaller local stores.

The companion therefore has two adapters:

1. **OS journal adapter** — converts durable OS completion records into companion events exactly once using an adapter cursor.
2. **Pending event queue** — captures client-side events from smaller stores and drains them on the next companion pump.

Both paths end in the same reducer and event journal.

## Replay safety

Every event has a stable ID. The reducer ignores an ID already present in the companion journal. OS adapters also track the last consumed event index and completed milestone count.

This matters for an offline-first app: a refresh, re-render, or route change must not grant the same unlock twice.

## State

The persisted state currently tracks:

- identity and deterministic seed
- energy, mood, curiosity, focus, knowledge, confidence, relationship
- current activity
- room variant and unlocked objects
- recent event journal
- cooldown timestamps
- aggregate stats
- adapter cursors

The schema is versioned and validated before writes. Malformed state falls back safely; compatible v1 state is repaired additively.

## Behaviour priority

Visible behaviour follows a strict priority order:

1. high-priority transient reactions, such as a milestone celebration
2. active focus session
3. recovery state
4. night rest
5. chapter-aware reading behaviour
6. deterministic ambient behaviour

Chapter context is metadata-driven. Health content can produce stretching, Wealth content can produce ledger work, Love content can produce writing, and Self content can produce reading/thinking without scattering route checks across the app.

Ambient selection is deterministic for a given companion seed and idle tick. That makes behaviour testable while still avoiding a repetitive loop.

## Unlocks

The room is a second representation of progress, not a separate game economy.

Examples:

- first completed chapter -> book
- five completed focus sessions -> desk lamp
- ten highlights -> corkboard
- first roadmap milestone -> trophy shelf
- completed pillar -> pillar-specific room change

Unlock ownership is the gate, so an item cannot be granted twice.

## Privacy

Companion state lives in localStorage with the rest of Level Up's local data. Backup/restore includes the companion state and pending event queue. Core behaviour never requires Ollama or another AI provider.

If site analytics are enabled at build time, only the existing analytics whitelist is sent. Companion traits, room state, journal contents, dialogue, and local memory are not analytics payloads.

## Accessibility and motion

The companion can be disabled completely. Users can choose Full, Reduced, or Off motion; a system `prefers-reduced-motion` request caps Full at Reduced. Dialogue and interaction can also be disabled independently.

The companion is supplementary. Critical Level Up state is never communicated only through animation.

## Reviewer demo

The Companion Space includes a deterministic reviewer demo. It runs the production reducer against a disposable in-memory fixture:

1. start focus
2. complete focus
3. open a Health chapter
4. complete the chapter
5. reach a roadmap milestone

The fixture never overwrites saved companion state. The engine view exposes the current behaviour, traits, route/context, and recent event journal so the architecture is visible rather than merely claimed.

## Testing contract

The companion test suite covers:

- deterministic replay
- event adapter cursoring
- duplicate prevention
- state migration and validation
- local persistence
- backup/restore
- unlock thresholds
- time-of-day behaviour
- settings filtering
- legacy settings migration
- visual behaviour priority and deterministic idle selection
