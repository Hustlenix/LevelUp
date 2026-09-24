"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ChapterMeta, Pillar } from "@/lib/types";
import { useOSStore } from "@/lib/os/store";
import { useProgressStore } from "@/lib/progress";
import {
  COMPANION_EVENT_SIGNAL,
  DEFAULT_COMPANION_SETTINGS,
  browserStorage,
  createEmptyCompanionState,
  deriveTimeOfDay,
  emitCompanionEvent,
  pumpCompanion,
  readCompanionSettings,
  selectCompanionBehaviour,
  stepCompanion,
  useCompanionStore,
  writeCompanionSettings,
  type CompanionEvent,
  type CompanionReaction,
  type CompanionSettings,
  type CompanionState,
  type CompanionVisualBehaviour,
  type PillarChapterProgress,
} from "@/lib/companion";

type ChapterContext = Pick<ChapterMeta, "slug" | "title" | "pillar">;
type PanelView = "room" | "engine" | "settings";

const DEMO_NOW = "2026-09-24T12:00:00.000Z";

function pillarProgress(chapters: ChapterContext[], progress: ReturnType<typeof useProgressStore>) {
  const out: Partial<Record<Pillar, PillarChapterProgress>> = {};
  for (const pillar of ["health", "wealth", "love", "self"] as Pillar[]) {
    const inPillar = chapters.filter((chapter) => chapter.pillar === pillar);
    out[pillar] = {
      total: inPillar.length,
      complete: inPillar.filter((chapter) => progress[chapter.slug]?.complete).length,
    };
  }
  return out;
}

function chapterFromPath(pathname: string, chapters: ChapterContext[]) {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("chapters");
  if (index < 0 || !parts[index + 1]) return null;
  return chapters.find((chapter) => chapter.slug === parts[index + 1]) ?? null;
}

function bestReaction(reactions: CompanionReaction[], kind: CompanionReaction["kind"]) {
  return reactions
    .filter((reaction) => reaction.kind === kind)
    .sort((a, b) => a.priority - b.priority)[0] ?? null;
}

function activityLabel(behaviour: CompanionVisualBehaviour) {
  const labels: Record<CompanionVisualBehaviour, string> = {
    idle: "taking it easy",
    walk: "wandering",
    sleep: "sleeping",
    sit: "sitting",
    read: "reading",
    work: "working beside you",
    celebrate: "marking the win",
    think: "thinking",
    stretch: "stretching",
    ledger: "sorting the ledger",
    letter: "writing",
    wave: "saying hi",
    recover: "resetting",
  };
  return labels[behaviour];
}

function Milo({ behaviour }: { behaviour: CompanionVisualBehaviour }) {
  const sleeping = behaviour === "sleep";
  const working = behaviour === "work";
  const reading = behaviour === "read" || behaviour === "ledger" || behaviour === "letter";
  return (
    <div className={"milo-avatar milo-" + behaviour} aria-hidden="true">
      <svg viewBox="0 0 120 130" role="presentation">
        <path className="milo-shadow" d="M25 116c7-7 62-9 72 0-10 8-61 9-72 0Z" />
        <path className="milo-ear" d="M34 35 29 10l24 17Z" />
        <path className="milo-ear" d="m86 35 5-25-24 17Z" />
        <path className="milo-body" d="M33 69c0-24 12-39 27-39s27 15 27 39v28c0 14-10 23-27 23S33 111 33 97V69Z" />
        <path className="milo-face" d="M39 61c3-13 11-21 21-21 11 0 19 8 22 21-7 7-14 10-22 10-7 0-14-3-21-10Z" />
        {sleeping ? (
          <>
            <path className="milo-eye-line" d="M46 56q5 4 10 0" />
            <path className="milo-eye-line" d="M65 56q5 4 10 0" />
          </>
        ) : (
          <>
            <circle className="milo-eye" cx="51" cy="56" r="3" />
            <circle className="milo-eye" cx="70" cy="56" r="3" />
          </>
        )}
        <path className="milo-mouth" d={behaviour === "celebrate" ? "M55 64q5 7 11 0" : "M57 65q3 2 6 0"} />
        <path className="milo-arm milo-arm-left" d="M37 77q-13 9-15 21" />
        <path className="milo-arm milo-arm-right" d="M83 77q13 9 15 21" />
        {working ? (
          <>
            <path className="milo-headphones" d="M40 51q3-22 20-22t20 22" />
            <rect className="milo-prop" x="42" y="82" width="38" height="24" rx="3" />
            <path className="milo-prop-line" d="M38 107h47" />
          </>
        ) : null}
        {reading ? (
          <>
            <path className="milo-book" d="M34 86q13-5 26 2v23q-13-7-26-2Z" />
            <path className="milo-book" d="M86 86q-13-5-26 2v23q13-7 26-2Z" />
          </>
        ) : null}
      </svg>
    </div>
  );
}

