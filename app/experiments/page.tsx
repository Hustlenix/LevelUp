import type { Metadata } from "next";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "Experiments",
  description: "Run small local experiments with a hypothesis, one variable, a metric, and a decision.",
  alternates: { canonical: "/experiments/" },
  robots: { index: false, follow: false },
};

export default function ExperimentsPage() {
  return <LevelUpOSWorkspace mode="experiments" />;
}
