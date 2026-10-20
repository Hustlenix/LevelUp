"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useSearch } from "@/components/SearchProvider";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/components/Brand";
import TextSizeControl from "@/components/TextSizeControl";
import { WORKSPACE_LINKS, COACH_LINK, RESOURCE_GROUPS, ACCOUNT_LINKS, isNavActive } from "@/lib/navigation";

export default function Nav() {
  const { setOpen } = useSearch();
  const pathname = usePathname() ?? "";
  const home = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = [...WORKSPACE_LINKS, COACH_LINK, ...RESOURCE_GROUPS.flatMap(g => [...g.items]), ...ACCOUNT_LINKS].find(item => isNavActive(pathname, item.href));
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setMenuOpen(false); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", keyboard); };
  }, [menuOpen]);
  return <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-xl no-print">
    <div className={`mx-auto flex min-h-20 flex-wrap items-center gap-3 px-5 py-2 sm:px-8 ${home ? "max-w-7xl" : "max-w-6xl"}`}>
      <div className={home ? "" : "md:hidden"}><Brand /></div>
      {!home && <div className="hidden items-center gap-3 text-sm md:flex"><span className="text-ink-faint">Workspace</span><span className="text-line">/</span><span className="font-medium text-ink">{current?.label ?? "LevelUp"}</span></div>}
      {home && <nav aria-label="Website navigation" className="ml-12 hidden items-center gap-7 text-sm font-medium text-ink-soft lg:flex"><Link href="/chapters/" className="hover:text-gold">Learn</Link><Link href="/protocols/" className="hover:text-gold">Practice</Link><Link href="/#how-it-works" className="hover:text-gold">How it works</Link><Link href="/audit/" className="hover:text-gold">The evidence</Link></nav>}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="flex h-11 min-w-11 items-center justify-center gap-3 rounded-lg px-2 text-ink-faint hover:bg-paper-deep"><Search size={18} /><span className="hidden text-xs xl:inline">Search anything</span><kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.625rem] xl:inline">Ctrl K</kbd></button>
        <div className="hidden sm:block"><TextSizeControl /></div>
        <div className="hidden sm:block"><ThemeToggle /></div>
        {home && <Link href="/today/" className="ml-2 hidden min-h-11 items-center gap-3 rounded-lg bg-ink px-4 text-sm font-semibold text-paper sm:inline-flex">Open workspace <ArrowUpRight size={16} /></Link>}
        <div ref={root} className={home ? "relative lg:hidden" : "relative md:hidden"}>
          <button ref={trigger} type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper-deep">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          {menuOpen && <nav id="site-navigation" aria-label="All navigation" className="absolute right-0 top-full mt-4 max-h-[calc(100dvh-12rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-card p-4 shadow-pop">
            <div className="grid grid-cols-2 gap-1">{[...WORKSPACE_LINKS, COACH_LINK].map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={isNavActive(pathname, item.href) ? "page" : undefined} className="sidebar-link"><item.icon size={17} />{item.label}</Link>)}</div>
            {[...RESOURCE_GROUPS, { label: "Your space", items: ACCOUNT_LINKS }].map(group => <div key={group.label} className="mt-4 border-t border-line pt-4"><p className="mb-2 px-3 text-xs font-semibold text-ink-faint">{group.label}</p><div className="grid grid-cols-2 gap-1">{group.items.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="sidebar-link text-xs">{item.label}</Link>)}</div></div>)}
            <div className="mt-3 sm:hidden"><TextSizeControl /></div><div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-faint">Appearance<ThemeToggle /></div>
          </nav>}
        </div>
      </div>
    </div>
  </header>;
}
