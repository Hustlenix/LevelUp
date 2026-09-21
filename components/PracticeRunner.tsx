"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import type { PracticePlan } from "@/lib/practicePlans";
import { logProtocolExecution, useProtocolLogsStore } from "@/lib/actionTools";
import PracticeTimer from "@/components/PracticeTimer";

export default function PracticeRunner({ plan, chapterSlug }: { plan: PracticePlan; chapterSlug?: string }) {
  const uid = useId();
  const [notes, setNotes] = useState("");
  const [checked, setChecked] = useState<number[]>([]);
  const [kind, setKind] = useState("Plan prepared");
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const logId = useRef<string | undefined>(undefined);
  const logs = useProtocolLogsStore();
  const previous = logs.find((log) => log.protocolNum === `practice:${plan.id}` && (!chapterSlug || log.inputs.chapter === chapterSlug));

  function save() {
    if (!notes.trim() || saved) return;
    logId.current ??= `practice_${crypto.randomUUID()}`;
    const result = logProtocolExecution(`practice:${plan.id}`, plan.title, {
      chapter: chapterSlug ?? "practice-library", recordType: kind, notes: notes.trim(),
      checkedSteps: JSON.stringify(checked.map((index) => plan.steps[index])),
    }, seconds, logId.current);
    setSaved(result.persisted);
    setMessage(result.persisted ? `${kind} saved on this device. Reading progress has not changed.` : "Your browser could not save this record. Copy your notes before leaving, or retry saving.");
  }

  return (
    <div className="space-y-5 font-sans text-ink">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">{plan.duration} · optional practice</p>
        <h3 className="mt-2 font-display text-2xl font-semibold">{plan.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{plan.purpose}</p>
      </div>
      <fieldset disabled={saved}>
        <legend className="mb-2 text-sm font-semibold">Your steps <span className="font-normal text-ink-soft">· {checked.length}/{plan.steps.length} checked</span></legend>
        <div className="space-y-2">
          {plan.steps.map((step, index) => (
            <label key={step} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper/60 p-3 text-sm leading-relaxed">
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-gold" checked={checked.includes(index)} onChange={(event) => setChecked(event.target.checked ? [...checked, index] : checked.filter((item) => item !== index))} />
              <span>{step}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="rounded-lg border-l-2 border-gold bg-paper-deep/50 px-4 py-3 text-sm leading-relaxed"><strong>Make it smaller.</strong> {plan.smaller}</p>
      {plan.id === "pomodoro" && !saved && <PracticeTimer onTime={setSeconds} />}
      <div>
        <label htmlFor={`${uid}-notes`} className="block text-sm font-semibold">{plan.prompt}</label>
        <textarea id={`${uid}-notes`} rows={5} maxLength={5000} value={notes} disabled={saved} onChange={(event) => setNotes(event.target.value)} placeholder="Write your own plan or observation…" className="mt-2 w-full rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed disabled:opacity-70" />
        <details className="mt-2 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-gold">Show a worked template</summary>
          <p className="whitespace-pre-line rounded-lg bg-paper p-3 leading-relaxed text-ink-soft">{plan.template}</p>
          <button type="button" disabled={saved} className="mt-2 min-h-11 rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-50" onClick={() => {
            if (notes.trim() && !window.confirm("Replace your notes with the example template?")) return;
            setNotes(plan.template);
          }}>Use template, then edit</button>
        </details>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold" htmlFor={`${uid}-kind`}>What are you recording?
          <select id={`${uid}-kind`} value={kind} disabled={saved} onChange={(event) => setKind(event.target.value)} className="mt-2 block min-h-11 max-w-full rounded-lg border border-line bg-paper px-3 font-normal">
            <option>Plan prepared</option><option>Practice attempted</option><option>Review completed</option>
          </select>
        </label>
        <button type="button" disabled={!notes.trim() || saved} onClick={save} className="min-h-11 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">{saved ? "Saved on this device" : "Save practice record"}</button>
        {saved && <button type="button" className="min-h-11 rounded-lg border border-line px-4 text-sm" onClick={() => {
          setSaved(false); setNotes(""); setChecked([]); setSeconds(0); setMessage(""); logId.current = undefined;
        }}>New attempt</button>}
      </div>
      <p role="status" className="text-sm text-ink-soft">{message}</p>
      <p className="text-xs leading-relaxed text-ink-soft">Check steps as you use them; you can save an unfinished plan. Notes stay in this browser’s protocol log and are included in <Link href="/backup/" className="underline underline-offset-4">data backups</Link>. Unsaved notes clear when you leave or switch plans.</p>
      {previous && !saved && <details className="border-t border-line pt-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Last record · {previous.date}</summary>
        <p className="mt-2 text-ink-soft">{previous.inputs.recordType}</p>
        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{previous.inputs.notes}</p>
      </details>}
    </div>
  );
}
