"use client";
import Link from "next/link";
import { useState } from "react";
import { dispatchSmallSteps, useSmallSteps } from "@/lib/smallStepsStore";
import type { SavedAction } from "@/lib/smallSteps";
const button = "inline-flex min-h-11 items-center justify-center rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50";

export function SaveAction({ task, action, source, minutes = 5 }: { task: string; action: string; source: string; minutes?: number }) {
  const { state, error } = useSmallSteps();
  const queue = state.queue ?? [];
  const exists = queue.some(a => a.task === task && a.source === source);
  return <div className="mt-4 text-sm no-print"><div className="flex flex-wrap items-center gap-3"><button type="button" className={button} disabled={exists || queue.length >= 20} onClick={() => dispatchSmallSteps({ type: "queue/add", action: { id: crypto.randomUUID(), task, actions: [action], current: 0, minutes, restart: "", source } })}>{exists ? "Saved to next actions" : queue.length >= 20 ? "Next actions is full (20)" : "Save as a next action"}</button><Link className="inline-flex min-h-11 items-center text-gold underline underline-offset-4" href="/small-steps/#next-actions">Open next actions →</Link></div><p role="status" className="mt-2 text-xs text-ink-soft">{error || (exists ? "Available in Today and Small Steps. Your current task is unchanged." : "")}</p></div>;
}

export function SavedActions({ compact = false }: { compact?: boolean }) {
  const { state, error } = useSmallSteps();
  const [removed, setRemoved] = useState<SavedAction | null>(null);
  const queue = state.queue ?? [];
  if (compact && !queue.length) return null;
  return <section id={compact ? undefined : "next-actions"} aria-label="Next actions" className="my-6 scroll-mt-28 border-y border-line py-5 text-ink">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-2xl">Next actions</h2><span className="text-xs text-ink-soft">{queue.length} saved · choose when ready</span></div>
    <p className="mt-2 text-sm text-ink-soft">{compact ? "Small actions you saved from lessons and practice." : "A short list for later. Opening an action parks your current draft here safely."}</p>
    {!queue.length && <p className="mt-4 text-sm">Save a first step from a <Link className="text-gold underline" href="/chapters/">lesson</Link> or a <Link className="text-gold underline" href="/protocols/">practice plan</Link>. Nothing is due.</p>}
    <ul className="mt-3 divide-y divide-line">{queue.slice(0, compact ? 3 : 20).map((a, index) => <li key={a.id} className="py-4">
      <h3 className="font-semibold">{a.task}</h3><p className="mt-1 break-words text-sm text-ink-soft">{a.actions[a.current]}</p>
      {!compact && <div className="mt-3 flex flex-wrap gap-2">
        <button className={button} disabled={state.phase !== "ready"} onClick={() => {
          dispatchSmallSteps({ type: "queue/select", id: a.id, parkedId: crypto.randomUUID() });
          const editor = document.getElementById("small-step-editor");
          editor?.focus({ preventScroll: true }); editor?.scrollIntoView({ block: "start" });
        }}>Open action</button>
        {index > 0 && <button className={button} onClick={() => dispatchSmallSteps({ type: "queue/first", id: a.id })} aria-label={`Move ${a.task} to first`}>Move to first</button>}
        <button className={button} aria-label={`Remove ${a.task}`} onClick={() => { setRemoved(a); dispatchSmallSteps({ type: "queue/remove", id: a.id }); }}>Remove</button>
        {a.source && <Link className={`${button} text-gold`} href={a.source}>Source lesson / plan</Link>}
      </div>}
    </li>)}</ul>
    {compact ? <Link className={`${button} mt-3`} href="/small-steps/#next-actions">Choose an action →</Link> : <>
      {state.phase !== "ready" && <p className="mt-3 text-sm text-ink-soft">Finish or leave your current block for later before switching actions.</p>}
      {removed && <p role="status" className="mt-3 text-sm">Removed {removed.task}. <button className={button} disabled={queue.length >= 20} onClick={() => { dispatchSmallSteps({ type: "queue/add", action: removed }); setRemoved(null); }}>Undo</button></p>}
    </>}{compact && error && <p role="alert" className="mt-3 text-sm">{error}</p>}
  </section>;
}
