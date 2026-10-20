"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { SaveAction } from "@/components/SavedActions";

const steps = [
  { title: "Read one idea", copy: "A lesson gives you the idea, the evidence, and a practical first step. You can read in short sections and increase the text size anytime.", action: "Try the sample lesson", result: "Sample: make the next action obvious. Put the thing you need where you will see it." },
  { title: "Keep one next action", copy: "Save a useful step from a lesson or practice plan. It waits in Today and Small Steps until you choose it.", action: "Save a demo action", result: "Demo action saved: open your notes and write one heading." },
  { title: "Try a small block", copy: "Small Steps can hold just one action and a two minute timer. Pause, shrink the task, or leave a return note whenever you need.", action: "Try a demo block", result: "Demo block paused. Return note: start with the heading. No real focus time has been recorded." },
  { title: "Meet Milo", copy: "Milo keeps you company as you read and work. The Talk tab helps you find a next move. Cloud AI is optional and explains what gets sent.", action: "See a demo reply", result: "Milo: Open the notes. Write only the heading. You can decide what comes next after that." },
];
function readSeen() { try { return !!localStorage.getItem("levelup-tour-seen"); } catch { return false; } }
function subscribeSeen(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("levelup-tour", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("levelup-tour", callback); }; }
export default function WelcomeTour() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => true);
  const [dismissed, setDismissed] = useState(false);
  const offer = !seen && !dismissed;
  function close() { dialog.current?.close(); opener.current?.focus(); setDismissed(true); try { localStorage.setItem("levelup-tour-seen", "1"); window.dispatchEvent(new Event("levelup-tour")); } catch {} }
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper-deep px-5 py-2 text-sm no-print">
      <span className="text-ink-soft">{offer ? "New here? Try a one minute walkthrough." : "Learn → choose one action → try a block."}</span>
      <button ref={opener} type="button" className="min-h-11 font-semibold text-gold" onClick={() => { setStep(0); setTried(false); dialog.current?.showModal(); }}>Quick tour</button>
    </div>
    <dialog ref={dialog} onCancel={close} className="m-auto max-h-[90dvh] w-[min(36rem,calc(100%-2rem))] overflow-auto rounded-2xl border border-line bg-card p-6 text-ink backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-4"><p className="text-xs uppercase tracking-wider text-gold">Demo · {Math.min(step + 1, 4)} of 4</p><button type="button" onClick={close} className="min-h-11 px-2 underline">Skip / close</button></div>
      {step < 4 ? <><h2 className="mt-4 font-display text-3xl">{steps[step].title}</h2><p className="mt-4 leading-relaxed text-ink-soft">{steps[step].copy}</p><button type="button" onClick={() => setTried(true)} className="mt-6 min-h-11 rounded-lg border border-gold px-4 py-2">{steps[step].action}</button><p aria-live="polite" className="my-4 min-h-16 rounded-lg bg-paper-deep p-4">{tried ? steps[step].result : "This is a sandbox. Your real progress stays untouched."}</p><div className="flex justify-between gap-3"><button disabled={step === 0} type="button" onClick={() => { setStep(step - 1); setTried(false); }} className="min-h-11 px-3 disabled:opacity-30">Back</button><button type="button" onClick={() => { setStep(step + 1); setTried(false); }} className="min-h-11 rounded-lg bg-ink px-4 text-paper">{step === 3 ? "Finish tour" : "Next"}</button></div></> : <><h2 className="mt-4 font-display text-3xl">Your first real step</h2><p className="mt-4 text-ink-soft">The demo is complete. Nothing was added to your progress. If you want, save this real action to your list:</p><SaveAction task="Open my notes and write one heading" action="Open my notes and write one heading" minutes={2} source="" /><Link href="/small-steps/" onClick={close} className="mt-4 inline-flex min-h-11 items-center text-gold underline">Choose my own action in Small Steps</Link><button type="button" className="mt-4 block min-h-11 underline" onClick={close}>Done for now</button></>}
    </dialog>
  </>;
}
