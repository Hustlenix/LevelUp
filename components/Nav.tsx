"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useSearch } from "@/components/SearchProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ContinueReading from "@/components/ContinueReading";
import ChaptersMenu from "@/components/ChaptersMenu";
import type { Chapter } from "@/lib/types";

const PRIMARY_ITEMS = [
  { href: "/today/", label: "Today" },
  { href: "/chapters/", label: "Learn" },
  { href: "/goals/", label: "Goals" },
  { href: "/progress/", label: "Progress" },
] as const;

const MORE_ITEMS = [
  { href: "/focus/", label: "Focus" },
  { href: "/review/", label: "Review" },
  { href: "/roadmap/", label: "Roadmap" },
  { href: "/playbook/", label: "Playbook" },
  { href: "/portfolio/", label: "Portfolio" },
  { href: "/experiments/", label: "Experiments" },
  { href: "/protocols/", label: "Protocols" },
  { href: "/audit/", label: "Evidence" },
  { href: "/research/", label: "Research" },
  { href: "/settings/", label: "Settings" },
  { href: "/privacy/", label: "Privacy" },
  { href: "/backup/", label: "Backup" },
  { href: "/study/", label: "Study Mode" },
  { href: "/glossary/", label: "Glossary" },
  { href: "/quotes/", label: "Quotes" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/today/") return ["/today", "/today/", "/dashboard", "/dashboard/"].includes(pathname);
  return pathname === href.replace(/\/$/, "") || pathname.startsWith(href);
}

const linkClass = (active: boolean) => `inline-flex min-h-11 items-center gap-2 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${active ? "bg-gold/10 text-gold" : "text-ink-soft hover:bg-paper-deep hover:text-gold"}`;

export default function Nav({ chapters }: { chapters: Chapter[] }) {
  const { setOpen } = useSearch();
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreDesktopRef = useRef<HTMLDivElement>(null);
  const moreMobileRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null);

  function toggleMore(event: React.MouseEvent<HTMLButtonElement>) {
    moreTriggerRef.current = event.currentTarget;
    setMoreOpen((open) => !open);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!moreDesktopRef.current?.contains(target) && !moreMobileRef.current?.contains(target)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreTriggerRef.current?.focus();
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        const container = moreTriggerRef.current?.parentElement;
        const items = Array.from(container?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        if (!items.length || !container?.contains(document.activeElement)) return;
        event.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  return (
    <header className="interface-font sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur no-print">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-5">
        <Link href="/" className="flex min-w-0 shrink-0 items-baseline gap-2 font-display focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <span className="text-lg font-bold tracking-tight text-ink">Level Up <span className="text-gold">LifeOS</span></span>
          <span className="interface-font ml-3 hidden border-l border-line pl-5 text-[10px] uppercase tracking-[0.18em] text-ink-faint lg:inline">Learn. Practice. Grow.</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" aria-label="Search">
            <Search aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded border border-line bg-paper px-1.5 text-[10px] text-ink-faint lg:inline">Ctrl K</kbd>
          </button>
          <ContinueReading />
          <ThemeToggle />
        </div>
      </div>

      <nav aria-label="Primary navigation" className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-visible px-4 py-2 sm:px-5">
          <div className="mr-2 shrink-0"><ChaptersMenu chapters={chapters} /></div>
          {PRIMARY_ITEMS.map((item) => <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={linkClass(isActive(pathname, item.href))}>{item.label}</Link>)}
          <div ref={moreDesktopRef} className="relative ml-auto shrink-0">
            <button type="button" onClick={toggleMore} aria-expanded={moreOpen} aria-controls="more-menu" aria-haspopup="menu" className={linkClass(moreOpen)}>
              More <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen ? <div id="more-menu" role="menu" aria-label="More tools" className="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100dvh-10rem)] w-[24rem] grid-cols-2 gap-1 overflow-y-auto overscroll-contain rounded-xl border border-line bg-card p-3 shadow-xl">
              <button type="button" role="menuitem" onClick={() => { setOpen(true); setMoreOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Search</button>
              {MORE_ITEMS.map((item) => <Link key={item.href} role="menuitem" href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} onClick={() => setMoreOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{item.label}</Link>)}
            </div> : null}
          </div>
        </div>
      </nav>
      <div className="border-t border-line px-4 py-2 md:hidden">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
          <ChaptersMenu chapters={chapters} mobile />
          <span className="truncate text-ink-faint">{pathname === "/" ? "Start with Today" : "Local workspace"}</span>
          <div ref={moreMobileRef} className="relative shrink-0">
            <button type="button" onClick={toggleMore} aria-expanded={moreOpen} aria-controls="more-menu-mobile" aria-haspopup="menu" className={`${linkClass(moreOpen)} px-2 text-xs`}>More <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /></button>
            {moreOpen ? <div id="more-menu-mobile" role="menu" aria-label="More tools" className="absolute right-0 top-full z-50 mt-2 grid max-h-[calc(100dvh-14rem)] w-[min(22rem,calc(100vw-2rem))] grid-cols-2 gap-1 overflow-y-auto overscroll-contain rounded-xl border border-line bg-card p-3 shadow-xl">
              <button type="button" role="menuitem" onClick={() => { setOpen(true); setMoreOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft hover:bg-paper-deep hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Search</button>
              {MORE_ITEMS.map((item) => <Link key={item.href} role="menuitem" href={item.href} onClick={() => setMoreOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper-deep hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{item.label}</Link>)}
            </div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
