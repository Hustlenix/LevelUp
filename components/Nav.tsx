"use client";

import Link from "next/link";
import { useSearch } from "@/components/SearchProvider";

export default function Nav() {
  const { setOpen } = useSearch();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur no-print">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
        <Link href="/" className="flex items-baseline gap-2 font-display">
          <span className="text-lg font-bold tracking-tight text-ink">The Level Up Manual</span>
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-gold sm:inline">
            vol. i — 28 lessons
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-5 text-sm text-ink-soft md:flex">
          <Link className="transition-colors hover:text-gold" href="/chapters/">
            Chapters
          </Link>
          <Link className="transition-colors hover:text-gold" href="/audit/">
            Verification
          </Link>
          <Link className="transition-colors hover:text-gold" href="/protocols/">
            Protocols
          </Link>
          <Link className="transition-colors hover:text-gold" href="/glossary/">
            Glossary
          </Link>
          <Link className="transition-colors hover:text-gold" href="/quotes/">
            Quotes
          </Link>
          <Link className="transition-colors hover:text-gold" href="/progress/">
            Progress
          </Link>
        </nav>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex items-center gap-2 rounded-full border border-line bg-paper-deep px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold md:ml-0"
          aria-label="Search (⌘K)"
        >
          <span className="text-gold">⌕</span>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-line bg-paper px-1.5 text-[10px] text-ink-faint lg:inline">⌘K</kbd>
        </button>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-line px-5 py-2 text-xs text-ink-soft scrollbar-thin md:hidden">
        <Link className="shrink-0 hover:text-gold" href="/chapters/">Chapters</Link>
        <Link className="shrink-0 hover:text-gold" href="/audit/">Verification</Link>
        <Link className="shrink-0 hover:text-gold" href="/protocols/">Protocols</Link>
        <Link className="shrink-0 hover:text-gold" href="/glossary/">Glossary</Link>
        <Link className="shrink-0 hover:text-gold" href="/quotes/">Quotes</Link>
        <Link className="shrink-0 hover:text-gold" href="/progress/">Progress</Link>
      </nav>
    </header>
  );
}