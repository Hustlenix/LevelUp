"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { localToday } from "@/lib/dates";
import { dispatchOS, useOSStore } from "@/lib/os/store";
import { typeGoal, typeMilestone, typeRoadmap, typeSession, typeTask } from "@/lib/os/types";
import type { Goal, Session } from "@/lib/os/types";
import { addExperiment, updateExperiment, useExperimentsStore, type ExperimentDecision } from "@/lib/experiments";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { PageShell, SectionHeading } from "@/components/ui";

export type OSWorkspaceMode = "today" | "goals" | "focus" | "review" | "playbook" | "experiments";

const inputClass = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const cardClass = "rounded-2xl border border-line bg-card p-5 shadow-xs sm:p-6";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function pageCopy(mode: OSWorkspaceMode) {
  const copy: Record<OSWorkspaceMode, { eyebrow: string; title: string; lede: string }> = {
    today: { eyebrow: "Today", title: "What matters today?", lede: "One clear outcome, a few executable actions, and a recovery path when the day goes sideways." },
    goals: { eyebrow: "Goals", title: "Turn intention into a route", lede: "Every goal becomes a roadmap, milestone, task, and first session you can actually complete." },
    focus: { eyebrow: "Focus", title: "Make the next block count", lede: "Start a bounded session, capture the result, and let the record—not the feeling—show the trend." },
    review: { eyebrow: "Review", title: "Use the record to change tomorrow", lede: "Review what happened, recover from unfinished work, and adjust the next action without shame." },
    playbook: { eyebrow: "My Playbook", title: "The system you are building", lede: "Your active goals, recent evidence, and principles in one quiet place." },
    experiments: { eyebrow: "Experiments", title: "Run your life like a small laboratory", lede: "State a hypothesis, change one variable, measure it, and decide what to keep." },
  };
  return copy[mode];
}

function statusLabel(status: string) {
  return status.replaceAll("-", " ");
}

function GoalForm({ onCreated }: { onCreated: (goalId: string) => void }) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [target, setTarget] = useState("3");
  const [minutes, setMinutes] = useState("25");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    const targetValue = Number(target);
    const minutesValue = Number(minutes);
    if (!trimmed || !Number.isFinite(targetValue) || targetValue < 1 || !Number.isFinite(minutesValue) || minutesValue < 5) {
      setError("Add a goal, a target greater than zero, and a session length of at least five minutes.");
      return;
    }
    const now = new Date().toISOString();
    const goalId = newId("goal");
    const roadmapId = newId("roadmap");
    const milestoneId = newId("milestone");
    const taskId = newId("task");
    const sessionId = newId("session");
    dispatchOS({ type: "goal/add", goal: typeGoal({ id: goalId, title: trimmed, why: why.trim(), metric: { kind: "count", label: "completed sessions", unit: "sessions" }, baseline: 0, target: targetValue, current: 0, deadline: null, nextAction: "Start the first session.", status: "active", createdAt: now, updatedAt: now }) });
    dispatchOS({ type: "roadmap/add", roadmap: typeRoadmap({ id: roadmapId, goalId, title: `First route to ${trimmed}`, phase: 1, milestoneIds: [], status: "active", createdAt: now, updatedAt: now }) });
    dispatchOS({ type: "milestone/add", milestone: typeMilestone({ id: milestoneId, roadmapId, title: "First proof of progress", order: 1, taskIds: [], status: "active", createdAt: now, updatedAt: now }) });
    dispatchOS({ type: "task/add", task: typeTask({ id: taskId, milestoneId, title: `Complete one ${minutesValue}-minute session`, kind: "focus", order: 1, sessionIds: [], status: "todo", createdAt: now, updatedAt: now }) });
    dispatchOS({ type: "session/schedule", session: typeSession({ id: sessionId, taskId, date: localToday(), plannedMinutes: minutesValue, status: "planned", createdAt: now, updatedAt: now }) });
    trackEvent(ANALYTICS_EVENTS.goalCreated, { goal_type: "count" });
    trackEvent(ANALYTICS_EVENTS.roadmapCreated, { os_entity: "roadmap" });
    trackEvent(ANALYTICS_EVENTS.milestoneCreated, { os_entity: "milestone" });
    trackEvent(ANALYTICS_EVENTS.taskCreated, { os_entity: "task" });
    trackEvent(ANALYTICS_EVENTS.sessionScheduled, { duration: minutesValue * 60 });
    setTitle("");
    setWhy("");
    setError(null);
    onCreated(goalId);
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Create a route</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">What would make this worth doing?</h2>
        </div>
        <span className="rounded-full border border-line bg-paper-deep px-3 py-1 text-[11px] uppercase tracking-wider text-ink-faint">Goal → session</span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Goal</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Complete three focused work sessions" /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Why does it matter?</span><textarea className={inputClass} value={why} onChange={(event) => setWhy(event.target.value)} rows={2} placeholder="Build a reliable execution loop." /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-soft">Target sessions</span><input className={inputClass} type="number" min={1} value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-soft">First session minutes</span><input className={inputClass} type="number" min={5} max={180} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p> : null}
      <button type="submit" className={`mt-5 ${primaryButton}`}>Create goal and first session</button>
    </form>
  );
}

