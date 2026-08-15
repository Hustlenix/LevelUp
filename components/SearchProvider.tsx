"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/search";

interface SearchCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<SearchCtx>({ open: false, setOpen: () => {} });

export function useSearch() {
  return useContext(Ctx);
}

export default function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onNav = () => setOpen(false);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      {children}
      {open ? <SearchModal go={go} close={() => setOpen(false)} /> : null}
    </Ctx.Provider>
  );
}

function SearchModal({ go, close }: { go: (url: string) => void; close: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { getSearchEngine, serializeHit } = await import("@/lib/search");
        const engine = await getSearchEngine();
        if (cancelled) return;
        setReady(true);
        if (query.trim().length >= 2) {
          const hits = engine.search(query).slice(0, 12).map(serializeHit);
          if (!cancelled) setResults(hits);
        } else {
          if (!cancelled) setResults([]);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    };
    const t = setTimeout(load, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      go(results[active].url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 no-print" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={close} />
      <div className="absolute left-1/2 top-[12vh] w-[min(640px,92vw)] -translate-x-1/2 rounded-xl border border-line bg-paper shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="font-display text-gold">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search chapters, claims, protocols, terms, quotes…"
            className="w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded border border-line bg-paper-deep px-2 py-0.5 font-body text-xs text-ink-faint">
            Esc
          </kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin p-2">
          {!ready ? (
            <p className="px-4 py-6 text-sm text-ink-faint">Loading index…</p>
          ) : query.trim().length < 2 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">
              Type at least two characters. Try “identity”, “dopamine”, “protocol 2.9”.
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-faint">No matches for “{query}”.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.url)}
                className={`block w-full rounded-lg px-4 py-3 text-left ${i === active ? "bg-paper-deep" : ""}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm font-semibold text-ink">{r.title}</span>
                  <span className="ml-auto shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                    {r.type}
                  </span>
                </div>
                {r.sub ? <div className="mt-0.5 text-xs text-ink-soft">{r.sub}</div> : null}
                <div className="mt-1 line-clamp-2 text-sm text-ink-faint">{r.teaser}</div>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-line px-5 py-2.5 text-[11px] text-ink-faint">
          ↑↓ navigate · Enter open · ⌘K toggle
        </div>
      </div>
    </div>
  );
}