"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CircleDot,
  DatabaseZap,
  FileKey,
  GitMerge,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Network,
  Radio,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Upload,
} from "lucide-react";
import {
  appendOperation,
  auditReplica,
  createEnvelope,
  createReplica,
  decryptEnvelope,
  encryptReplica,
  frontierFor,
  materializeLifeState,
  mergeEnvelope,
  replicaDigest,
  type NexusReplica,
} from "@/lib/nexus";
import { compactNexusStore, mergeNexusEnvelope, useNexusStore, type LifeProfile } from "@/lib/life";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { AppPageHeader } from "./AppUI";

type LabState = {
  left: NexusReplica;
  right: NexusReplica;
  connected: boolean;
  tick: number;
  note: string;
};

function short(value: string, length = 10): string {
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}

function labProfile(): LifeProfile {
  const at = "2026-01-01T09:00:00.000Z";
  return {
    name: "Sandbox",
    goals: ["focus", "discipline"],
    minutesPerDay: 25,
    intensity: "steady" as const,
    consistency: "starting" as const,
    wakeTime: null,
    sleepTime: null,
    createdAt: at,
    updatedAt: at,
  };
}

function createLab(): LabState {
  const workspaceId = "nexus-sandbox";
  let left = createReplica("field-node-a", workspaceId, "2026-01-01T09:00:00.000Z");
  left = appendOperation(left, { kind: "profile.set", entityId: "profile", payload: { profile: labProfile() } }, "2026-01-01T09:00:00.000Z").replica;
  const right = mergeEnvelope(createReplica("field-node-b", workspaceId, "2026-01-01T09:00:00.000Z"), createEnvelope(left, {}, "2026-01-01T09:00:01.000Z")).replica;
  return { left, right, connected: false, tick: 0, note: "The cable is out. Writes stay on their own replica." };
}

function addLabMission(replica: NexusReplica, node: "A" | "B", tick: number, missionId = `field-${node.toLowerCase()}-${tick}`): NexusReplica {
  const completedAt = new Date(Date.UTC(2026, 0, 1, 9, tick + 1)).toISOString();
  const skill = node === "A" ? "focus" as const : "discipline" as const;
  const record = {
    id: `${missionId}:${node}:completed`,
    missionId,
    title: node === "A" ? "Protect one focus block" : "Close one open loop",
    skill,
    minutes: node === "A" ? 20 : 15,
    xp: node === "A" ? 34 : 28,
    date: "2026-01-01",
    completedAt,
    proof: `Recorded independently on node ${node}.`,
  };
  return appendOperation(replica, { kind: "mission.complete", entityId: missionId, payload: { record } }, completedAt).replica;
}

function converge(left: NexusReplica, right: NexusReplica): { left: NexusReplica; right: NexusReplica } {
  const fromLeft = createEnvelope(left, {}, "2026-01-01T12:00:00.000Z");
  const fromRight = createEnvelope(right, {}, "2026-01-01T12:00:00.000Z");
  return {
    left: mergeEnvelope(left, fromRight).replica,
    right: mergeEnvelope(right, fromLeft).replica,
  };
}

function vectorLabel(replica: NexusReplica): string {
  const vector = frontierFor(replica);
  return Object.entries(vector).map(([actor, sequence]) => `${actor.replace("field-node-", "")}:${sequence}`).join(" · ") || "∅";
}

function ReplicaNode({ name, replica }: { name: string; replica: NexusReplica }) {
  const state = materializeLifeState(replica);
  const audit = auditReplica(replica);
  return (
    <article className="nexus-node">
      <header><span><CircleDot aria-hidden="true" />{name}</span><i className={audit.valid ? "is-valid" : "is-invalid"}>{audit.valid ? "valid" : "fault"}</i></header>
      <strong>{state.progression.completions.length} mission{state.progression.completions.length === 1 ? "" : "s"}</strong>
      <small>{state.progression.totalXp} XP materialized</small>
      <dl><div><dt>Vector</dt><dd>{vectorLabel(replica)}</dd></div><div><dt>Digest</dt><dd>{short(replicaDigest(replica), 12)}</dd></div></dl>
    </article>
  );
}

