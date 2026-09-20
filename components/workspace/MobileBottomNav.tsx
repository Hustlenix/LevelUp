"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/today/", label: "Today", icon: "✦" },
  { href: "/chapters/", label: "Learn", icon: "▤" },
  { href: "/goals/", label: "Goals", icon: "◎" },
  { href: "/progress/", label: "Progress", icon: "↗" },
] as const;

function active(pathname: string, href: string) {
  return href === "/today/" ? pathname === "/today/" || pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden no-print">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {ITEMS.map((item) => {
          const isActive = active(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center rounded-lg px-2 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${isActive ? "bg-gold/10 text-gold-deep" : "text-ink-faint hover:bg-paper-deep hover:text-gold"}`}><span aria-hidden="true" className="text-base leading-none">{item.icon}</span><span className="mt-1">{item.label}</span></Link>;
        })}
      </div>
    </nav>
  );
}
