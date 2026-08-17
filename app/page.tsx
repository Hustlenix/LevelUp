import Link from "next/link";
import { getSiteData } from "@/lib/content";
import { PILLAR_META, type Pillar } from "@/lib/types";
import JsonLd from "@/components/JsonLd";
import QuoteCard from "@/components/QuoteCard";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_AUTHOR, PUBLISHED_DATE } from "@/lib/site";

const PILLAR_ORDER: Pillar[] = ["self", "wealth", "health", "love"];

const PILLAR_BORDER: Record<Pillar, string> = {
  self: "border-self/50",
  wealth: "border-wealth/50",
  health: "border-health/50",
  love: "border-love/50",
};

export default function Home() {
  const data = getSiteData();
  const totalWords = data.chapters.reduce((s, c) => s + c.stats.words, 0);

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          inLanguage: "en",
          author: { "@type": "Organization", name: SITE_AUTHOR },
          datePublished: PUBLISHED_DATE,
          numberOfPages: data.chapters.length,
          about: ["self-improvement", "belief", "identity", "discipline", "one-person business"],
        }}
      />
      <section className="border-b border-line bg-paper-deep/50">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              A book of twenty-eight lessons · verified against the evidence
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-6xl">
              The Level Up
              <br />
              <span className="italic text-gold">Manual</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Belief, identity, focus, discipline, and the one-person
              business — distilled from {data.chapters.length} trainings into one
              book-like manual. Every notable claim is graded against the research
              behind it.
            </p>
            <QuoteCard />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/chapters/"
                className="rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold"
              >
                Begin Reading
              </Link>
              <Link
                href="/audit/"
                className="rounded-full border border-line bg-paper px-6 py-3 font-display text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
              >
                Check the Evidence
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { k: "Chapters", v: String(data.chapters.length) },
                { k: "Words", v: totalWords.toLocaleString() },
                { k: "Claims graded", v: String(data.audit.length) },
                { k: "Protocols", v: String(data.protocols.length) },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-line bg-paper px-4 py-3">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">{s.k}</dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-ink">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          Four pillars
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PILLAR_ORDER.map((p) => {
            const meta = PILLAR_META[p];
            const chapters = data.chapters.filter((c) => c.pillar === p);
            return (
              <Link
                key={p}
                href={`/chapters/?pillar=${p}`}
                className={`group rounded-xl border bg-card p-6 transition-all hover:shadow-md ${PILLAR_BORDER[p]}`}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-bold text-ink">{meta.label}</h2>
                  <span className="font-display text-sm text-ink-faint">
                    {chapters.length} chapters
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{meta.description}</p>
                <p className="mt-3 font-display text-sm italic text-ink-faint">{meta.verse}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line bg-paper-deep/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            How to read this book
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Read in order",
                d: "Chapters 1–11 build the belief engine. Chapters 12–15 move you to action. Chapters 16–20 train body and mind. Chapters 21–28 build the business. Each step builds on the last.",
              },
              {
                t: "Trust, then verify",
                d: "Every chapter shows its evidence with letter grades. A = strong science, B = good support, C = plausible but mixed, D = weak. No claim gets a grade higher than the evidence allows.",
              },
              {
                t: "Apply with protocols",
                d: "Thirteen named protocols (2.1–2.13) turn each idea into a testable daily practice. Run one at a time, at 70% scale, and log the inputs.",
              },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-line bg-paper p-5">
                <h3 className="font-display text-base font-semibold text-ink">{b.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}