export default function NexusLab() {
  const replica = useNexusStore();
  const audit = useMemo(() => auditReplica(replica), [replica]);
  const frontier = useMemo(() => frontierFor(replica), [replica]);
  const totalEvents = Object.values(frontier).reduce((sum, sequence) => sum + sequence, 0);
  const [online, setOnline] = useState(true);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [lab, setLab] = useState<LabState>(createLab);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const labConverged = replicaDigest(lab.left) === replicaDigest(lab.right);

  function writeLab(node: "A" | "B") {
    setLab((current) => {
      const tick = current.tick + 1;
      let left = current.left;
      let right = current.right;
      if (node === "A") left = addLabMission(left, node, tick);
      else right = addLabMission(right, node, tick);
      if (current.connected) ({ left, right } = converge(left, right));
      return { ...current, left, right, tick, note: current.connected ? `Node ${node} wrote an event; both replicas converged.` : `Node ${node} wrote locally while partitioned.` };
    });
  }

  function toggleLabConnection() {
    setLab((current) => {
      if (current.connected) return { ...current, connected: false, note: "Partition opened. New writes can diverge safely." };
      const merged = converge(current.left, current.right);
      return { ...current, ...merged, connected: true, note: "Replicas exchanged envelopes, de-duplicated events, and converged." };
    });
  }

  function makeConflict() {
    setLab((current) => {
      const tick = current.tick + 1;
      const missionId = `shared-proof-${tick}`;
      let left = addLabMission(current.left, "A", tick, missionId);
      let right = addLabMission(current.right, "B", tick, missionId);
      if (current.connected) ({ left, right } = converge(left, right));
      return { ...current, left, right, tick, note: current.connected ? "Both nodes claimed one mission. The deterministic winner counted once." : "Both nodes claimed the same mission independently. Reconnect to resolve it once." };
    });
  }

  async function exportPacket() {
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const packet = await encryptReplica(replica, passphrase);
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/vnd.levelup.nexus+json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `levelup-nexus-${new Date().toISOString().slice(0, 10)}.nexus`;
      anchor.click();
      URL.revokeObjectURL(url);
      trackEvent(ANALYTICS_EVENTS.nexusPacketExported);
      setStatus("Encrypted packet created. Keep the file and sync phrase separate.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The encrypted packet could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function importPacket(file: File) {
    setError("");
    setStatus("");
    if (file.size > 10_000_000) { setError("That packet is larger than the 10 MB safety limit."); return; }
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const envelope = await decryptEnvelope(parsed, passphrase);
      const result = mergeNexusEnvelope(envelope);
      if (result.rejected.length) throw new Error(result.rejected[0].reason === "workspace-mismatch" ? "This packet belongs to a different LevelUp workspace. Import it into a fresh profile instead." : `Merge rejected: ${result.rejected[0].reason}.`);
      trackEvent(ANALYTICS_EVENTS.nexusPacketImported, { nexus_result: result.accepted ? "accepted" : "duplicate" });
      setStatus(result.accepted ? `Merged ${result.accepted} new event${result.accepted === 1 ? "" : "s"}; ${result.duplicates} already known.` : "Packet verified. This replica was already up to date.");
    } catch (cause) {
      trackEvent(ANALYTICS_EVENTS.nexusPacketImported, { nexus_result: "rejected" });
      setError(cause instanceof Error ? cause.message : "The packet could not be imported.");
    } finally {
      setBusy(false);
    }
  }

  function compact() {
    if (!window.confirm("Compact the verified event log into a checkpoint? Your current progress is preserved, but individual compacted operations will no longer appear in the local ledger.")) return;
    const before = replica.operations.length;
    compactNexusStore();
    trackEvent(ANALYTICS_EVENTS.nexusCompacted);
    setStatus(`Checkpoint committed. ${before} operation${before === 1 ? "" : "s"} folded into the materialized frontier.`);
    setError("");
  }

  return (
    <div className="app-page nexus-page">
      <AppPageHeader eyebrow="Nexus protocol · local-first systems" title="Your progress has an engine room." description="Inspect the real event log behind LevelUp, move it with authenticated encryption, and watch two offline replicas reconcile without double-counting your work." />

      <section className={`nexus-health ${audit.valid ? "is-valid" : "is-invalid"}`} aria-label="Local replica health">
        <div className="nexus-health-mark">{audit.valid ? <ShieldCheck aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}</div>
        <div><p>{audit.valid ? "Integrity verified" : "Integrity fault"}</p><h2>{audit.valid ? "The local chain is internally consistent." : "The local chain needs attention."}</h2><span>{audit.valid ? "Every retained operation matches its checksum, sequence, and actor hash-chain." : audit.errors[0]}</span></div>
        <dl>
          <div><dt>Events</dt><dd>{totalEvents}</dd></div>
          <div><dt>Actors</dt><dd>{audit.actorCount}</dd></div>
          <div><dt>Live log</dt><dd>{replica.operations.length}</dd></div>
          <div><dt>Network</dt><dd>{online ? "online" : "offline"}</dd></div>
        </dl>
      </section>

      <div className="nexus-layout">
        <section className="nexus-panel nexus-ledger">
          <header><div><p>Replica inspector</p><h2>Append-only progress ledger</h2></div><DatabaseZap aria-hidden="true" /></header>
          <div className="nexus-identities"><span><small>Workspace</small><code title={replica.workspaceId}>{short(replica.workspaceId, 18)}</code></span><span><small>This tab</small><code title={replica.replicaId}>{short(replica.replicaId, 18)}</code></span><span><small>State digest</small><code>{short(audit.digest, 18)}</code></span></div>
          <div className="nexus-operation-list" aria-label="Recent Nexus operations">
            {replica.operations.length ? [...replica.operations].slice(-6).reverse().map((operation) => <article key={operation.id}><i className={`kind-${operation.kind.split(".")[0]}`} /><div><strong>{operation.kind.replace(".", " / ")}</strong><span>{operation.entityId}</span></div><code>{short(operation.digest, 9)}</code><time dateTime={new Date(operation.clock.wallTime).toISOString()}>{new Date(operation.clock.wallTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></article>) : <div className="nexus-empty-log"><HardDrive aria-hidden="true" /><p>No live operations remain.</p><span>{replica.checkpoint ? "Verified history is held in the checkpoint below." : "Your first profile or mission will create the first event."}</span></div>}
          </div>
          <footer><span>{replica.checkpoint ? <><Check aria-hidden="true" />Checkpoint at {Object.values(replica.checkpoint.frontier).reduce((sum, value) => sum + value, 0)} events</> : "No checkpoint yet"}</span><button type="button" onClick={compact} disabled={!replica.operations.length}><RefreshCw aria-hidden="true" />Compact verified log</button></footer>
        </section>

        <section className="nexus-panel nexus-transfer">
          <header><div><p>End-to-end encrypted transfer</p><h2>Move progress between devices</h2></div><LockKeyhole aria-hidden="true" /></header>
          <p className="nexus-panel-copy">The passphrase derives a 256-bit AES-GCM key in this browser. LevelUp never stores it, and the file reveals neither mission details nor proof text without it.</p>
          <label className="nexus-key-field"><span>Sync phrase</span><div><KeyRound aria-hidden="true" /><input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></div><small>Use the same phrase when importing. There is no recovery service.</small></label>
          <div className="nexus-transfer-actions"><button type="button" className="life-primary-button" onClick={exportPacket} disabled={busy || passphrase.length < 8}>{busy ? <RefreshCw className="is-spinning" aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}Export encrypted packet</button><button type="button" className="life-secondary-button" onClick={() => fileRef.current?.click()} disabled={busy || passphrase.length < 8}><Upload aria-hidden="true" />Import packet</button><input ref={fileRef} className="sr-only" type="file" accept=".nexus,application/json,application/vnd.levelup.nexus+json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPacket(file); event.target.value = ""; }} /></div>
          <div className="nexus-crypto-facts"><span><FileKey aria-hidden="true" /><strong>AES-GCM</strong><small>Authenticated ciphertext</small></span><span><KeyRound aria-hidden="true" /><strong>PBKDF2</strong><small>210,000 SHA-256 rounds</small></span><span><Network aria-hidden="true" /><strong>Manual relay</strong><small>No cloud account required</small></span></div>
          <div className="nexus-live-status" aria-live="polite">{error ? <p className="is-error"><AlertTriangle aria-hidden="true" />{error}</p> : status ? <p className="is-success"><Check aria-hidden="true" />{status}</p> : <p><Radio aria-hidden="true" />Tabs on this device also reconcile live through BroadcastChannel.</p>}</div>
        </section>
      </div>

      <section className="nexus-simulator">
        <header><div><p>Interactive partition test</p><h2>Pull the cable. Write twice. Reconnect.</h2><span>This sandbox runs the same merge engine as your real progress, but never touches your profile.</span></div><span className={lab.connected ? "is-connected" : "is-partitioned"}>{lab.connected ? <Network aria-hidden="true" /> : <Unplug aria-hidden="true" />}{lab.connected ? "connected" : "partitioned"}</span></header>
        <div className="nexus-topology" data-connected={lab.connected ? "true" : "false"}>
          <ReplicaNode name="Field node A" replica={lab.left} />
          <div className="nexus-link" aria-hidden="true"><i /><span>{lab.connected ? <GitMerge /> : <Unplug />}</span><i /></div>
          <ReplicaNode name="Field node B" replica={lab.right} />
        </div>
        <div className="nexus-sim-controls"><button type="button" onClick={() => writeLab("A")}>Write mission on A</button><button type="button" onClick={() => writeLab("B")}>Write mission on B</button><button type="button" onClick={makeConflict}>Write same mission on both</button><button type="button" className="is-merge" onClick={toggleLabConnection}>{lab.connected ? <Unplug aria-hidden="true" /> : <GitMerge aria-hidden="true" />}{lab.connected ? "Open partition" : "Reconnect + merge"}</button><button type="button" onClick={() => setLab(createLab())}>Reset sandbox</button></div>
        <footer aria-live="polite"><span className={labConverged ? "is-converged" : "is-diverged"}>{labConverged ? "CONVERGED" : "DIVERGED"}</span><p>{lab.note}</p><code>{labConverged ? short(replicaDigest(lab.left), 16) : `${short(replicaDigest(lab.left), 7)} ≠ ${short(replicaDigest(lab.right), 7)}`}</code></footer>
      </section>

      <section className="nexus-protocol-notes" aria-label="Nexus protocol guarantees and limits">
        <article><span>01</span><div><h3>Durable before decorative</h3><p>Every mission becomes an immutable operation, then a materialized view. The UI is replaceable; the history is replayable.</p></div></article>
        <article><span>02</span><div><h3>Deterministic, not lucky</h3><p>Hybrid logical clocks and actor IDs break ties. Replays, retries, and different delivery orders reach the same state.</p></div></article>
        <article><span>03</span><div><h3>Honest trust boundary</h3><p>Encryption protects exported packets. This is not a hosted relay or Byzantine consensus network, and the app does not pretend otherwise.</p></div></article>
      </section>
    </div>
  );
}
