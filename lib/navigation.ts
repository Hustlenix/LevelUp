import { BookOpen, Compass, Sun, Timer, TrendingUp, Sparkles } from "lucide-react";

export const WORKSPACE_LINKS = [
  { href: "/today/", label: "Today", icon: Sun },
  { href: "/chapters/", label: "Learn", icon: BookOpen },
  { href: "/protocols/", label: "Practice", icon: Timer },
  { href: "/journey/", label: "Journey", icon: Compass },
  { href: "/progress/", label: "Progress", icon: TrendingUp },
] as const;
export const COACH_LINK = { href: "/coach/", label: "Coach", icon: Sparkles };
export const RESOURCE_GROUPS = [
  { label: "Planning & reflection", items: [
    { href: "/small-steps/", label: "Small Steps" },
    { href: "/goals/", label: "Goals" }, { href: "/focus/", label: "Focus" },
    { href: "/review/", label: "Review" }, { href: "/roadmap/", label: "Roadmap" },
    { href: "/playbook/", label: "Playbook" }, { href: "/portfolio/", label: "Portfolio" },
    { href: "/experiments/", label: "Experiments" },
  ] },
  { label: "Library & evidence", items: [
    { href: "/study/", label: "Study Mode" }, { href: "/audit/", label: "Evidence" },
    { href: "/research/", label: "Research" }, { href: "/glossary/", label: "Glossary" },
    { href: "/quotes/", label: "Quotes" },
  ] },
] as const;
export const ACCOUNT_LINKS = [
  { href: "/profile/", label: "Profile" }, { href: "/settings/", label: "Settings" },
  { href: "/backup/", label: "Backup" }, { href: "/privacy/", label: "Privacy" },
] as const;
export function isNavActive(pathname: string, href: string) {
  if (href === "/today/") return ["/today", "/today/", "/dashboard", "/dashboard/"].includes(pathname);
  return pathname === href.replace(/\/$/, "") || pathname.startsWith(href);
}
