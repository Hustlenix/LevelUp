"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { localToday } from "@/lib/dates";
import { dispatchOS, useOSStore } from "@/lib/os/store";
import { typeGoal, typeMilestone, typeRoadmap, typeSession, typeTask } from "@/lib/os/types";
import type { Goal, Session } from "@/lib/os/types";
import { addExperiment, updateExperiment, useExperimentsStore, type ExperimentDecision } from "@/lib/experiments";
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

function SessionPanel({ sessions, title = "Today's sessions", showAll = false }: { sessions: Record<string, Session>; title?: string; showAll?: boolean }) {
  const today = localToday();
  const rows = Object.values(sessions).filter((session) => showAll || session.date === today).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return <section className={cardClass}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Execution</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">{title}</h2></div><Link href="/goals/" className="text-sm font-semibold text-gold hover:underline">Plan a route →</Link></div>
    {!rows.length ? <p className="mt-5 text-sm text-ink-soft">No sessions here yet. Create a goal to schedule the first one.</p> : <div className="mt-5 space-y-3">{rows.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-ink">{session.date} · {session.plannedMinutes} min</p><span className="rounded-full border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-ink-faint">{statusLabel(session.status)}</span></div>{session.note ? <p className="mt-1 text-xs text-ink-soft">{session.note}</p> : <p className="mt-1 text-xs text-ink-faint">A bounded block with a visible outcome.</p>}</div>{session.status === "planned" ? <button type="button" onClick={() => dispatchOS({ type: "session/start", sessionId: session.id, occurredAt: new Date().toISOString() })} className={secondaryButton}>Start</button> : null}{session.status === "in-progress" ? <button type="button" onClick={() => dispatchOS({ type: "session/complete", sessionId: session.id, occurredAt: new Date().toISOString() })} className={primaryButton}>Complete</button> : null}{session.status === "completed" ? <span className="text-sm font-semibold text-gold">Recorded</span> : null}</div>)}</div>}
  </section>;
}

function ProgressForm({ goals }: { goals: Record<string, Goal> }) {
  const entries = Object.values(goals).filter((goal) => goal.status !== "archived");
  const [goalId, setGoalId] = useState(entries[0]?.id ?? "");
  const [current, setCurrent] = useState("");
  if (!entries.length) return null;
  const selected = entries.find((goal) => goal.id === goalId) ?? entries[0];
  return <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const value = Number(current); if (!Number.isFinite(value)) return; dispatchOS({ type: "goal/progress", goalId: selected.id, current: value, occurredAt: new Date().toISOString(), note: "Progress logged from Today." }); setCurrent(""); }}><label className="min-w-[220px] flex-1"><span className="text-xs font-semibold text-ink-soft">Goal</span><select className={inputClass} value={selected.id} onChange={(event) => setGoalId(event.target.value)}>{entries.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label className="w-32"><span className="text-xs font-semibold text-ink-soft">Current</span><input className={inputClass} type="number" min={0} value={current} onChange={(event) => setCurrent(event.target.value)} placeholder={String(selected.current)} /></label><button type="submit" className={primaryButton}>Save progress</button></form>;
}

function ReviewPanel({ state }: { state: ReturnType<typeof useOSStore> }) {
  const today = localToday();
  const overdue = Object.values(state.sessions).filter((session) => session.date < today && session.status !== "completed" && session.status !== "skipped");
  const events = [...state.completionEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8);
  return <div className="space-y-5"><section className={cardClass}><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Recovery</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">Misses are information</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">Choose the smallest honest restart. No streak punishment, no pretending the missed session happened.</p>{overdue.length ? <div className="mt-4 space-y-3">{overdue.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-4"><div><p className="font-medium text-ink">Recover the {session.plannedMinutes}-minute block from {session.date}</p><p className="mt-1 text-xs text-ink-faint">Start it now, then complete it when the work is real.</p></div><button type="button" className={primaryButton} onClick={() => dispatchOS({ type: "session/start", sessionId: session.id, occurredAt: new Date().toISOString() })}>Restart block</button></div>)}</div> : <p className="mt-4 rounded-lg bg-paper-deep p-3 text-sm text-ink-soft">No unfinished past sessions. Keep the next action small.</p>}</section><section className={cardClass}><div className="flex items-center justify-between gap-3"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Evidence</p><h2 className="mt-1 font-display text-xl font-semibold text-ink">What the record says</h2></div><span className="text-xs text-ink-faint">{events.length} recent events</span></div>{events.length ? <ul className="mt-4 space-y-3">{events.map((event) => <li key={event.id} className="border-l-2 border-gold/50 pl-3"><p className="text-sm text-ink">{statusLabel(event.kind)}{event.note ? ` — ${event.note}` : ""}</p><p className="mt-1 text-xs text-ink-faint">{event.occurredAt.slice(0, 10)}</p></li>)}</ul> : <p className="mt-4 text-sm text-ink-soft">Complete a session or log goal progress to create your first review evidence.</p>}</section></div>;
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
    {mode === "goals" ? <div className="space-y-5"><GoalForm onCreated={created} /><GoalList goals={goals} onProgress={(goal) => dispatchOS({ type: "goal/progress", goalId: goal.id, current: Math.min(goal.target, goal.current + 1), occurredAt: new Date().toISOString(), note: "One unit of progress logged from Goals." })} /></div> : null}
    {mode === "focus" ? <div className="space-y-5"><section className={cardClass}><p className="text-sm leading-relaxed text-ink-soft">Focus is a session with a beginning, an end, and a recorded result. Start the block only when the task is specific enough to finish.</p></section><SessionPanel sessions={sessions} title="Focus blocks" showAll /></div> : null}
    {mode === "review" ? <ReviewPanel state={state} /> : null}
    {mode === "playbook" ? <PlaybookPanel state={state} /> : null}
    {mode === "experiments" ? <ExperimentsPanel /> : null}
  </PageShell>;
}
