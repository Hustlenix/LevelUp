import type { Metadata } from "next";
import { getDevlogData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { BookMarkdown } from "@/components/Markdown";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Devlog",
  description: "How Level Up was built: product decisions, engineering tradeoffs, failures, and evidence.",
  alternates: { canonical: canonical("/devlog/") },
};

export default function DevlogPage() {
  const entries = getDevlogData();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Devlog"
        title="How Level Up was built"
        lede="A project about evidence should show its work. These entries record the product decisions, engineering tradeoffs, failures, and changes that shaped Level Up."
      />
      <div className="space-y-8">
        {entries.map((e) => (
          <article key={e.slug} id={e.slug} className="scroll-mt-28 rounded-xl border border-line bg-card p-6 sm:p-10">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {e.date}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
              {e.title}
            </h2>
            <div className="mt-6">
              <BookMarkdown body={e.body} />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}