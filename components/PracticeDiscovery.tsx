"use client";
import { useState } from "react";
import { discoverPractices, PRACTICE_FIT, PRACTICE_NEEDS, type PracticeNeed } from "@/lib/practiceDiscovery";
import { usePracticeDrafts } from "@/lib/practiceDraftsStore";

export default function PracticeDiscovery({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [need, setNeed] = useState<PracticeNeed>("all");
  const [maxSetup, setMaxSetup] = useState(15);
  const [expanded, setExpanded] = useState(false);
  const drafts = usePracticeDrafts();
  const matches = discoverPractices(query, need, maxSetup);
  const results = expanded ? matches : matches.slice(0, 6);
  return <div className="my-6">
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-medium">Find a practice<input type="search" className="mt-2 block min-h-12 w-full rounded-md border border-line bg-paper px-3" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try focus, feedback, or a missed session" /></label><label className="text-sm font-medium">Time to set up<select className="mt-2 block min-h-12 w-full rounded-md border border-line bg-paper px-3" value={maxSetup} onChange={e => setMaxSetup(Number(e.target.value))}><option value={15}>Any setup time</option><option value={5}>5 minutes or less</option><option value={2}>2 minutes or less</option></select></label></div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by need">{PRACTICE_NEEDS.map(item => <button key={item.id} aria-pressed={need === item.id} className={`min-h-11 rounded-md border px-3 text-sm ${need === item.id ? "border-ink bg-ink text-paper" : "border-line bg-paper"}`} onClick={() => setNeed(item.id)}>{item.label}</button>)}</div>
    <p role="status" className="my-4 text-xs text-ink-soft">{matches.length} {matches.length === 1 ? "plan" : "plans"} match{results.length < matches.length ? ` · showing ${results.length}` : ""}. Setup time is separate from the practice duration.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.map(plan => <article key={plan.id} className={`flex flex-col rounded-md border bg-paper p-5 ${selected === plan.id ? "border-gold" : "border-line"}`}><p className="text-xs text-gold">{PRACTICE_FIT[plan.id].setup} min setup · {plan.duration}</p><h3 className="mt-2 font-display text-xl">{plan.title}</h3><p className="my-3 flex-1 text-sm leading-relaxed text-ink-soft">{plan.purpose}</p><button aria-pressed={selected === plan.id} className="min-h-11 border-t border-line pt-3 text-left text-sm font-semibold text-gold" onClick={() => onSelect(plan.id)}>{drafts.state.entries[`${plan.id}:library`] ? "Continue draft" : selected === plan.id ? "Open selected plan" : "Open plan"}<span className="sr-only">: {plan.title}</span> →</button></article>)}</div>
    {matches.length > 6 && <button className="mt-3 min-h-11 rounded-md border border-line px-4 text-sm font-semibold" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer plans" : `Show all ${matches.length} plans`}</button>}
    {!results.length && <div className="border border-dashed border-line p-6"><p>No plans match those filters. Try a broader search.</p><button className="mt-3 min-h-11 text-sm font-semibold text-gold underline" onClick={() => { setQuery(""); setNeed("all"); setMaxSetup(15); }}>Clear filters</button></div>}
  </div>;
}
