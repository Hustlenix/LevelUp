"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchHit } from "@/lib/search";
import { useOSStore } from "@/lib/os/store";
import { usePortfolioStore } from "@/lib/portfolio";

function statusLabel(value: string) {
  return value.replaceAll("-", " ");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const osState = useOSStore();
  const portfolio = usePortfolioStore();
  const localHits = useMemo<SearchHit[]>(() => [
    ...Object.values(osState.goals).map((goal) => ({ id: `goal:${goal.id}`, type: "Goal", title: goal.title, sub: goal.nextAction, teaser: goal.why, url: "/goals/" })),
    ...Object.values(osState.roadmaps).map((roadmap) => ({ id: `roadmap:${roadmap.id}`, type: "Roadmap", title: roadmap.title, sub: `Phase ${roadmap.phase}`, teaser: "Your editable local roadmap.", url: "/roadmap/" })),
    ...Object.values(osState.milestones).map((milestone) => ({ id: `milestone:${milestone.id}`, type: "Milestone", title: milestone.title, sub: "Local milestone", teaser: milestone.description ?? "A checkpoint on an active roadmap.", url: "/goals/" })),
    ...Object.values(osState.tasks).map((task) => ({ id: `task:${task.id}`, type: "Task", title: task.title, sub: statusLabel(task.status), teaser: task.description ?? "A local executable task.", url: "/focus/" })),
    ...portfolio.map((artifact) => ({ id: `portfolio:${artifact.id}`, type: "Portfolio", title: artifact.title, sub: artifact.kind, teaser: artifact.description, url: "/portfolio/" })),
  ], [osState, portfolio]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        if (!cancelled) setResults(null);
        return;
      }
      try {
        const { getSearchEngine, serializeHit } = await import("@/lib/search");
        const engine = await getSearchEngine();
        const normalized = query.toLowerCase();
        const personalHits = localHits.filter((hit) => `${hit.title} ${hit.sub} ${hit.teaser}`.toLowerCase().includes(normalized));
        const hits = [...personalHits, ...engine.search(query).slice(0, 30).map(serializeHit)].slice(0, 40);
        if (!cancelled) setResults(hits);
      } catch {
        if (!cancelled) setError("Search index failed to load.");
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, localHits]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Search</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Search the manual</h1>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try “identity”, “dopamine”, “protocol 2.9”, “Crum”…"
        className="mt-6 w-full rounded-xl border border-line bg-card px-5 py-4 text-lg text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-gold"
      />

      <div className="mt-6 space-y-3">
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {query.trim().length >= 2 && results !== null && results.length === 0 && (
          <p className="text-sm text-ink-faint">No matches for “{query}”.</p>
        )}
        {results?.map((r) => (
          <Link
            key={r.id}
            href={r.url}
            className="block rounded-xl border border-line bg-card p-4 transition-colors hover:border-gold"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-display font-semibold text-ink">{r.title}</span>
              <span className="ml-auto shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                {r.type}
              </span>
            </div>
            {r.sub ? <div className="mt-0.5 text-xs text-ink-soft">{r.sub}</div> : null}
            <div className="mt-1 line-clamp-2 text-sm text-ink-faint">{r.teaser}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
