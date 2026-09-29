import type { Metadata } from "next";
import NexusLab from "@/components/app/NexusLab";

export const metadata: Metadata = {
  title: "Nexus Sync Lab",
  description: "Inspect and test LevelUp's encrypted local-first event replication engine.",
  robots: { index: false, follow: false },
};

export default function SyncLabPage() {
  return <NexusLab />;
}

