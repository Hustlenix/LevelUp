import type { Metadata } from "next";
import Link from "next/link";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Every framework, term, and acronym used in the manual, defined.",
};

export default function GlossaryPage() {
  const { glossary } = getSiteData();
  const groups = glossary.reduce<Record<string, typeof glossary>>((acc, t) => {
    const letter = t.term[0].toUpperCase();
    (acc[letter] ??= []).push(t);
    return acc;
  }, {});
  const letters = Object.keys(groups).sort();

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Glossary"
        title="The vocabulary of the manual"
        lede="Sixty-five terms — the language the trainings share: filters, stacks, loops, states, and laws. Definitions are the book's own, written to survive contact with the research."
      />

      <div className="mb-8 flex flex-wrap gap-1.5 no-print">
        {letters.map((l) => (
          <a
            key={l}
            href={`#letter-${l}`}
            className="flex h-8 w-8 items-center justify-center rounded border border-line bg-paper font-display text-sm font-bold text-ink-soft transition-colors hover:border-gold hover:text-gold"
          >
            {l}
          </a>
        ))}
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        {letters.map((l) => (
          <section key={l} id={`letter-${l}`} className="scroll-mt-28">
            <h2 className="border-b-2 border-gold/60 pb-1 font-display text-2xl font-bold text-ink">
              {l}
            </h2>
            <dl className="mt-4 space-y-4">
              {groups[l].map((t) => (
                <div key={t.term} id={`term-${t.term.toLowerCase().replace(/\W+/g, "-")}`} className="scroll-mt-28">
                  <dt className="font-display text-base font-semibold text-ink">{t.term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{t.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-ink-faint">
        Prefer to search? Try the <Link className="text-gold underline-offset-2 hover:underline" href="/search/">search page</Link> or press{" "}
        <kbd className="rounded border border-line bg-paper-deep px-1.5 py-0.5 text-xs">⌘K</kbd>.
      </p>
    </PageShell>
  );
}