function RoomObject({ id }: { id: string }) {
  if (id === "book") return <div className="room-object room-book" title="Book unlocked"><i /><i /><i /></div>;
  if (id === "lamp") return <div className="room-object room-lamp" title="Desk lamp unlocked"><i /><b /></div>;
  if (id === "mat") return <div className="room-object room-mat" title="Workout mat unlocked" />;
  if (id === "corkboard") return <div className="room-object room-corkboard" title="Highlight corkboard unlocked"><i /><i /><i /></div>;
  if (id === "trophy-shelf") return <div className="room-object room-trophy" title="Milestone shelf unlocked"><i /></div>;
  if (id === "shelf-self") return <div className="room-object room-self-shelf" title="Self shelf unlocked"><i /><i /><i /></div>;
  if (id === "desk-wealth") return <div className="room-object room-ledger" title="Wealth desk unlocked"><i /></div>;
  if (id === "window-health") return <div className="room-object room-plant" title="Health window unlocked"><i /><b /></div>;
  if (id === "nook-love") return <div className="room-object room-chair" title="Love nook unlocked"><i /></div>;
  if (id === "window-outside") return <div className="room-object room-sun" title="90-day view unlocked" />;
  return null;
}

function CompanionRoom({
  state,
  behaviour,
  latestUnlock,
}: {
  state: CompanionState;
  behaviour: CompanionVisualBehaviour;
  latestUnlock?: string | null;
}) {
  return (
    <div className={"companion-room room-" + state.room.variant} aria-label={"Milo is " + activityLabel(behaviour)}>
      <div className="room-window"><i /><i /></div>
      <div className="room-shelf-base" />
      <div className="room-bed"><i /></div>
      <div className="room-desk"><i /></div>
      <div className="room-rug" />
      {state.room.items.map((item) => <RoomObject key={item.id} id={item.kind} />)}
      <div className={"milo-stage stage-" + behaviour + (latestUnlock ? " room-change" : "")}>
        <Milo behaviour={behaviour} />
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono text-ink-faint">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold" style={{ width: value + "%" }} />
      </div>
    </div>
  );
}

function DemoControls({
  state,
  onState,
  onReaction,
}: {
  state: CompanionState;
  onState: (state: CompanionState) => void;
  onReaction: (reactions: CompanionReaction[]) => void;
}) {
  const [step, setStep] = useState(0);
  const labels = ["Start focus", "Complete focus", "Open health chapter", "Complete chapter", "Reach milestone"];

  function apply(kind: CompanionEvent["kind"], options: Partial<CompanionEvent> = {}) {
    const event: CompanionEvent = {
      id: "demo-" + step + "-" + kind,
      kind,
      occurredAt: new Date(Date.parse(DEMO_NOW) + step * 10_000).toISOString(),
      ...options,
    };
    const result = stepCompanion(state, event, {
      now: new Date(event.occurredAt),
      timeOfDay: "day",
      pillarChapters: { health: { complete: kind === "chapter_completed" ? 1 : 0, total: 4 } },
    });
    onState(result.state);
    onReaction(result.reactions);
    setStep((value) => Math.min(labels.length, value + 1));
  }

  function next() {
    if (step === 0) return apply("focus_started", { value: 25 });
    if (step === 1) return apply("focus_completed", { value: 25 });
    if (step === 2) return apply("chapter_started", { note: "demo-health", pillar: "health" });
    if (step === 3) return apply("chapter_completed", { note: "demo-health", pillar: "health" });
    if (step === 4) return apply("roadmap_milestone", { value: 1 });
  }

  return (
    <div className="rounded-xl border border-gold/35 bg-gold/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Reviewer demo</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">Runs the real reducer against a disposable fixture. Your saved companion is untouched.</p>
        </div>
        <span className="font-mono text-[10px] text-ink-faint">{Math.min(step + 1, 5)}/5</span>
      </div>
      <button
        type="button"
        disabled={step >= labels.length}
        onClick={next}
        className="mt-3 min-h-10 w-full rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {step < labels.length ? labels[step] : "Demo complete — inspect the journal"}
      </button>
    </div>
  );
}

