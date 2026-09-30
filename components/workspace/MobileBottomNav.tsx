"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACE_LINKS } from "@/lib/navigation";

const ITEMS = WORKSPACE_LINKS;

function active(pathname: string, href: string) {
  return href === "/today/" ? ["/today", "/today/", "/dashboard", "/dashboard/"].includes(pathname) : pathname === href.replace(/\/$/, "") || pathname.startsWith(href);
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  if (pathname === "/") return null;
  return (
    <nav aria-label="Primary mobile navigation" className="interface-font fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_24px_rgb(34_29_22/0.04)] backdrop-blur md:hidden no-print">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const isActive = active(pathname, item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-2 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${isActive ? "bg-gold/10 text-gold" : "text-ink-faint hover:bg-paper-deep hover:text-gold"}`}><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={isActive ? 2 : 1.6} /><span className="mt-1.5">{item.label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
