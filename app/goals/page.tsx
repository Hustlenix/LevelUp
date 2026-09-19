import type { Metadata } from "next";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "Goals",
  description: "Create local goals and turn them into roadmaps, milestones, tasks, and sessions.",
  alternates: { canonical: "/goals/" },
  robots: { index: false, follow: false },
};

export default function GoalsPage() {
  return <LevelUpOSWorkspace mode="goals" />;
}
