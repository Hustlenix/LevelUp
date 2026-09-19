"use client";

import Link from "next/link";
import { RoadmapTree } from "@/components/LevelUpOSWorkspace";
import { useOSStore } from "@/lib/os/store";

export default function PersonalRoadmaps() {
  const state = useOSStore();
  return <section className="mt-14 border-t border-line pt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">My active roadmaps</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">The route you are building</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">This is your editable local plan. Rename roadmaps and milestones, add tasks, and schedule sessions without changing the original 90-day manual below.</p></div><Link href="/goals/" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Manage goals</Link></div><div className="mt-6"><RoadmapTree state={state} /></div><Link href="/today/" className="mt-4 inline-flex text-sm font-semibold text-gold hover:underline">Open Today →</Link></section>;
}