export default function CompanionLayer({ chapters }: { chapters: ChapterContext[] }) {
  const pathname = usePathname();
  const osState = useOSStore();
  const progress = useProgressStore();
  const savedState = useCompanionStore();
  const [settings, setSettings] = useState<CompanionSettings>(DEFAULT_COMPANION_SETTINGS);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<PanelView>("room");
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [transientPose, setTransientPose] = useState<string | null>(null);
  const [latestUnlock, setLatestUnlock] = useState<string | null>(null);
  const [idleTick, setIdleTick] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [demoState, setDemoState] = useState<CompanionState | null>(null);
  const previousOS = useRef<typeof osState | null>(null);
  const lastChapter = useRef<string | null>(null);
  const poseTimer = useRef<number | null>(null);

  const chaptersByPillar = useMemo(() => pillarProgress(chapters, progress), [chapters, progress]);
  const currentChapter = useMemo(() => chapterFromPath(pathname, chapters), [pathname, chapters]);
  const activeFocus = Object.values(osState.sessions).some((session) => session.status === "in-progress");
  const effectiveMotion = systemReducedMotion && settings.motion === "full" ? "reduced" : settings.motion;
  const state = demoState ?? savedState;
  const timeOfDay = now ? deriveTimeOfDay(now) : "day";
  const behaviour = selectCompanionBehaviour(state, {
    activeFocus: demoState ? state.currentActivity === "focusing" : activeFocus,
    chapterPillar: demoState ? state.journal[state.journal.length - 1]?.pillar ?? null : currentChapter?.pillar ?? null,
    timeOfDay: demoState ? "day" : timeOfDay,
    idleTick,
    motion: effectiveMotion,
    transientPose,
  });

  const handleReactions = useCallback((reactions: CompanionReaction[]) => {
    const line = bestReaction(reactions, "dialogue");
    const pose = bestReaction(reactions, "pose") ?? bestReaction(reactions, "emote");
    const room = bestReaction(reactions, "room");
    if (line?.text) setDialogue(line.text);
    if (room?.itemId) {
      setLatestUnlock(room.itemId);
      window.setTimeout(() => setLatestUnlock(null), 2600);
    }
    if (settings.sound && reactions.some((reaction) => reaction.priority === 1)) {
      try {
        const AudioContextCtor = window.AudioContext;
        const audio = new AudioContextCtor();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(520, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(680, audio.currentTime + 0.09);
        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.13);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.14);
        oscillator.addEventListener("ended", () => void audio.close(), { once: true });
      } catch {
        // Sound is optional. Autoplay policies or unavailable Web Audio must never block the companion.
      }
    }
    if (pose?.poseId) {
      setTransientPose(pose.poseId);
      if (poseTimer.current) window.clearTimeout(poseTimer.current);
      poseTimer.current = window.setTimeout(() => setTransientPose(null), 2200);
    }
  }, [settings.sound]);

  const flush = useCallback(() => {
    const result = pumpCompanion({
      osState,
      pillarChapters: chaptersByPillar,
      storage: browserStorage(),
    });
    handleReactions(result.reactions);
  }, [chaptersByPillar, handleReactions, osState]);

  useEffect(() => {
    setSettings(readCompanionSettings(browserStorage()));
    setNow(new Date());
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setSystemReducedMotion(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      motion.removeEventListener("change", updateMotion);
      window.clearInterval(clock);
      if (poseTimer.current) window.clearTimeout(poseTimer.current);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setIdleTick((tick) => tick + 1), effectiveMotion === "full" ? 12_000 : 24_000);
    return () => window.clearInterval(interval);
  }, [effectiveMotion]);

  useEffect(() => {
    const onDomainEvent = () => flush();
    window.addEventListener(COMPANION_EVENT_SIGNAL, onDomainEvent);
    flush();
    return () => window.removeEventListener(COMPANION_EVENT_SIGNAL, onDomainEvent);
  }, [flush]);

  useEffect(() => {
    if (!currentChapter) {
      lastChapter.current = null;
      return;
    }
    if (lastChapter.current === currentChapter.slug) return;
    lastChapter.current = currentChapter.slug;
    emitCompanionEvent("chapter_started", { note: currentChapter.slug, pillar: currentChapter.pillar });
  }, [currentChapter]);

  useEffect(() => {
    const previous = previousOS.current;
    previousOS.current = osState;
    if (!previous) return;

    for (const [id, session] of Object.entries(osState.sessions)) {
      const prior = previous.sessions[id];
      if (session.status === "in-progress" && prior?.status !== "in-progress") {
        emitCompanionEvent("focus_started", { value: session.plannedMinutes, note: session.taskId });
      }
    }
    for (const id of Object.keys(osState.goals)) {
      if (!previous.goals[id]) emitCompanionEvent("goal_created", { note: osState.goals[id].title, pillar: osState.goals[id].pillar });
    }
  }, [osState]);

  function saveSettings(next: CompanionSettings) {
    if (writeCompanionSettings(next, browserStorage())) setSettings(next);
  }

  function interact() {
    if (!settings.interaction) return;
    emitCompanionEvent("interaction_tap");
  }

  function beginDemo() {
    const fixture = createEmptyCompanionState(DEMO_NOW, 4242);
    fixture.stats.sessionsCompleted = 4;
    fixture.flags.firstMeetDelivered = true;
    setDemoState(fixture);
    setDialogue("Demo fixture loaded. Four focus sessions are already in the record.");
    setTransientPose("wave");
    setView("engine");
  }

  if (!settings.enabled && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="companion-off-button no-print"
        aria-label="Open companion settings. Companion is off."
        title="Companion is off"
      >
        M
      </button>
    );
  }

  return (
    <aside className="companion-root no-print" aria-label="Level Up companion">
      {expanded ? (
        <section className="companion-panel" aria-label="Milo companion space">
          <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Living companion</p>
              <h2 className="mt-0.5 font-display text-lg font-semibold text-ink">Milo · {activityLabel(behaviour)}</h2>
            </div>
            <button type="button" onClick={() => setExpanded(false)} className="min-h-9 rounded-lg border border-line px-3 text-xs font-semibold text-ink-soft hover:border-gold hover:text-ink" aria-label="Minimize companion">Minimize</button>
          </header>

          <div className="px-4 pt-4">
            <CompanionRoom state={state} behaviour={behaviour} latestUnlock={latestUnlock} />
            {dialogue && settings.dialogue !== "off" ? (
              <p className="companion-dialogue mt-3 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink-soft" aria-live="polite">{dialogue}</p>
            ) : (
              <p className="mt-3 text-xs text-ink-faint" aria-live="polite">Quiet mode. Milo still reacts through the room.</p>
            )}
          </div>

          <nav className="mx-4 mt-4 grid grid-cols-3 rounded-xl border border-line bg-paper p-1" aria-label="Companion space sections">
            {(["room", "engine", "settings"] as PanelView[]).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setView(item)}
                className={"min-h-9 rounded-lg px-2 text-xs font-semibold capitalize " + (view === item ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}
                aria-pressed={view === item}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="max-h-[42vh] overflow-y-auto px-4 pb-4 pt-3 scrollbar-thin">
            {view === "room" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line bg-paper p-3"><p className="text-[10px] uppercase tracking-wider text-ink-faint">World</p><p className="mt-1 text-sm font-semibold capitalize text-ink">{state.room.variant}</p></div>
                  <div className="rounded-xl border border-line bg-paper p-3"><p className="text-[10px] uppercase tracking-wider text-ink-faint">Unlocked</p><p className="mt-1 text-sm font-semibold text-ink">{state.room.items.length} objects</p></div>
                </div>
                <p className="text-xs leading-relaxed text-ink-soft">The room is another view of the same progress data. Objects appear only when real Level Up milestones qualify.</p>
                {settings.interaction ? (
                  <button type="button" onClick={interact} className="min-h-10 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-gold">Tap Milo</button>
                ) : null}
                {!demoState ? (
                  <button type="button" onClick={beginDemo} className="min-h-10 w-full rounded-lg border border-gold/35 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/5">Experience reviewer demo</button>
                ) : (
                  <button type="button" onClick={() => { setDemoState(null); setDialogue(null); }} className="min-h-10 w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-soft">Exit demo fixture</button>
                )}
              </div>
            ) : null}

            {view === "engine" ? (
              <div className="space-y-4">
                {demoState ? <DemoControls state={demoState} onState={setDemoState} onReaction={handleReactions} /> : null}
                <div className="grid gap-2">
                  {Object.entries(state.traits).map(([label, value]) => <Meter key={label} label={label} value={value} />)}
                </div>
                <div className="rounded-xl border border-line bg-paper p-3 text-xs">
                  <p className="font-semibold text-ink">Current context</p>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ink-soft">
                    <dt>Behaviour</dt><dd className="text-right font-mono text-ink">{behaviour}</dd>
                    <dt>Route</dt><dd className="truncate text-right font-mono text-ink">{demoState ? "fixture" : pathname}</dd>
                    <dt>Chapter</dt><dd className="truncate text-right text-ink">{demoState ? state.journal[state.journal.length - 1]?.note ?? "—" : currentChapter?.title ?? "—"}</dd>
                    <dt>Time</dt><dd className="text-right font-mono text-ink">{demoState ? "day" : timeOfDay}</dd>
                    <dt>Storage</dt><dd className="text-right text-ink">local only</dd>
                  </dl>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Recent event journal</p>
                  <ol className="mt-2 space-y-1.5">
                    {[...state.journal].slice(-8).reverse().map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-2.5 py-2 text-[11px]">
                        <span className="truncate font-mono text-ink">{event.kind.toUpperCase()}</span>
                        <span className="shrink-0 text-ink-faint">{event.occurredAt.slice(11, 19)}</span>
                      </li>
                    ))}
                    {!state.journal.length ? <li className="text-xs text-ink-faint">No events yet. Use Level Up and the journal will fill itself.</li> : null}
                  </ol>
                </div>
              </div>
            ) : null}

            {view === "settings" ? (
              <div className="space-y-4 text-sm">
                <SettingToggle label="Companion" checked={settings.enabled} onChange={(enabled) => saveSettings({ ...settings, enabled })} />
                <fieldset>
                  <legend className="text-xs font-semibold text-ink">Motion</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["full", "reduced", "off"] as const).map((motion) => <button key={motion} type="button" onClick={() => saveSettings({ ...settings, motion })} className={"min-h-9 rounded-lg border px-2 text-xs capitalize " + (settings.motion === motion ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-soft")}>{motion}</button>)}
                  </div>
                  {systemReducedMotion ? <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">Your system requests reduced motion, so Full is rendered as Reduced.</p> : null}
                </fieldset>
                <fieldset>
                  <legend className="text-xs font-semibold text-ink">Dialogue</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["normal", "minimal", "off"] as const).map((dialogueMode) => <button key={dialogueMode} type="button" onClick={() => saveSettings({ ...settings, dialogue: dialogueMode })} className={"min-h-9 rounded-lg border px-2 text-xs capitalize " + (settings.dialogue === dialogueMode ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-soft")}>{dialogueMode}</button>)}
                  </div>
                </fieldset>
                <SettingToggle label="Sound" checked={settings.sound} onChange={(sound) => saveSettings({ ...settings, sound })} />
                <SettingToggle label="Interaction" checked={settings.interaction} onChange={(interaction) => saveSettings({ ...settings, interaction })} />
                <p className="rounded-xl bg-paper-deep p-3 text-xs leading-relaxed text-ink-soft">Milo’s memory is stored with your Level Up data on this device. No companion state is required by analytics or a cloud model.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : settings.enabled ? (
        <button
          type="button"
          onClick={() => { interact(); setExpanded(true); }}
          className={"companion-home companion-home-" + behaviour}
          aria-label={"Open Milo companion space. Milo is " + activityLabel(behaviour) + "."}
          title={"Milo is " + activityLabel(behaviour)}
        >
          <Milo behaviour={behaviour} />
          <span className="companion-home-label">{activeFocus ? "focus buddy" : "Milo"}</span>
        </button>
      ) : null}
    </aside>
  );
}

function SettingToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-line bg-paper px-3 py-2">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
    </label>
  );
}
