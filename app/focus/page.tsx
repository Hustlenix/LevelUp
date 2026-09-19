import type { Metadata } from "next";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "Focus",
  description: "Start and complete local focus sessions with a clear record of what happened.",
  alternates: { canonical: "/focus/" },
  robots: { index: false, follow: false },
};

export default function FocusPage() {
  return <LevelUpOSWorkspace mode="focus" />;
}
