"use client";

import { useRef, useState } from "react";
import { PRACTICE_PLANS, getPracticePlan } from "@/lib/practicePlans";
import PracticeRunner from "@/components/PracticeRunner";
import PracticeDiscovery from "@/components/PracticeDiscovery";

export default function PracticeLibrary() {
  const [selected, setSelected] = useState("pomodoro");
  const runner = useRef<HTMLDivElement>(null);
  function choose(id: string) {
    if (id !== selected && selected === "pomodoro" && !window.confirm("Switch plans? Any running timer resets. Written drafts and checks are saved.")) return;
    setSelected(id);
    runner.current?.focus({ preventScroll: true });
    runner.current?.scrollIntoView({ block: "start" });
  }
  return (
    <section id="ready-plans" aria-labelledby="ready-plans-heading" className="mb-12 scroll-mt-28 rounded-2xl border border-line bg-card p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">Start smaller</p>
      <h2 id="ready-plans-heading" className="mt-2 font-display text-3xl font-semibold">Ready-to-use practice plans</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{PRACTICE_PLANS.length} optional ways to turn a lesson into an attempt. Choose one, adapt the example and record what happened. These are starting templates, not guarantees or extra obligations.</p>
      <label htmlFor="practice-plan-picker" className="mt-6 block text-sm font-semibold">What would help right now?</label>
      <PracticeDiscovery selected={selected} onSelect={choose} />
      <select id="practice-plan-picker" value={selected} onChange={(event) => {
        choose(event.target.value);
      }} className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-line bg-paper p-3 text-sm sm:max-w-md">
        {PRACTICE_PLANS.map((plan) => <option value={plan.id} key={plan.id}>{plan.title} · {plan.duration}</option>)}
      </select>
      <div ref={runner} tabIndex={-1} aria-label="Selected practice" className="mt-6 scroll-mt-28 border-t border-line pt-6 focus-visible:outline-2 focus-visible:outline-gold"><PracticeRunner key={selected} plan={getPracticePlan(selected)} /></div>
    </section>
  );
}
