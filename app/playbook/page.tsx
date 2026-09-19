import type { Metadata } from "next";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "My Playbook",
  description: "A local record of active goals, operating principles, and evidence from your execution loop.",
  alternates: { canonical: "/playbook/" },
  robots: { index: false, follow: false },
};

export default function PlaybookPage() {
  return <LevelUpOSWorkspace mode="playbook" />;
}
