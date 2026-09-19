import type { Metadata } from "next";
import SettingsPanel from "@/components/study/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your local LevelUp study profile, preferences, and privacy controls.",
  alternates: { canonical: "/settings/" },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsPanel />;
}
