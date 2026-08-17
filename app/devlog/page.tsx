import type { Metadata } from "next";
import { getDevlogData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { BookMarkdown } from "@/components/Markdown";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Devlog",
  description: "How this book was built: the design decisions, the rewrites, and the evidence.",
  alternates: { canonical: canonical("/devlog/") },
};

export default function DevlogPage() {
  const entries = getDevlogData();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Devlog"
        title="How this book was built"
        lede="A book about evidence should show its work. These entries record the decisions that shaped this site — what changed, why, and what the reader sees as a result."
      />
      <div className="space-y-8">
        {entries.map((e) => (
          <article key={e.slug} className="rounded-xl border border-line bg-card p-6 sm:p-10">
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