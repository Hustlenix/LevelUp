import type { Metadata } from "next";
import { PageShell } from "@/components/ui";
import PortfolioPanel from "@/components/PortfolioPanel";
import { WorkspaceHeader } from "@/components/workspace";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "A private local portfolio of artifacts, evidence, reflections, and results tied to your LevelUp work.",
  alternates: { canonical: "/portfolio/" },
  robots: { index: false, follow: false },
};

export default function PortfolioPage() {
  return <PageShell><WorkspaceHeader eyebrow="Portfolio" title="Keep the proof of your work" description="Artifacts and evidence stay on this device and can be tied back to goals, chapters, sessions, and completion events." /><PortfolioPanel /></PageShell>;
}
