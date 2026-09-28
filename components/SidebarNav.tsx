"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Compass, Sparkles, User, TrendingUp, type LucideIcon } from "lucide-react";

const GROUPS: { label: string; items: { href: string; label: string; icon?: LucideIcon }[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/today/", label: "Today", icon: Sun },
      { href: "/journey/", label: "Journey", icon: Compass },
      { href: "/coach/", label: "Coach", icon: Sparkles },
      { href: "/profile/", label: "Profile", icon: User },
      { href: "/progress/", label: "Progress", icon: TrendingUp },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/chapters/", label: "Learn" },
      { href: "/study/", label: "Study Mode" },
      { href: "/review/", label: "Review" },
      { href: "/focus/", label: "Focus" },
      { href: "/goals/", label: "Goals" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/roadmap/", label: "Roadmap" },
      { href: "/playbook/", label: "Playbook" },
      { href: "/portfolio/", label: "Portfolio" },
      { href: "/experiments/", label: "Experiments" },
      { href: "/protocols/", label: "Protocols" },
      { href: "/audit/", label: "Evidence" },
      { href: "/research/", label: "Research" },
      { href: "/glossary/", label: "Glossary" },
      { href: "/quotes/", label: "Quotes" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings/", label: "Settings" },
      { href: "/backup/", label: "Backup" },
      { href: "/privacy/", label: "Privacy" },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/today/") return ["/today", "/today/", "/dashboard", "/dashboard/"].includes(pathname);
  return pathname === href.replace(/\/$/, "") || pathname.startsWith(href);
}

function itemClass(active: boolean) {
  return `flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
    active ? "bg-gold/10 text-gold" : "text-ink-soft hover:bg-paper-deep hover:text-gold"
  }`;
}

export default function SidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="interface-font sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-paper px-3 py-4 no-print md:flex">
      <Link href="/" className="flex items-baseline gap-2 px-2 pb-4 font-display focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        <span className="text-lg font-bold tracking-tight text-ink">
          Level Up <span className="text-gold">LifeOS</span>
        </span>
      </Link>

      <nav aria-label="Sidebar navigation" className="flex-1">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={itemClass(active)}
                    >
                      {Icon ? (
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.6} />
                      ) : null}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="border-t border-line px-2 pt-4 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Local-first · private
      </p>
    </aside>
  );
}