function GoalList({ goals, onProgress }: { goals: Record<string, Goal>; onProgress: (goal: Goal) => void }) {
  const entries = Object.values(goals);
  if (!entries.length) return <div className={cardClass}><p className="text-sm text-ink-soft">No goals yet. Start with one route above; the system will create the first milestone, task, and session for you.</p></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {entries.map((goal) => {
        const progress = Math.max(0, Math.min(100, goal.target ? Math.round((goal.current / goal.target) * 100) : 0));
        return <article key={goal.id} className={cardClass}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-gold">{statusLabel(goal.status)}</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">{goal.title}</h2></div><span className="font-display text-2xl font-bold text-gold">{progress}%</span></div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{goal.why || "A goal becomes clearer when the next action is visible."}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint"><span>{goal.current} of {goal.target} {goal.metric.unit ?? goal.metric.label}</span><button type="button" onClick={() => onProgress(goal)} className={secondaryButton}>Log progress</button></div>
        </article>;
      })}
    </div>
  );
}

function InlineEdit({ value, label, onSave }: { value: string; label: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) return <button type="button" className="text-left font-medium text-ink hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" onClick={() => { setDraft(value); setEditing(true); }} aria-label={`Edit ${label}`}>{value}</button>;
  return <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><label className="sr-only" htmlFor={`edit-${label}`}>{label}</label><input id={`edit-${label}`} className="min-w-[180px] flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="button" className={secondaryButton} onClick={() => { if (draft.trim()) onSave(draft.trim()); setEditing(false); }}>Save</button><button type="button" className="text-xs text-ink-faint underline hover:text-ink" onClick={() => setEditing(false)}>Cancel</button></span>;
}

