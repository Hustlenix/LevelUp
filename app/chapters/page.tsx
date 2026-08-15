import type { Metadata } from "next";
import { Suspense } from "react";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import ChapterList from "@/components/ChapterList";

export const metadata: Metadata = {
  title: "Table of Contents",
  description: "All 28 chapters of The Level Up Manual, grouped by pillar.",
};

export default async function ChaptersPage() {
  const { chapters } = getSiteData();
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Table of Contents"
        title="Twenty-eight lessons, one manual"
        lede="Read in order — each chapter assumes the ones before it. Filter by pillar to focus on what you need now."
      />
      <Suspense>
        <ChapterList chapters={chapters} />
      </Suspense>
    </PageShell>
  );
}