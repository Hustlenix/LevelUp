import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading, ChapterCard } from "@/components/ui";
import { canonical } from "@/lib/site";
import ChapterList from "@/components/ChapterList";
import type { Chapter } from "@/lib/types";
import { BOOK_GROUPS } from "@/lib/groups";

export const metadata: Metadata = {
  title: "Table of Contents",
  description: "All 28 chapters of The Level Up Manual, grouped into four parts.",
  alternates: { canonical: canonical("/chapters/") },
};

function ChapterListFallback({ chapters }: { chapters: Chapter[] }) {
  return (
    <>
      <div aria-hidden="true" className="mb-4 h-10" />
      <div aria-hidden="true" className="mb-6 h-10" />
      <div className="space-y-10">
        {BOOK_GROUPS.map((g) => {
          const groupChapters = chapters.filter(
            (c) => c.number >= g.start && c.number <= g.end
          );
          return (
            <section key={g.name} aria-label={g.name}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h2 className="font-display text-xl font-bold text-ink">{g.name}</h2>
                <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                  Chapters {g.start}–{g.end}
                </span>
              </div>
              <p className="mb-4 font-display text-sm italic text-ink-faint">{g.message}</p>
              <div className="grid gap-4">
                {groupChapters.map((c) => (
                  <ChapterCard key={c.slug} chapter={c} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

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
        lede="Read in order, or start with a question you have today. Every chapter now includes a plain-language guide, a worked example and a small action to try."
      />
      <p className="-mt-4 mb-8 text-sm text-ink-soft">
        ≈ {totalText} of estimated reading across {chapters.length} chapters. Evidence grades describe cited claims,
        not a guarantee that an exercise will work for everyone. See the <Link className="underline decoration-gold/60 underline-offset-2 hover:text-gold" href="/audit/">Verification Audit</Link>.
      </p>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card p-5">
        <div><h2 className="font-display text-lg font-semibold">Prefer to learn by doing?</h2><p className="mt-1 text-sm text-ink-soft">Try a Pomodoro, a two-minute restart or a ready-made weekly plan.</p></div>
        <Link href="/protocols/#ready-plans" className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper">Choose a practice plan →</Link>
      </div>
      <Suspense fallback={<ChapterListFallback chapters={chapters} />}>
        <ChapterList chapters={chapters} />
      </Suspense>
    </PageShell>
  );
}
