---
slug: when-a-counter-became-a-protocol
date: 2026-09-29
title: "When a Counter Became a Protocol"
---

LevelUp used to save LifeOS as one JSON snapshot. Complete a mission, add its XP
to a number, push a record into an array, and overwrite `localStorage`. That is a
perfectly reasonable first version. It is also the point where "local-first"
often stops meaning anything deeper than "we did not build a backend."

The product now asks users to invest in a history: goals, proof of work, skill
levels, streaks, and a companion that remembers the work. If that history is
worth building, it has to survive more than the happy path. What happens when
two tabs complete work at nearly the same time? When a packet is imported
twice? When a laptop clock moves backward? When a write is damaged halfway
through? When a device has been offline and rejoins later? A prettier screen
does not answer any of those questions.

So the counter became a protocol.

## Choosing the boundary

The first decision was not to distribute everything. The older reader,
highlights, study mode, OS workspace, and companion each have functioning local
stores and migrations. Rewriting every one would create a huge blast radius and
hide the interesting part under conversion work. Nexus v1 owns the new LifeOS
boundary only: profile, preferences, and completed real-world missions.

The UI still consumes the same `LifeState` shape. Underneath it, though, that
shape is now a materialized view of immutable operations:

- `profile.set`
- `preferences.patch`
- `mission.complete`

This kept Today, Journey, Coach, Progress, Profile, and Milo functioning while
the source of truth changed below them. It also gave the old snapshot a clear
role: compatibility for older backups, not authority for new writes.

## XP is a projection, not a mutation

The most important model change was removing "increment XP" as a stored event.
A counter cannot tell whether the same command has already arrived. Nexus stores
a mission completion with a stable mission ID. XP, skill XP, streaks, and totals
are derived from the winning completion facts.

That means the same packet can arrive once, twice, or twenty times and still
produce one reward. If two offline replicas both claim the same mission, a
hybrid logical clock and actor ID choose the same winner on every device. The
losing operation remains inspectable in the uncompacted log, but it cannot mint
extra progress.

## Making offline order irrelevant

Every browser document writes as a distinct actor. Its operations have a
monotonic sequence, a version-vector dependency snapshot, a hybrid logical
clock, and a canonical SHA-256 digest linked to the actor's previous operation. Merge validates
the envelope, workspace, payload, digest, next sequence, and previous head
before admitting an operation.

The first convergence test deliberately creates two replicas, cuts the link,
writes different missions and preferences on each side, and delivers the two
envelopes in opposite directions. The materialized states and replica digests
must match. A separate test winds the wall clock backward and verifies that the
logical counter preserves order.

The failure tests mattered as much as the success test. They modify a signed
payload, remove an actor sequence, create two different operations with the
same actor and sequence, repeat the same envelope, and tamper with encrypted
ciphertext. Each one must fail without changing progress.

## Storage is now a small durability system

The synchronous path writes the verified replica to localStorage before the UI
announces it. IndexedDB holds a strict-durability mirror. BroadcastChannel moves
idempotent envelopes between live tabs, with the browser `storage` event as a
fallback. Before a local append, the tab refreshes from the write-ahead copy so
it can absorb work from another actor.

Logs cannot grow forever. Compaction folds a verified prefix into a checkpoint
containing the projection, version-vector frontier, and the last digest for
every actor. New operations continue from those heads. The normal command path
checkpoints automatically after 512 retained operations; the Sync Lab also
lets a reviewer trigger it explicitly after a warning.

This is not a server database pretending to fit in a browser. Storage quota,
private browsing policies, and a user clearing site data still exist. The
design makes those boundaries visible and creates two independent local copies;
it does not promise magic durability.

## Encryption without inventing a cloud

GitHub Pages cannot run a private sync service, and pretending a cloud existed
would be worse than shipping a manual transport. A Nexus transfer exports the
real envelope as AES-GCM-256 ciphertext. PBKDF2-HMAC-SHA-256 derives the key
from the user's phrase with a random 16-byte salt and 210,000 iterations. Each
packet gets a random 12-byte IV and authenticates its version, room ID, and
creation time as additional data.

The phrase is not saved. A wrong phrase or changed byte fails authentication
before merge. The ordinary complete backup remains readable JSON, now including
the full Nexus replica so it preserves provenance. The UI calls out that the
backup is not encrypted instead of letting users infer security from the other
feature.

## The engine room had to be visible

Deep infrastructure that nobody can see is difficult to evaluate and difficult
to trust. `/sync-lab/` is an operations console for the actual local replica.
It shows the version-vector frontier, actor count, retained operation suffix,
state digest, checkpoint, and current audit result. Its transfer controls call
the real Web Crypto functions.

The lower half is a two-node field test. Pull the cable, write on A and B,
create a same-mission conflict, and reconnect. The display only says CONVERGED
when both replicas have the same digest. It is not an animation standing in for
a system; it is a small client of the system.

## What broke while building it

The first convergence assertion failed by one millisecond. Both replicas had
identical domain operations, but `LifeState.updatedAt` was using envelope
arrival time. That meant delivery order leaked into the supposedly convergent
state. The fix was to derive the timestamp from the winning operation clocks,
not replica metadata.

The first clean production rebuild also crashed inside Turbopack while restoring
a truncated cache block. Moving only the generated `.next` cache aside and
building from source fixed it; application code and TypeScript were not the
cause. Recording that distinction matters because deleting arbitrary state is
not an acceptable general response to a storage problem.

## AI assistance and ownership

This transformation used an AI coding agent for repository inspection,
implementation, test generation, documentation, and QA assistance under a
detailed product brief. The protocol is not pasted from an external project,
and the repository contains the full implementation and tests rather than a
hosted black box. The design decisions, limitations, failures, and verification
are documented so they can be reviewed from the code instead of being accepted
on the strength of a claim.

The remaining limitation is equally important: there is no opaque hosted relay,
device-key signature system, or Byzantine consensus. The current deployment
supports deterministic local replicas, same-origin live reconciliation, and
explicit encrypted device transfer. A future relay should store only encrypted
envelopes; until it exists, the product says it does not exist.
