import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import LifeProgressView from "@/components/app/LifeProgressView";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Progress",
  description: "Your private LevelUp mission, skill, streak, and learning progress.",
  alternates: { canonical: canonical("/progress/") },
  robots: { index: false, follow: false },
};

export default function ProgressPage() {
  const { chapters } = getSiteData();
  return <LifeProgressView chapters={chapters} />;
}