function RoadmapTree({ state }: { state: ReturnType<typeof useOSStore> }) {
  const roadmaps = Object.values(state.roadmaps);
  const milestones = Object.values(state.milestones);
  const [roadmapId, setRoadmapId] = useState(roadmaps[0]?.id ?? "");
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id ?? "");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  function addMilestone(event: FormEvent) {
    event.preventDefault();
    if (!roadmapId || !milestoneTitle.trim()) return;
    const now = new Date().toISOString();
    const milestone = typeMilestone({ id: newId("milestone"), roadmapId, title: milestoneTitle.trim(), order: Object.values(state.milestones).length + 1, taskIds: [], status: "active", createdAt: now, updatedAt: now });
    dispatchOS({ type: "milestone/add", milestone });
    trackEvent(ANALYTICS_EVENTS.milestoneCreated, { os_entity: "milestone" });
    setMilestoneTitle("");
    setMilestoneId(milestone.id);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!milestoneId || !taskTitle.trim()) return;
    const now = new Date().toISOString();
    const task = typeTask({ id: newId("task"), milestoneId, title: taskTitle.trim(), kind: "action", order: 1, sessionIds: [], status: "todo", createdAt: now, updatedAt: now });
    dispatchOS({ type: "task/add", task });
    trackEvent(ANALYTICS_EVENTS.taskCreated, { os_entity: "task" });
    setTaskTitle("");
  }

  return <section className={cardClass}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Route builder</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Edit the route, not just the goal</h2></div><span className="text-xs text-ink-faint">{roadmaps.length} roadmap{roadmaps.length === 1 ? "" : "s"}</span></div>
    {roadmaps.length ? <div className="mt-5 space-y-4">{roadmaps.map((roadmap) => <div key={roadmap.id} className="rounded-xl border border-line bg-paper p-4"><div className="flex flex-wrap items-center gap-3"><InlineEdit value={roadmap.title} label="roadmap title" onSave={(title) => { dispatchOS({ type: "roadmap/update", roadmapId: roadmap.id, patch: { title }, updatedAt: new Date().toISOString() }); trackEvent(ANALYTICS_EVENTS.roadmapUpdated, { os_entity: "roadmap" }); }} /><span className="rounded-full border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-ink-faint">phase {roadmap.phase}</span></div>{roadmap.milestoneIds.length ? <div className="mt-4 space-y-3">{roadmap.milestoneIds.map((id) => { const milestone = state.milestones[id]; if (!milestone) return null; return <div key={id} className="rounded-lg border border-line/80 bg-card p-3"><div className="flex flex-wrap items-center gap-3"><InlineEdit value={milestone.title} label="milestone title" onSave={(title) => { dispatchOS({ type: "milestone/update", milestoneId: milestone.id, patch: { title }, updatedAt: new Date().toISOString() }); trackEvent(ANALYTICS_EVENTS.milestoneUpdated, { os_entity: "milestone" }); }} /><span className="text-xs text-ink-faint">{milestone.taskIds.length} task{milestone.taskIds.length === 1 ? "" : "s"}</span></div>{milestone.taskIds.length ? <ul className="mt-3 space-y-2">{milestone.taskIds.map((taskId) => { const task = state.tasks[taskId]; if (!task) return null; return <li key={task.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2"><InlineEdit value={task.title} label="task title" onSave={(title) => { dispatchOS({ type: "task/update", taskId: task.id, patch: { title }, updatedAt: new Date().toISOString() }); trackEvent(ANALYTICS_EVENTS.taskUpdated, { os_entity: "task" }); }} />{task.sessionIds.length ? <span className="text-[11px] text-ink-faint">session scheduled</span> : <button type="button" className={secondaryButton} onClick={() => { const now = new Date().toISOString(); const session = typeSession({ id: newId("session"), taskId: task.id, date: localToday(), plannedMinutes: task.estimatedMinutes ?? 25, status: "planned", createdAt: now, updatedAt: now }); dispatchOS({ type: "session/schedule", session }); trackEvent(ANALYTICS_EVENTS.sessionScheduled, { duration: session.plannedMinutes * 60 }); }}>Schedule session</button>}</li>; })}</ul> : <p className="mt-3 text-xs text-ink-faint">Add a task below to make this milestone executable.</p>}</div>; })}</div> : <p className="mt-4 text-sm text-ink-soft">This roadmap has no milestones yet.</p>}</div>)}</div> : <p className="mt-4 text-sm text-ink-soft">Create a goal first; its roadmap will appear here.</p>}
    {roadmaps.length ? <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2"><form onSubmit={addMilestone} className="rounded-lg border border-line bg-paper p-3"><label className="block text-xs font-semibold text-ink-soft">Add milestone<select className={inputClass} value={roadmapId} onChange={(event) => setRoadmapId(event.target.value)}>{roadmaps.map((roadmap) => <option key={roadmap.id} value={roadmap.id}>{roadmap.title}</option>)}</select></label><input className={inputClass} value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="First proof of progress" /><button className={`mt-3 ${secondaryButton}`} type="submit">Add milestone</button></form><form onSubmit={addTask} className="rounded-lg border border-line bg-paper p-3"><label className="block text-xs font-semibold text-ink-soft">Add task<select className={inputClass} value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label><input className={inputClass} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Write the smallest next action" /><button className={`mt-3 ${secondaryButton}`} type="submit">Add task</button></form></div> : null}
  </section>;
}

function SessionPanel({ sessions, title = "Today's sessions", showAll = false }: { sessions: Record<string, Session>; title?: string; showAll?: boolean }) {
  const today = localToday();
  const rows = Object.values(sessions).filter((session) => showAll || session.date === today).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  function start(session: Session) {
    dispatchOS({ type: "session/start", sessionId: session.id, occurredAt: new Date().toISOString() });
    trackEvent(ANALYTICS_EVENTS.focusSessionStarted, { duration: session.plannedMinutes * 60 });
  }

  function complete(session: Session) {
    dispatchOS({ type: "session/complete", sessionId: session.id, occurredAt: new Date().toISOString() });
    trackEvent(ANALYTICS_EVENTS.focusSessionCompleted, { duration: session.plannedMinutes * 60 });
  }

  return <section className={cardClass}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Execution</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">{title}</h2></div><Link href="/goals/" className="text-sm font-semibold text-gold hover:underline">Plan a route →</Link></div>
    {!rows.length ? <p className="mt-5 text-sm text-ink-soft">No sessions here yet. Create a goal to schedule the first one.</p> : <div className="mt-5 space-y-3">{rows.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-ink">{session.date} · {session.plannedMinutes} min</p><span className="rounded-full border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-ink-faint">{statusLabel(session.status)}</span></div>{session.note ? <p className="mt-1 text-xs text-ink-soft">{session.note}</p> : <p className="mt-1 text-xs text-ink-faint">A bounded block with a visible outcome.</p>}</div>{session.status === "planned" ? <button type="button" onClick={() => start(session)} className={secondaryButton}>Start</button> : null}{session.status === "in-progress" ? <button type="button" onClick={() => complete(session)} className={primaryButton}>Complete</button> : null}{session.status === "completed" ? <span className="text-sm font-semibold text-gold">Recorded</span> : null}</div>)}</div>}
  </section>;
}

function FocusTimerPanel({ sessions }: { sessions: Record<string, Session> }) {
  const selected = Object.values(sessions).find((session) => session.status === "in-progress") ?? Object.values(sessions).find((session) => session.status === "planned");
  const selectedId = selected?.id;
  const [remaining, setRemaining] = useState(selected ? selected.plannedMinutes * 60 : 0);
  const [running, setRunning] = useState(selected?.status === "in-progress");
  const [interruptionSeconds, setInterruptionSeconds] = useState("60");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, selectedId]);

  if (!selected) return <section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Focus timer</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">No session is ready</h2><p className="mt-2 text-sm text-ink-soft">Create a goal or schedule a task before starting a focus block.</p><Link href="/goals/" className={`mt-4 ${primaryButton}`}>Create a session</Link></section>;
  const activeSession = selected;
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  function start() {
    dispatchOS({ type: "session/start", sessionId: activeSession.id, occurredAt: new Date().toISOString() });
    setRunning(true);
    trackEvent(ANALYTICS_EVENTS.focusSessionStarted, { duration: activeSession.plannedMinutes * 60 });
  }
  function complete() {
    dispatchOS({ type: "session/complete", sessionId: activeSession.id, occurredAt: new Date().toISOString(), note: note.trim() || undefined, value: Math.max(1, activeSession.plannedMinutes - Math.ceil(remaining / 60)) });
    setRunning(false);
    trackEvent(ANALYTICS_EVENTS.focusSessionCompleted, { duration: activeSession.plannedMinutes * 60 });
  }
  function interrupt() {
    const secondsValue = Math.max(1, Number(interruptionSeconds) || 60);
    dispatchOS({ type: "session/interrupt", sessionId: activeSession.id, occurredAt: new Date().toISOString(), seconds: secondsValue, note: note.trim() || undefined });
    setRunning(false);
    trackEvent(ANALYTICS_EVENTS.focusSessionInterrupted, { duration: secondsValue });
  }
  return <section className={`${cardClass} border-gold/40`}>
     <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Focus timer</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">One bounded block</h2><p className="mt-1 text-sm text-ink-soft">{activeSession.plannedMinutes} minutes planned · {activeSession.interruptionCount} interruption{activeSession.interruptionCount === 1 ? "" : "s"} recorded</p></div><div className="font-mono text-4xl font-semibold tracking-tight text-ink" aria-live="polite">{minutes}:{seconds}</div></div>
    <div className="mt-5 flex flex-wrap gap-2">{activeSession.status === "planned" || !running ? <button type="button" onClick={start} className={primaryButton}>{activeSession.status === "planned" ? "Start block" : "Resume block"}</button> : null}{activeSession.status !== "completed" ? <button type="button" onClick={interrupt} className={secondaryButton}>Log interruption</button> : null}{activeSession.status !== "completed" ? <button type="button" onClick={complete} className={secondaryButton}>Complete block</button> : null}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[160px_1fr]"><label className="block"><span className="text-xs font-semibold text-ink-soft">Interruption seconds</span><input className={inputClass} type="number" min={1} value={interruptionSeconds} onChange={(event) => setInterruptionSeconds(event.target.value)} /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Completion note</span><input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened or what did you finish?" /></label></div>
  </section>;
}

function ProgressForm({ goals }: { goals: Record<string, Goal> }) {
  const entries = Object.values(goals).filter((goal) => goal.status !== "archived");
  const [goalId, setGoalId] = useState(entries[0]?.id ?? "");
  const [current, setCurrent] = useState("");
  if (!entries.length) return null;
  const selected = entries.find((goal) => goal.id === goalId) ?? entries[0];
  return <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const value = Number(current); if (!Number.isFinite(value)) return; dispatchOS({ type: "goal/progress", goalId: selected.id, current: value, occurredAt: new Date().toISOString(), note: "Progress logged from Today." }); trackEvent(ANALYTICS_EVENTS.goalProgressed, { os_entity: "goal" }); setCurrent(""); }}><label className="min-w-[220px] flex-1"><span className="text-xs font-semibold text-ink-soft">Goal</span><select className={inputClass} value={selected.id} onChange={(event) => setGoalId(event.target.value)}>{entries.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label className="w-32"><span className="text-xs font-semibold text-ink-soft">Current</span><input className={inputClass} type="number" min={0} value={current} onChange={(event) => setCurrent(event.target.value)} placeholder={String(selected.current)} /></label><button type="submit" className={primaryButton}>Save progress</button></form>;
}

function ReviewForm({ state }: { state: ReturnType<typeof useOSStore> }) {
  const [kind, setKind] = useState<"daily" | "weekly">("daily");
  const [worked, setWorked] = useState("");
  const [learned, setLearned] = useState("");
  const [nextChange, setNextChange] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!worked.trim() || !learned.trim() || !nextChange.trim()) return;
    const date = localToday();
    const sessions = Object.values(state.sessions).filter((session) => session.date === date);
    const review = { id: `${kind}-${date}`, kind, date, completedAt: new Date().toISOString(), completedSessionCount: sessions.filter((session) => session.status === "completed").length, missedSessionCount: sessions.filter((session) => session.status === "skipped" || (session.status !== "completed" && session.date < date)).length, worked: worked.trim(), learned: learned.trim(), nextChange: nextChange.trim(), recoveryReason: recoveryReason.trim() } as const;
    dispatchOS({ type: "review/complete", review });
    trackEvent(ANALYTICS_EVENTS.reviewCompleted, { review_kind: kind });
    trackEvent(kind === "daily" ? ANALYTICS_EVENTS.dailyReviewCompleted : ANALYTICS_EVENTS.weeklyReviewCompleted, { review_kind: kind });
    setWorked(""); setLearned(""); setNextChange(""); setRecoveryReason("");
  }
  return <form className={cardClass} onSubmit={submit}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Write it down</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Complete a {kind} review</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-xs font-semibold text-ink-soft">Review type</span><select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as "daily" | "weekly")}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Recovery reason (optional)</span><input className={inputClass} value={recoveryReason} onChange={(event) => setRecoveryReason(event.target.value)} placeholder="Time, energy, distraction, or external event" /></label><label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">What worked?</span><textarea className={inputClass} rows={2} value={worked} onChange={(event) => setWorked(event.target.value)} /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">What did you learn?</span><textarea className={inputClass} rows={2} value={learned} onChange={(event) => setLearned(event.target.value)} /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">What changes next?</span><textarea className={inputClass} rows={2} value={nextChange} onChange={(event) => setNextChange(event.target.value)} /></label></div><button type="submit" className={`mt-4 ${primaryButton}`}>Save review</button></form>;
}

function ReviewPanel({ state }: { state: ReturnType<typeof useOSStore> }) {
  const today = localToday();
  const overdue = Object.values(state.sessions).filter((session) => session.date < today && session.status !== "completed" && session.status !== "skipped");
  const events = [...state.completionEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8);
  const reviews = Object.values(state.reviews).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return <div className="space-y-5"><section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Recovery</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Misses are information</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">Choose the smallest honest restart. No streak punishment, no pretending the missed session happened.</p>{overdue.length ? <div className="mt-4 space-y-3">{overdue.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4"><div><p className="font-medium text-ink">Recover the {session.plannedMinutes}-minute block from {session.date}</p><p className="mt-1 text-xs text-ink-faint">Start it now, then complete it when the work is real.</p></div><button type="button" className={primaryButton} onClick={() => { dispatchOS({ type: "session/recover", sessionId: session.id, occurredAt: new Date().toISOString() }); trackEvent(ANALYTICS_EVENTS.recoveryStarted, { recovery: "session" }); }}>Restart block</button></div>)}</div> : <p className="mt-4 rounded-lg bg-paper-deep p-3 text-sm text-ink-soft">No unfinished past sessions. Keep the next action small.</p>}</section><ReviewForm state={state} /><section className={cardClass}><div className="flex items-center justify-between gap-3"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Evidence</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">What the record says</h2></div><span className="text-xs text-ink-faint">{events.length} recent events</span></div>{events.length ? <ul className="mt-4 space-y-3">{events.map((event) => <li key={event.id} className="border-l-2 border-gold/50 pl-3"><p className="text-sm text-ink">{statusLabel(event.kind)}{event.note ? ` — ${event.note}` : ""}</p><p className="mt-1 text-xs text-ink-faint">{event.occurredAt.slice(0, 10)}</p></li>)}</ul> : <p className="mt-4 text-sm text-ink-soft">Complete a session or log goal progress to create your first review evidence.</p>}</section>{reviews.length ? <section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Saved reviews</p><div className="mt-4 space-y-3">{reviews.map((review) => <article key={review.id} className="rounded-xl border border-line bg-paper p-4"><p className="text-xs uppercase tracking-wider text-gold">{review.kind} · {review.date}</p><p className="mt-2 text-sm text-ink">{review.worked}</p><p className="mt-1 text-xs text-ink-soft">Next: {review.nextChange}</p></article>)}</div></section> : null}</div>;
}

function PlaybookPanel({ state }: { state: ReturnType<typeof useOSStore> }) {
  const wins = [...state.completionEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5);
  const activeGoals = Object.values(state.goals).filter((goal) => goal.status === "active");
  return <div className="grid gap-5 lg:grid-cols-2"><section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Active goals</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">What you are building</h2>{activeGoals.length ? <ul className="mt-4 space-y-3">{activeGoals.map((goal) => <li key={goal.id} className="rounded-xl border border-line bg-paper p-4"><p className="font-medium text-ink">{goal.title}</p><p className="mt-1 text-xs text-ink-soft">Next: {goal.nextAction}</p></li>)}</ul> : <p className="mt-4 text-sm text-ink-soft">Create a goal to make this playbook yours.</p>}</section><section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Working principles</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Keep, modify, delete</h2><ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft"><li>Protect the smallest version of the action.</li><li>Let evidence outrank the story about your motivation.</li><li>Never miss twice without changing the design.</li></ul><div className="mt-5 border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Recent proof</p>{wins.length ? <p className="mt-2 text-sm text-ink">{wins.length} completion events recorded locally.</p> : <p className="mt-2 text-sm text-ink-soft">Your first proof will appear here.</p>}</div></section></div>;
}

function ExperimentsPanel() {
  const experiments = useExperimentsStore();
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState("");
  const [variable, setVariable] = useState("");
  return <div className="space-y-5"><form className={cardClass} onSubmit={(event) => { event.preventDefault(); if (!hypothesis.trim() || !metric.trim()) return; addExperiment({ hypothesis: hypothesis.trim(), durationDays: 7, baseline: "Start with today's baseline.", variable: variable.trim() || "One small change", metric: metric.trim(), status: "planned", result: "", reflection: "", decision: null }); setHypothesis(""); setMetric(""); setVariable(""); }}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">New experiment</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Change one variable</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-soft">Hypothesis</span><input className={inputClass} value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} placeholder="A 25-minute first block will make starting easier." /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Variable</span><input className={inputClass} value={variable} onChange={(event) => setVariable(event.target.value)} placeholder="Start with 25 minutes" /></label><label className="block"><span className="text-xs font-semibold text-ink-soft">Metric</span><input className={inputClass} value={metric} onChange={(event) => setMetric(event.target.value)} placeholder="Sessions completed" /></label></div><button type="submit" className={`mt-5 ${primaryButton}`}>Start experiment</button></form>{experiments.length ? <div className="grid gap-4 lg:grid-cols-2">{experiments.map((experiment) => <article key={experiment.id} className={cardClass}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-gold">{statusLabel(experiment.status)}</p><h2 className="mt-1 font-display text-lg font-semibold text-ink">{experiment.hypothesis}</h2></div><span className="text-xs text-ink-faint">{experiment.durationDays} days</span></div><p className="mt-3 text-sm text-ink-soft">Metric: {experiment.metric}</p><p className="mt-1 text-sm text-ink-soft">Variable: {experiment.variable}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => updateExperiment(experiment.id, { status: experiment.status === "planned" ? "running" : "complete" })}>{experiment.status === "planned" ? "Begin" : experiment.status === "running" ? "Mark complete" : "Completed"}</button>{experiment.status === "complete" ? <select aria-label={`Decision for ${experiment.hypothesis}`} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" value={experiment.decision ?? ""} onChange={(event) => updateExperiment(experiment.id, { decision: (event.target.value || null) as ExperimentDecision | null })}><option value="">Choose decision</option><option value="keep">Keep</option><option value="modify">Modify</option><option value="abandon">Abandon</option><option value="repeat">Repeat</option></select> : null}</div></article>)}</div> : <div className={cardClass}><p className="text-sm text-ink-soft">No experiments yet. A good experiment is small enough to finish and specific enough to learn from.</p></div>}</div>;
}

export default function LevelUpOSWorkspace({ mode }: { mode: OSWorkspaceMode }) {
  const state = useOSStore();
  const copy = pageCopy(mode);
  const [notice, setNotice] = useState<string | null>(null);
  const goals = state.goals;
  const sessions = state.sessions;
  const todaySessions = useMemo(() => Object.values(sessions).filter((session) => session.date === localToday()), [sessions]);
  const completedToday = todaySessions.filter((session) => session.status === "completed").length;
  const activeGoal = Object.values(goals).find((goal) => goal.status === "active");

  function created(goalId: string) {
    setNotice(`Goal created. Its first session is ready in Today.`);
    if (mode !== "today") window.setTimeout(() => document.getElementById(`goal-${goalId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  return <PageShell><SectionHeading eyebrow={copy.eyebrow} title={copy.title} lede={copy.lede} />
    {notice ? <p className="mb-5 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink" role="status">{notice}</p> : null}
    {mode === "today" ? <div className="space-y-5"><section className={`${cardClass} border-gold/40`}><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs uppercase tracking-[0.2em] text-gold">{localToday()}</p><h2 className="mt-1 font-display text-2xl font-semibold text-ink">Your next visible move</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{activeGoal ? `Work toward ${activeGoal.title}. ${todaySessions.length ? `${completedToday} of ${todaySessions.length} sessions complete today.` : "The first session is ready when you are."}` : todaySessions.length ? `${completedToday} of ${todaySessions.length} sessions complete today.` : "No session is scheduled yet. Create a goal and let the system make the first block concrete."}</p></div><div className="rounded-xl border border-line bg-paper px-4 py-3 text-right"><p className="text-xs uppercase tracking-wider text-ink-faint">Active goals</p><p className="mt-1 font-display text-2xl font-bold text-gold">{Object.values(goals).filter((goal) => goal.status === "active").length}</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Link href="/goals/" className={primaryButton}>Create or edit goals</Link><Link href="/focus/" className={secondaryButton}>Open focus</Link><Link href="/review/" className={secondaryButton}>Review the record</Link></div></section><GoalForm onCreated={created} /><SessionPanel sessions={sessions} /><section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Goal progress</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Update the record, not the story</h2><ProgressForm goals={goals} /></section></div> : null}
    {mode === "goals" ? <div className="space-y-5"><GoalForm onCreated={created} /><GoalList goals={goals} onProgress={(goal) => { dispatchOS({ type: "goal/progress", goalId: goal.id, current: Math.min(goal.target, goal.current + 1), occurredAt: new Date().toISOString(), note: "One unit of progress logged from Goals." }); trackEvent(ANALYTICS_EVENTS.goalProgressed, { os_entity: "goal" }); }} /><RoadmapTree state={state} /></div> : null}
    {mode === "focus" ? <div className="space-y-5"><section className={cardClass}><p className="text-sm leading-relaxed text-ink-soft">Focus is a session with a beginning, an end, and a recorded result. Start the block only when the task is specific enough to finish.</p></section><FocusTimerPanel sessions={sessions} /><SessionPanel sessions={sessions} title="Focus blocks" showAll /></div> : null}
    {mode === "review" ? <ReviewPanel state={state} /> : null}
    {mode === "playbook" ? <PlaybookPanel state={state} /> : null}
    {mode === "experiments" ? <ExperimentsPanel /> : null}
  </PageShell>;
}
