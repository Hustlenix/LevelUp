import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  appendOperation,
  auditReplica,
  checksum,
  compactReplica,
  createEnvelope,
  createReplica,
  decryptEnvelope,
  encryptEnvelope,
  frontierFor,
  materializeLifeState,
  mergeEnvelope,
  replicaDigest,
  stableStringify,
} from "../lib/nexus/index.ts";
import { createEmptyLifeState, migrateLifeState } from "../lib/life/store.ts";

const workspace = "workspace-test";

function profile(updatedAt = "2026-09-29T08:00:00.000Z") {
  return {
    name: "Rin",
    goals: ["focus", "learning"],
    minutesPerDay: 30,
    intensity: "steady",
    consistency: "sometimes",
    wakeTime: null,
    sleepTime: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

function completion(missionId, skill, completedAt, xp = 40) {
  return {
    id: `${missionId}:completed`,
    missionId,
    title: `Complete ${missionId}`,
    skill,
    minutes: 25,
    xp,
    date: completedAt.slice(0, 10),
    completedAt,
    proof: "Made a concrete artifact.",
  };
}

function add(replica, input, at) {
  return appendOperation(replica, input, at).replica;
}

test("canonical protocol checksum matches SHA-256", () => {
  const value = { z: [3, 2, 1], a: "LevelUp", nested: { enabled: true } };
  const expected = createHash("sha256").update(stableStringify(value)).digest("hex");
  assert.equal(checksum(value), expected);
  assert.equal(checksum({ nested: { enabled: true }, a: "LevelUp", z: [3, 2, 1] }), expected, "object key order is canonical");
});

test("partitioned replicas converge independent of merge direction", () => {
  let left = createReplica("replica-a", workspace);
  let right = createReplica("replica-b", workspace);
  left = add(left, { kind: "profile.set", entityId: "profile", payload: { profile: profile() } }, "2026-09-29T08:00:00.000Z");
  left = add(left, { kind: "mission.complete", entityId: "m-1", payload: { record: completion("m-1", "focus", "2026-09-29T09:00:00.000Z") } }, "2026-09-29T09:00:00.000Z");
  right = add(right, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { reducedMotion: true } } }, "2026-09-29T08:30:00.000Z");
  right = add(right, { kind: "mission.complete", entityId: "m-2", payload: { record: completion("m-2", "learning", "2026-09-29T09:15:00.000Z", 55) } }, "2026-09-29T09:15:00.000Z");

  const leftEnvelope = createEnvelope(left);
  const rightEnvelope = createEnvelope(right);
  const onLeft = mergeEnvelope(left, rightEnvelope).replica;
  const onRight = mergeEnvelope(right, leftEnvelope).replica;

  assert.deepEqual(materializeLifeState(onLeft), materializeLifeState(onRight));
  assert.equal(replicaDigest(onLeft), replicaDigest(onRight));
  assert.equal(materializeLifeState(onLeft).progression.totalXp, 95);
  assert.equal(materializeLifeState(onLeft).preferences.reducedMotion, true);
});

test("mission identity prevents double XP after retries", () => {
  let source = createReplica("replica-a", workspace);
  let target = createReplica("replica-b", workspace);
  source = add(source, { kind: "mission.complete", entityId: "m-1", payload: { record: completion("m-1", "focus", "2026-09-29T09:00:00.000Z") } }, "2026-09-29T09:00:00.000Z");
  const envelope = createEnvelope(source);
  const first = mergeEnvelope(target, envelope);
  target = first.replica;
  const replay = mergeEnvelope(target, envelope);
  assert.equal(first.accepted, 1);
  assert.equal(replay.accepted, 0);
  assert.equal(replay.duplicates, 1);
  assert.equal(materializeLifeState(replay.replica).progression.totalXp, 40);
});

