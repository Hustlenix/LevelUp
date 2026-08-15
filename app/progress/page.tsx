import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import ProgressView from "@/components/ProgressView";

export const metadata: Metadata = {
  title: "Reading Progress",
  description: "Your reading progress across the 28 chapters, stored locally.",
};

export default function ProgressPage() {
  const { chapters } = getSiteData();
  return <ProgressView chapters={chapters} />;
}