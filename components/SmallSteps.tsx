"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { STEP_EXAMPLES, isSmallSteps, restoreSmallSteps, type StepEvent } from "@/lib/smallSteps";
import { dispatchSmallSteps, getSmallStepsBackup, saveSmallSteps, useSmallSteps } from "@/lib/smallStepsStore";
import { logFocusSession } from "@/lib/actionTools";
import { SavedActions } from "@/components/SavedActions";

const button = "min-h-11 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50";
const primary = `${button.replace("text-ink", "text-paper")} bg-ink`;
const input = "mt-2 block w-full rounded-md border border-line bg-paper p-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-gold";
const subscribeNone = () => () => {};
const isLoopback = () => ["localhost", "127.0.0.1"].includes(location.hostname);

export function SmallStepsLink() {
  const { state } = useSmallSteps();
  return <Link href="/small-steps/" className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-2 border-y border-line py-4 text-sm text-ink"><span>{state.task ? `Pick up: ${state.task}` : "Finding it hard to begin? Start with one small action."}</span><span className="font-semibold text-gold">{state.task ? "Return to Small Steps" : "Try Small Steps"} →</span></Link>;
}

export default function SmallSteps() {
  const { state: s, error } = useSmallSteps();
  const [working, setWorking] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<{ task: string; actions: string[]; smaller: string } | null>(null);
  const privateAI = useSyncExternalStore(subscribeNone, isLoopback, () => false) && s.current === 0;
  const dialog = useRef<HTMLDialogElement>(null);
  const abort = useRef<AbortController | null>(null);
  const send = (event: StepEvent) => dispatchSmallSteps(event);

  useEffect(() => {
    return () => { abort.current?.abort(); dispatchSmallSteps({ type: "pause", now: Date.now() }); };
  }, []);
  useEffect(() => {
    const pause = () => { if (document.hidden) dispatchSmallSteps({ type: "pause", now: Date.now() }); };
    const leave = () => dispatchSmallSteps({ type: "pause", now: Date.now() });
    document.addEventListener("visibilitychange", pause);
    window.addEventListener("pagehide", leave);
    const timer = window.setInterval(() => { if (!document.hidden && getSmallStepsBackup().phase === "running") dispatchSmallSteps({ type: "tick", now: Date.now() }); }, 1000);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", pause); window.removeEventListener("pagehide", leave); };
  }, []);
  useEffect(() => { if (working) dialog.current?.showModal(); else dialog.current?.close(); }, [working]);
  useEffect(() => {
    for (const attempt of s.history) logFocusSession({ taskName: attempt.task, durationMinutes: attempt.minutes, completedSeconds: attempt.seconds, distractions: [], oneLineWin: attempt.action }, { id: attempt.id, date: attempt.date, completedAt: attempt.completedAt });
  }, [s.history]);

  function leave() { send({ type: "pause", now: Date.now() }); setWorking(false); setStuck(false); }
  function start() { send({ type: "start", now: Date.now(), id: `smallsteps_${crypto.randomUUID()}` }); setWorking(true); }
  function finish(choice: "done" | "continue" | "later") {
    send({ type: "finish", choice, now: Date.now() }); setWorking(false); setStuck(false);
    setNotice(choice === "done" ? "Action finished. You can stop here or choose your next step." : "Your place is saved. Continue whenever you want.");
  }
  function exportRecovery() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ smallSteps: s }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "levelup-small-steps-recovery.json"; a.click(); URL.revokeObjectURL(url);
  }
  async function suggest() {
    const task = s.task.trim(); if (!task || busy) return;
    setBusy(true); setSuggestion(null); setNotice("");
    const controller = new AbortController(); abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 11000);
    try {
      const response = await fetch("http://127.0.0.1:3114/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task }), signal: controller.signal });
      if (!response.ok) throw new Error("Unavailable");
      const result = await response.json();
      if (!Array.isArray(result.actions) || result.actions.length < 1 || result.actions.length > 3 || result.actions.some((a: unknown) => typeof a !== "string" || !a.trim() || a.length > 240) || typeof result.smaller !== "string" || !result.smaller.trim() || result.smaller.length > 240) throw new Error("Invalid suggestion");
      setSuggestion({ task, actions: result.actions, smaller: result.smaller });
    } catch { setNotice("The private helper is unavailable. You can still write one small action or use an example."); }
    finally { clearTimeout(timeout); setBusy(false); }
  }
  async function importRecovery(file: File) {
    try {
      if (file.size > 250000) throw new Error("Too large");
      const parsed = JSON.parse(await file.text());
      if (!isSmallSteps(parsed.smallSteps)) throw new Error("Invalid data");
      if (!window.confirm("Replace your current Small Steps draft and attempts with this recovery copy?")) return;
      saveSmallSteps(restoreSmallSteps(parsed.smallSteps));
      setNotice("Recovery copy restored.");
    } catch { setNotice("That recovery file could not be read. Your current steps were kept."); }
  }
  const remaining = Math.max(0, s.minutes * 60 - Math.floor(s.elapsed));
  const savedNotice = error ? <div role="alert" className="my-4 border border-gold p-4"><p>{error}</p><button className={button} onClick={exportRecovery}>Export recovery copy</button></div> : null;
  const notes = <div className="mt-6 space-y-5"><label className="block text-sm font-medium">When I return…<textarea className={input} maxLength={500} rows={2} value={s.restart} placeholder="The next thing to do is…" onChange={e => send({ type: "edit", patch: { restart: e.target.value } })} /></label><details><summary className="min-h-11 cursor-pointer py-3 text-sm">Later pad — put a thought here</summary><label className="block text-sm">Things for later<textarea className={input} maxLength={2000} rows={3} value={s.later} onChange={e => send({ type: "edit", patch: { later: e.target.value } })} /></label></details></div>;

  return <div className="mx-auto max-w-2xl px-4 py-8 text-ink sm:px-8 sm:py-12">
    <p className="text-xs font-semibold uppercase tracking-widest text-gold">Small Steps</p>
    <h1 className="mt-3 font-display text-4xl">Just the next thing.</h1>
    <p className="mt-3 leading-relaxed text-ink-soft">A little help starting, stopping, and finding your way back. No goal setup needed.</p>
    {!working && savedNotice}
    <p role="status" className="mt-4 text-sm text-ink-soft">{notice}</p>
    <section id="small-step-editor" tabIndex={-1} aria-label="Current action" className="mt-6 scroll-mt-28 border-y border-line py-6 focus-visible:outline-2 focus-visible:outline-gold">
      <label className="block font-medium">What are you trying to start?<input className={input} maxLength={240} value={s.task} disabled={s.phase !== "ready"} placeholder="Something small is enough" onChange={e => { setSuggestion(null); send({ type: "edit", patch: { task: e.target.value } }); }} /></label>
      {s.phase === "ready" && !s.task && <div className="mt-4 flex flex-wrap gap-2">{STEP_EXAMPLES.map(example => <button className={button} key={example.task} onClick={() => send({ type: "edit", patch: example })}>{example.task}</button>)}</div>}
      {s.phase === "ready" ? <>
        <label className="mt-6 block font-medium">One action I can do now<input className={input} maxLength={240} value={s.actions[s.current]} placeholder="For example: open my notebook" onChange={e => send({ type: "edit", patch: { actions: s.actions.map((a, i) => i === s.current ? e.target.value : a) } })} /></label>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">See or edit the steps ({s.actions.length})</summary><div className="space-y-3">{s.actions.map((action, index) => <label className="block text-sm" key={index}>Step {index + 1}{index < s.current ? " · finished" : ""}<input className={input} maxLength={240} disabled={index < s.current} value={action} onChange={e => send({ type: "edit", patch: { actions: s.actions.map((a, i) => i === index ? e.target.value : a) } })} /></label>)}{s.actions.length < 3 && <button className={button} onClick={() => send({ type: "edit", patch: { actions: [...s.actions, ""] } })}>Add a step</button>}</div></details>
        <fieldset className="mt-5"><legend className="text-sm font-medium">How much time feels manageable?</legend><div className="mt-3 flex flex-wrap gap-2">{[2, 5, 10, 15].map(minutes => <button key={minutes} aria-pressed={s.minutes === minutes} className={s.minutes === minutes ? primary : button} onClick={() => send({ type: "edit", patch: { minutes } })}>{minutes} min</button>)}</div></fieldset>
        <button className={`${primary} mt-6`} disabled={!s.task.trim() || !s.actions[s.current]?.trim()} onClick={start}>Start this step</button>
      </> : <div className="mt-6"><h2 className="font-display text-2xl">Your place is here.</h2><p className="mt-2">{s.actions[s.current]}</p>{s.restart && <p className="mt-3 text-ink-soft">When I return: {s.restart}</p>}<button className={`${primary} mt-4`} onClick={() => setWorking(true)}>Return to this step</button></div>}
      {!working && notes}
    </section>
    {s.source && <Link className="mt-3 inline-flex min-h-11 items-center text-sm text-gold underline" href={s.source}>Return to the source lesson / plan →</Link>}
    {!working && <SavedActions />}
    {privateAI && s.phase === "ready" && <details className="mt-5 border-b border-line pb-4"><summary className="min-h-11 cursor-pointer py-3 text-sm">Optional private AI helper</summary><p className="my-3 text-sm text-ink-soft">For an eligible Hack Club account owner on their own computer. Only the task text above is sent to Hack Club AI; leave out personal or health details. The local helper must be running.</p><button className={button} disabled={busy || !s.task.trim()} onClick={suggest}>{busy ? "Getting a suggestion…" : "Send task and suggest steps"}</button>{suggestion && suggestion.task === s.task.trim() && <div className="mt-4"><p className="text-sm">Review these suggestions before using them. You can edit every step.</p><ol className="my-3 list-decimal pl-6">{suggestion.actions.map(a => <li key={a}>{a}</li>)}</ol><p className="mb-3 text-sm">Even smaller: {suggestion.smaller}</p><button className={button} onClick={() => { send({ type: "edit", patch: { actions: suggestion.actions.slice(0, 3) } }); setSuggestion(null); }}>Use these steps</button></div>}</details>}
    <details className="mt-5"><summary className="min-h-11 cursor-pointer py-3 text-sm">Help someone start</summary><p className="mt-2 text-sm leading-relaxed text-ink-soft">Sit together if they want company. Ask which small action they would like to try. Read it aloud if useful, then let them choose when to start or stop. A child can ask a trusted adult for help. This space does not share activity with anyone.</p></details>
    <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">Previous attempts ({s.history.length})</summary><p className="mb-3 text-xs text-ink-soft">Time records the timer, not how well you concentrated. The latest 100 attempts stay here.</p><ul className="divide-y divide-line">{s.history.map(h => <li key={h.id} className="py-3 text-sm"><p>{h.task}</p><p className="text-ink-soft">{h.date} · {Math.floor(h.seconds / 60)}m {h.seconds % 60}s · {h.action}</p></li>)}</ul></details>
    <p className="mt-8 text-xs leading-relaxed text-ink-faint">Designed with attention and task initiation in mind. No diagnosis needed. Your steps stay in this browser unless you export them or explicitly use the private helper.</p>
    <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm">Recovery copies</summary><button className={button} onClick={exportRecovery}>Export recovery copy</button><label className="mt-4 block text-sm">Import a Small Steps recovery copy<input className="mt-2 block min-h-11 w-full" type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void importRecovery(file); e.target.value = ""; }} /></label></details>
    <dialog ref={dialog} aria-labelledby="step-heading" onCancel={e => { e.preventDefault(); leave(); }} className="small-steps-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-paper text-ink backdrop:bg-paper">
      <div className="mx-auto max-w-xl px-5 py-8 sm:py-16">
        <button className={button} onClick={leave}>Save place & close</button>
        <p className="mt-8 text-xs uppercase tracking-widest text-gold">One thing at a time · Step {s.current + 1}</p>
        <h2 id="step-heading" className="mt-4 break-words font-display text-3xl">{s.actions[s.current]}</h2>
        <p role="status" className="mt-4 text-sm">{s.phase === "running" ? "You can pause or stop whenever you want." : s.phase === "ended" ? "This block has ended. Nothing starts automatically." : "Paused. Your place is saved."}</p>
        <p className="my-6 text-6xl tabular-nums" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
        {s.phase === "ended" ? <><p className="mb-4 text-sm">Would you like to finish this action, try another block, or leave it for later?</p><div className="flex flex-wrap gap-3"><button className={primary} onClick={() => finish("done")}>Action done</button><button className={button} onClick={() => finish("continue")}>Another block</button><button className={button} onClick={() => finish("later")}>Leave for later</button></div><p className="mt-5 text-sm text-ink-soft">A break is welcome. Stretch, move, or rest if you want.</p></> : <div className="flex flex-wrap gap-3"><button className={primary} onClick={() => s.phase === "running" ? send({ type: "pause", now: Date.now() }) : start()}>{s.phase === "running" ? "Pause" : "Resume"}</button><button className={button} onClick={() => send({ type: "end", now: Date.now() })}>Finish early</button><button className={button} aria-expanded={stuck} onClick={() => { send({ type: "pause", now: Date.now() }); setStuck(!stuck); }}>I’m stuck</button></div>}
        {stuck && s.phase !== "ended" && <section className="mt-6 border-y border-line py-5"><h3 className="font-display text-xl">Make room to begin again.</h3><label className="mt-3 block text-sm">Make this action smaller<input className={input} maxLength={240} value={s.actions[s.current]} onChange={e => send({ type: "edit", patch: { actions: s.actions.map((a, i) => i === s.current ? e.target.value : a) } })} /></label><p className="my-3 text-sm">Try just opening the page or picking up one item.</p><div className="flex flex-wrap gap-2"><button className={button} onClick={leave}>Take a break</button><button className={button} onClick={() => setNotice("You can ask someone you trust to read the step with you or sit nearby. You choose when to continue.")}>Ask someone</button></div><p role="status" className="mt-3 text-sm">{notice}</p></section>}
        {working && savedNotice}{working && notes}
      </div>
    </dialog>
  </div>;
}