test("tampering, sequence gaps, and actor forks fail closed", () => {
  let source = createReplica("replica-a", workspace);
  source = add(source, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: true } } }, "2026-09-29T08:00:00.000Z");
  const envelope = createEnvelope(source);
  const changedOperation = { ...envelope.operations[0], payload: { patch: { sound: false } } };
  const tamperedBase = { ...envelope, operations: [changedOperation] };
  const tampered = { ...tamperedBase, digest: checksum(Object.fromEntries(Object.entries(tamperedBase).filter(([key]) => key !== "digest"))) };
  const rejectedTamper = mergeEnvelope(createReplica("replica-b", workspace), tampered);
  assert.equal(rejectedTamper.rejected[0]?.reason, "bad-digest");

  const gapOperation = { ...envelope.operations[0], id: "replica-a:2", sequence: 2, previousDigest: envelope.operations[0].digest };
  const unsignedGap = Object.fromEntries(Object.entries(gapOperation).filter(([key]) => key !== "digest"));
  const signedGap = { ...gapOperation, digest: checksum(unsignedGap) };
  const gapBase = { ...envelope, operations: [signedGap], frontier: { "replica-a": 2 } };
  const gapEnvelope = { ...gapBase, digest: checksum(Object.fromEntries(Object.entries(gapBase).filter(([key]) => key !== "digest"))) };
  assert.equal(mergeEnvelope(createReplica("replica-b", workspace), gapEnvelope).rejected[0]?.reason, "invalid-shape");

  let forkA = createReplica("shared-actor", workspace);
  let forkB = createReplica("shared-actor", workspace);
  forkA = add(forkA, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: true } } }, "2026-09-29T08:00:00.000Z");
  forkB = add(forkB, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: false } } }, "2026-09-29T08:00:00.000Z");
  assert.equal(mergeEnvelope(forkA, createEnvelope(forkB)).rejected[0]?.reason, "actor-fork");
});

test("checkpoint compaction preserves state and catches up a late replica", () => {
  let active = createReplica("replica-a", workspace);
  active = add(active, { kind: "profile.set", entityId: "profile", payload: { profile: profile() } }, "2026-09-29T08:00:00.000Z");
  for (let index = 0; index < 12; index += 1) {
    const day = String((index % 28) + 1).padStart(2, "0");
    const at = `2026-09-${day}T09:00:00.000Z`;
    active = add(active, { kind: "mission.complete", entityId: `m-${index}`, payload: { record: completion(`m-${index}`, index % 2 ? "learning" : "focus", at) } }, at);
  }
  const before = materializeLifeState(active);
  const compacted = compactReplica(active, "2026-09-30T10:00:00.000Z");
  assert.equal(compacted.operations.length, 0);
  assert.deepEqual(materializeLifeState(compacted).progression, before.progression);
  assert.equal(auditReplica(compacted).valid, true);

  const late = mergeEnvelope(createReplica("replica-late", workspace), createEnvelope(compacted)).replica;
  assert.deepEqual(materializeLifeState(late).progression, before.progression);
  assert.deepEqual(frontierFor(late), frontierFor(compacted));
});

test("checkpoint forks cannot replace a retained actor chain", () => {
  let local = createReplica("shared-actor", workspace);
  local = add(local, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: true } } }, "2026-09-29T08:00:00.000Z");
  local = add(local, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { reminders: true } } }, "2026-09-29T08:01:00.000Z");

  let fork = createReplica("shared-actor", workspace);
  fork = add(fork, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: false } } }, "2026-09-29T08:00:00.000Z");
  fork = compactReplica(fork, "2026-09-29T08:02:00.000Z");

  const result = mergeEnvelope(local, createEnvelope(fork));
  assert.equal(result.accepted, 0);
  assert.equal(result.rejected[0]?.reason, "actor-fork");
  assert.equal(materializeLifeState(result.replica).preferences.sound, true);
});

