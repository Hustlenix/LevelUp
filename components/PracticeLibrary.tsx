"use client";

import { useState } from "react";
import { PRACTICE_PLANS, getPracticePlan } from "@/lib/practicePlans";
import PracticeRunner from "@/components/PracticeRunner";

export default function PracticeLibrary() {
  const [selected, setSelected] = useState("pomodoro");
  return (
    <section id="ready-plans" aria-labelledby="ready-plans-heading" className="mb-12 scroll-mt-28 rounded-2xl border border-line bg-card p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">Start smaller</p>
      <h2 id="ready-plans-heading" className="mt-2 font-display text-3xl font-semibold">Ready-to-use practice plans</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{PRACTICE_PLANS.length} optional ways to turn a lesson into an attempt. Choose one, adapt the example and record what happened. These are starting templates, not guarantees or extra obligations.</p>
      <label htmlFor="practice-plan-picker" className="mt-6 block text-sm font-semibold">What would help right now?</label>
      <select id="practice-plan-picker" value={selected} onChange={(event) => {
        if (window.confirm("Switch plans? Unsaved notes, checks and the running timer will reset. Saved records stay on this device.")) setSelected(event.target.value);
      }} className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-line bg-paper p-3 text-sm sm:max-w-md">
        {PRACTICE_PLANS.map((plan) => <option value={plan.id} key={plan.id}>{plan.title} · {plan.duration}</option>)}
      </select>
      <div className="mt-6 border-t border-line pt-6"><PracticeRunner key={selected} plan={getPracticePlan(selected)} /></div>
    </section>
  );
}
