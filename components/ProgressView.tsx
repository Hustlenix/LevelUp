"use client";

import Link from "next/link";
import type { Chapter } from "@/lib/types";
import { markComplete, overallStats, resetProgress, useProgressStore } from "@/lib/progress";
import { PillarTag } from "@/components/ui";

export default function ProgressView({ chapters }: { chapters: Chapter[] }) {
  const map = useProgressStore();
  const stats = overallStats(map, chapters.length);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Progress</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
        Your reading, in one place
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Stored locally in your browser — nothing leaves this device. Chapters mark
        themselves complete at 90% scroll; adjust anything below.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-5xl font-bold text-ink">{stats.pct}%</span>
          <span className="text-sm text-ink-faint">
            {stats.done} of {chapters.length} chapters complete
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <div className="mt-8 space-y-2">
        {chapters.map((c) => {
          const entry = map[c.slug];
          const complete = entry?.complete ?? false;
          return (
            <div
              key={c.slug}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                complete ? "border-emerald-500/40 bg-emerald-500/10" : "border-line bg-card"
              }`}
            >
              <span className="w-8 shrink-0 text-right font-display text-sm font-bold text-ink-faint">
                {c.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/chapters/${c.slug}/`}
                    className="font-display font-semibold text-ink underline-offset-2 hover:text-gold hover:underline"
                  >
                    {c.title}
                  </Link>
                  <PillarTag pillar={c.pillar} />
                </div>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-emerald-600" : "bg-gold"}`}
                    style={{ width: `${entry?.maxScroll ?? 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => markComplete(c.slug, !complete)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  complete
                    ? "border-emerald-500/60 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-line bg-paper text-ink-soft hover:border-gold hover:text-gold"
                }`}
              >
                {complete ? "✓ Read" : "Mark read"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => resetProgress()}
          className="text-sm text-ink-faint underline-offset-2 hover:text-rose-700 hover:underline"
        >
          Reset all progress
        </button>
      </div>
    </div>
  );
}