test("legacy snapshots migrate into a replayable replica", () => {
  const record = completion("legacy-mission", "learning", "2026-09-28T09:00:00.000Z", 55);
  const legacy = createEmptyLifeState("2026-09-29T09:00:00.000Z");
  legacy.profile = profile("2026-09-27T09:00:00.000Z");
  legacy.preferences.reducedMotion = true;
  legacy.progression.completions = [record];
  legacy.progression.totalXp = 9_999;
  legacy.progression.skillXp.learning = 9_999;
  const migrated = migrateLifeState(legacy, "migration-actor", "migration-workspace");
  const state = materializeLifeState(migrated);
  assert.equal(auditReplica(migrated).valid, true);
  assert.equal(state.progression.totalXp, 55, "derived mission facts replace mutable legacy counters");
  assert.equal(state.progression.skillXp.learning, 55);
  assert.equal(state.preferences.reducedMotion, true);
  assert.equal(state.profile?.name, "Rin");
});

test("local append and legacy migration reject malformed domain payloads", () => {
  const replica = createReplica("validation-actor", "validation-workspace");
  assert.throws(() => appendOperation(replica, { kind: "profile.set", entityId: "profile", payload: { profile: { ...profile(), goals: [] } } }), /Invalid profile\.set/);
  const legacy = createEmptyLifeState("not-a-date");
  legacy.profile = { ...profile(), goals: [], updatedAt: "not-a-date" };
  legacy.progression.completions = [{ ...completion("bad", "focus", "2026-09-29T09:00:00.000Z"), date: "2026-99-99" }];
  const migrated = migrateLifeState(legacy, "validation-actor", "validation-workspace");
  assert.equal(auditReplica(migrated).valid, true);
  assert.equal(materializeLifeState(migrated).profile, null);
  assert.equal(materializeLifeState(migrated).progression.completions.length, 0);
});

test("encrypted packets authenticate both phrase and payload", async () => {
  let replica = createReplica("replica-a", workspace);
  replica = add(replica, { kind: "profile.set", entityId: "profile", payload: { profile: profile() } }, "2026-09-29T08:00:00.000Z");
  const envelope = createEnvelope(replica, {}, "2026-09-29T10:00:00.000Z");
  const encrypted = await encryptEnvelope(envelope, "correct horse battery staple", { iterations: 10_000 });
  assert.deepEqual(await decryptEnvelope(encrypted, "correct horse battery staple"), envelope);
  await assert.rejects(() => decryptEnvelope(encrypted, "incorrect phrase"), /wrong|changed/);
  const last = encrypted.ciphertext.at(-1);
  const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -1)}${last === "A" ? "B" : "A"}` };
  await assert.rejects(() => decryptEnvelope(tampered, "correct horse battery staple"), /wrong|changed/);
});

test("hybrid clocks stay monotonic when the wall clock moves backward", () => {
  let replica = createReplica("replica-a", workspace);
  replica = add(replica, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: true } } }, "2026-09-29T10:00:00.000Z");
  replica = add(replica, { kind: "preferences.patch", entityId: "preferences", payload: { patch: { sound: false } } }, "2026-09-29T09:00:00.000Z");
  assert.equal(replica.operations[1].clock.wallTime, replica.operations[0].clock.wallTime);
  assert.equal(replica.operations[1].clock.logical, replica.operations[0].clock.logical + 1);
  assert.equal(materializeLifeState(replica).preferences.sound, false);
});

test("large logs replay deterministically", () => {
  let replica = createReplica("replica-load", workspace);
  for (let index = 0; index < 500; index += 1) {
    const at = new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString();
    replica = add(replica, { kind: "mission.complete", entityId: `load-${index}`, payload: { record: completion(`load-${index}`, "discipline", at, 1) } }, at);
  }
  const state = materializeLifeState(replica);
  assert.equal(state.progression.completions.length, 500);
  assert.equal(state.progression.totalXp, 500);
  assert.equal(auditReplica(replica).valid, true);
});
