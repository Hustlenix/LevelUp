"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SearchHit } from "@/lib/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const hits = engine.search(query).slice(0, 30).map(serializeHit);
        if (!cancelled) setResults(hits);
      } catch {
        if (!cancelled) setError("Search index failed to load.");
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

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