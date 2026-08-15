import type { Metadata } from "next";
import Link from "next/link";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Quote Library",
  description: "Lines from the trainings and the sources behind them.",
};

export default function QuotesPage() {
  const { quotes, chapters } = getSiteData();
  const slugByTitle = new Map(chapters.map((c) => [c.title, c.slug]));
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Quote Library"
        title="Lines worth keeping"
        lede="From the trainings themselves and the thinkers the trainings lean on. Attribution is honest: a quote attributed to a person is verified; a training line is the creator's own."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {quotes.map((q, i) => (
          <figure key={i} className="flex flex-col rounded-xl border border-line bg-card p-6">
            <blockquote className="flex-1 font-display text-lg italic leading-relaxed text-ink">
              “{q.text}”
            </blockquote>
            <figcaption className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
              <span className="font-semibold text-ink">{q.source}</span>
              {q.chapter ? (
                <span className="ml-1 text-ink-faint">
                  — see chapter{" "}
                  <Link
                    href={`/chapters/${slugByTitle.get(q.chapter) ?? q.chapter}/`}
                    className="text-gold underline-offset-2 hover:underline"
                  >
                    {q.chapter}
                  </Link>
                </span>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </PageShell>
  );
}