import type { Metadata } from "next";
import BackupPanel from "@/components/BackupPanel";
import { PageShell, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Backup",
  description: "Export or restore your local LevelUp state without an account or server.",
  alternates: { canonical: "/backup/" },
  robots: { index: false, follow: false },
};

export default function BackupPage() {
  return <PageShell><SectionHeading eyebrow="Backup" title="Keep your local system portable" lede="Export or restore the state that makes LevelUp yours. The file stays on your device until you choose to move it." /><BackupPanel /></PageShell>;
}
