import type { Metadata } from "next";
import Link from "next/link";
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
  const totalMinutes = chapters.reduce((sum, c) => {
    const m = /^(\d+)/.exec(c.duration);
    return sum + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const totalText =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`
      : `${totalMinutes} min`;
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Table of Contents"
        title="Twenty-eight lessons, one manual"
        lede="Read in order — each chapter assumes the ones before it. Filter by pillar to focus on what you need now."
      />
      <p className="-mt-4 mb-8 text-sm text-ink-soft">
        ≈ {totalText} of reading across {chapters.length} chapters. Every claim is graded A–D
        against the research — see the <Link className="underline decoration-gold/60 underline-offset-2 hover:text-gold" href="/audit/">Verification Audit</Link>.
      </p>
      <Suspense>
        <ChapterList chapters={chapters} />
      </Suspense>
    </PageShell>
  );
}