"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings2, UserRound, ShieldCheck } from "lucide-react";
import Brand from "@/components/Brand";
import { WORKSPACE_LINKS, COACH_LINK, RESOURCE_GROUPS, isNavActive } from "@/lib/navigation";

export default function SidebarNav() {
  const pathname = usePathname() ?? "";
  if (pathname === "/") return null;
  return <aside className="workspace-sidebar sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-card px-4 py-7 md:flex no-print">
    <div className="px-2"><Brand /></div>
    <p className="mb-3 mt-10 px-3 text-[0.6875rem] font-medium text-ink-faint">YOUR WORKSPACE</p>
    <nav aria-label="Sidebar navigation" className="min-h-0 flex-1 overflow-y-auto">
      <ul className="space-y-1">{[...WORKSPACE_LINKS, COACH_LINK].map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} aria-current={isNavActive(pathname, href) ? "page" : undefined} className="sidebar-link"><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{label}</Link></li>)}</ul>
      <div className="mt-7 border-t border-line pt-4">{RESOURCE_GROUPS.map(group => <details key={`${group.label}-${pathname}`} open={group.items.some(item => isNavActive(pathname, item.href))} className="group mb-2">
        <summary className="flex min-h-11 list-none items-center justify-between gap-2 rounded-lg px-3 text-xs font-medium text-ink-soft hover:bg-paper"><span>{group.label}</span><ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" /></summary>
        <ul className="ml-3 border-l border-line pl-2">{group.items.map(item => <li key={item.href}><Link href={item.href} aria-current={isNavActive(pathname, item.href) ? "page" : undefined} className="sidebar-link text-xs">{item.label}</Link></li>)}</ul>
      </details>)}</div>
    </nav>
    <div className="mt-4 border-t border-line pt-3">
      <Link href="/profile/" aria-current={isNavActive(pathname, "/profile/") ? "page" : undefined} className="sidebar-link"><UserRound size={17} />Your profile</Link>
      <Link href="/settings/" aria-current={isNavActive(pathname, "/settings/") ? "page" : undefined} className="sidebar-link"><Settings2 size={17} />Settings</Link>
      <Link href="/privacy/" className="mt-4 flex items-center gap-2 px-3 text-[0.6875rem] text-ink-faint"><ShieldCheck size={13} />Local-first. Yours to keep.</Link>
    </div>
  </aside>;
}
