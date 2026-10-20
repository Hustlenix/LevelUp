import type { Metadata } from "next";
import SettingsPanel from "@/components/study/SettingsPanel";
import InstallApp from "@/components/InstallApp";
import TextSizeControl from "@/components/TextSizeControl";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your local LevelUp study profile, preferences, and privacy controls.",
  alternates: { canonical: "/settings/" },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <><div className="mx-auto max-w-4xl px-5 pt-8"><h1 className="mb-4 font-display text-3xl">Your preferences</h1><p className="mb-3 text-sm">Text size across LevelUp</p><div className="inline-flex"><TextSizeControl /></div><InstallApp /></div><SettingsPanel embedded /></>;
}
