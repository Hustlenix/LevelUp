"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "@/components/SearchProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ContinueReading from "@/components/ContinueReading";
import ChaptersMenu from "@/components/ChaptersMenu";
import type { Chapter } from "@/lib/types";

const MORE_ITEMS = [
  { href: "/audit/", label: "Verification" },
  { href: "/glossary/", label: "Glossary" },
  { href: "/quotes/", label: "Quotes" },
  { href: "/progress/", label: "Progress" },
] as const;

export default function Nav({ chapters }: { chapters: Chapter[] }) {
  const { setOpen } = useSearch();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreDesktopRef = useRef<HTMLDivElement>(null);
  const moreMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        !moreDesktopRef.current?.contains(target) &&
        !moreMobileRef.current?.contains(target)
      ) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const morePanelLink =
    "block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-gold";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur no-print">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2 whitespace-nowrap font-display"
        >
          <span className="text-lg font-bold tracking-tight text-ink">
            Level Up <span className="text-gold">LifeOS</span>
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.2em] text-ink-faint sm:inline md:hidden lg:inline">
            Evidence-Audited Operating System
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-line bg-paper-deep px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold"
          aria-label="Search (⌘K)"
        >
          <span className="text-gold">⌕</span>
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-line bg-paper px-1.5 text-[10px] text-ink-faint lg:inline">⌘K</kbd>
        </button>
        <ContinueReading />
        <ThemeToggle />
      </div>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-5 overflow-x-auto border-t border-line px-5 py-2 text-sm text-ink-soft scrollbar-thin md:flex">
        <ChaptersMenu chapters={chapters} />
        <Link className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 py-1 font-semibold text-gold transition-colors hover:text-gold-deep" href="/action/">
          <span className="flex h-2 w-2 rounded-full bg-gold animate-pulse" />
          Daily Action
        </Link>
        <Link className="shrink-0 whitespace-nowrap py-1 transition-colors hover:text-gold" href="/protocols/">
          Protocols
        </Link>
        <Link className="shrink-0 whitespace-nowrap py-1 font-bold text-gold transition-colors hover:text-gold-deep" href="/dashboard/">
          Dashboard
        </Link>
        <div ref={moreDesktopRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1.5 py-1 text-sm text-ink-soft transition-colors hover:text-gold"
          >
            More
            <span
              aria-hidden="true"
              className={`text-[10px] transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
          {moreOpen && (
            <div id="more-menu" className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-line bg-paper p-1.5 shadow-xl">
              {MORE_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={morePanelLink}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="border-t border-line px-5 py-2 md:hidden">
        <nav className="flex items-center gap-4 overflow-x-auto text-xs text-ink-soft scrollbar-thin">
          <div className="relative shrink-0">
            <ChaptersMenu chapters={chapters} mobile />
          </div>
          <Link className="shrink-0 py-1 font-bold text-gold inline-flex items-center gap-1" href="/action/">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            Daily Action
          </Link>
          <Link className="shrink-0 py-1 hover:text-gold" href="/protocols/">Protocols</Link>
          <Link className="shrink-0 py-1 font-bold text-gold hover:text-gold-deep" href="/dashboard/">Dashboard</Link>
          <div ref={moreMobileRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 py-1 text-xs text-ink-soft transition-colors hover:text-gold"
            >
              More
              <span
                aria-hidden="true"
                className={`text-[10px] transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {moreOpen && (
              <div id="more-menu-mobile" className="absolute left-0 top-full z-50 mt-2 w-44 rounded-xl border border-line bg-paper p-1.5 shadow-xl">
                {MORE_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={morePanelLink}>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}