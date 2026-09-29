"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronRight,
  CircleUserRound,
  Compass,
  Crosshair,
  Database,
  Network,
  Search,
  Settings,
  Sparkles,
  SunMedium,
} from "lucide-react";
import type { Chapter } from "@/lib/types";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import BackupJournalNotice from "@/components/BackupJournalNotice";
import { useSearch } from "@/components/SearchProvider";

const PRIMARY = [
  { href: "/today/", label: "Today", icon: SunMedium, detail: "Do what matters" },
  { href: "/journey/", label: "Journey", icon: Compass, detail: "See the path" },
  { href: "/coach/", label: "Coach", icon: BrainCircuit, detail: "Get unstuck" },
  { href: "/progress/", label: "Progress", icon: ChartNoAxesCombined, detail: "Read the evidence" },
  { href: "/profile/", label: "Profile", icon: CircleUserRound, detail: "Shape your identity" },
] as const;

const SECONDARY = [
  { href: "/focus/", label: "Focus room", icon: Crosshair },
  { href: "/chapters/", label: "Manual", icon: BookOpen },
  { href: "/settings/", label: "Settings", icon: Settings },
  { href: "/backup/", label: "Backup", icon: Database },
  { href: "/sync-lab/", label: "Nexus sync", icon: Network },
] as const;

const APP_PREFIXES = [
  "/today", "/journey", "/coach", "/progress", "/profile", "/onboarding",
  "/goals", "/focus", "/review", "/playbook", "/portfolio", "/experiments",
  "/settings", "/backup", "/sync-lab", "/study", "/action",
];

function active(pathname: string, href: string) {
  if (href === "/today/") return pathname === "/today" || pathname.startsWith("/today/") || pathname.startsWith("/onboarding");
  return pathname === href.replace(/\/$/, "") || pathname.startsWith(href);
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/journey")) return "Journey";
  if (pathname.startsWith("/coach")) return "Coach";
  if (pathname.startsWith("/progress")) return "Progress";
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings") || pathname.startsWith("/backup")) return "Profile";
  if (pathname.startsWith("/sync-lab")) return "Nexus sync lab";
  if (pathname.startsWith("/focus")) return "Focus room";
  if (pathname.startsWith("/onboarding")) return "Set your direction";
  return "Today";
}

function AppSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="app-sidebar no-print" aria-label="LevelUp app navigation">
      <Link href="/today/" className="app-brand">
        <span className="app-brand-mark" aria-hidden="true">L</span>
        <span><strong>LevelUp</strong><small>Life in progress</small></span>
      </Link>
      <nav className="app-sidebar-primary" aria-label="Primary app navigation">
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const isActive = active(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`app-nav-link ${isActive ? "is-active" : ""}`}>
              <Icon aria-hidden="true" />
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              <ChevronRight className="app-nav-chevron" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
      <div className="app-sidebar-rule" />
      <nav className="app-sidebar-secondary" aria-label="App tools">
        {SECONDARY.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className="app-tool-link"><Icon aria-hidden="true" /><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="app-sidebar-note">
        <Sparkles aria-hidden="true" />
        <p><strong>Private by default.</strong><br />Your personal progress stays on this device.</p>
      </div>
    </aside>
  );
}

function AppTopbar({ pathname }: { pathname: string }) {
  const { setOpen } = useSearch();
  return (
    <header className="app-topbar no-print">
      <div>
        <p className="app-topbar-kicker">LevelUp LifeOS</p>
        <p className="app-topbar-title">{pageTitle(pathname)}</p>
      </div>
      <div className="app-topbar-actions">
        <button type="button" onClick={() => setOpen(true)} className="app-icon-button" aria-label="Search the manual"><Search aria-hidden="true" /></button>
        <ThemeToggle />
      </div>
    </header>
  );
}

function AppBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="app-bottom-nav no-print" aria-label="Primary mobile navigation">
      {PRIMARY.map((item) => {
        const Icon = item.icon;
        const isActive = active(pathname, item.href);
        return <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={isActive ? "is-active" : ""}><Icon aria-hidden="true" /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}

export default function AppFrame({ chapters, children }: { chapters: Chapter[]; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isApp = pathname === "/" || APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isApp) {
    return <><Nav chapters={chapters} /><BackupJournalNotice /><main id="main" className="flex-1">{children}</main><Footer /></>;
  }

  return (
    <div className="app-frame">
      <AppSidebar pathname={pathname} />
      <div className="app-main-column">
        <AppTopbar pathname={pathname} />
        <BackupJournalNotice />
        <main id="main" className="app-main">{children}</main>
      </div>
      <AppBottomNav pathname={pathname} />
    </div>
  );
}
