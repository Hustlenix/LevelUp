import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import ProgressView from "@/components/ProgressView";

export const metadata: Metadata = {
  title: "Backup",
  description: "Export or restore your local LevelUp state without an account or server.",
  alternates: { canonical: "/backup/" },
  robots: { index: false, follow: false },
};

export default function BackupPage() {
  return <ProgressView chapters={getSiteData().chapters} />;
}
