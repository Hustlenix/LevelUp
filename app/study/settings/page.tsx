import type { Metadata } from "next";
import SettingsPanel from "@/components/study/SettingsPanel";

export const metadata: Metadata = {
  title: "Study Settings",
  description:
    "Review your Study Mode profile — subjects, weekly schedule, and streak — stored privately on this device.",
  alternates: { canonical: "/study/settings/" },
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsPanel />;
}