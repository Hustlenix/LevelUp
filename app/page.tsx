import Link from "next/link";
import { getSiteData } from "@/lib/content";
import { PILLAR_META, type Pillar } from "@/lib/types";
import { GradeBadge } from "@/components/ui";
import JsonLd from "@/components/JsonLd";
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
  const gradeCounts = data.audit.reduce<Record<string, number>>((acc, a) => {
    acc[a.grade] = (acc[a.grade] ?? 0) + 1;
    return acc;
  }, {});
  const aCount = gradeCounts.A ?? 0;

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
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
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
              Belief engineering, identity, focus, discipline, and the one-person
              business — distilled from {data.chapters.length} trainings into a single
              book-like manual. Every notable claim is graded against the research that
              supports it.
            </p>
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

          <div className="hidden flex-col justify-center lg:flex">
            <div className="rounded-2xl border-2 border-ink/80 bg-paper shadow-[10px_10px_0_rgba(0,0,0,0.35)]">
              <div className="rounded-t-2xl border-b border-ink/80 bg-ink px-6 py-3">
                <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-paper">
                  Contents
                </p>
              </div>
              <ol className="space-y-1 px-6 py-5">
                {data.chapters.slice(0, 12).map((c) => (
                  <li key={c.slug} className="flex items-baseline gap-3 text-sm">
                    <span className="w-6 shrink-0 text-right font-display text-xs font-bold text-gold">
                      {c.number}
                    </span>
                    <span className="truncate text-ink">{c.title}</span>
                  </li>
                ))}
                <li className="flex items-baseline gap-3 pt-1 text-sm italic text-ink-faint">
                  <span className="w-6 shrink-0 text-right font-display text-xs font-bold text-gold">
                    …
                  </span>
                  <span>and {data.chapters.length - 12} more</span>
                </li>
              </ol>
            </div>
            <p className="mt-6 text-center text-xs text-ink-faint">
              <GradeBadge grade="A" /> {aCount} of {data.audit.length} claims graded A — solid evidence.
            </p>
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
                d: "Chapters 1–11 build the belief engine; 12–15 shift to doing; 16–20 train the body and mind; 21–28 build the business. The stack compounds.",
              },
              {
                t: "Trust, then verify",
                d: "Every chapter lists its evidence with letter grades. A = strong science, B = good support, C = plausible but mixed, D = weak. No claim is graded higher than it deserves.",
              },
              {
                t: "Apply with protocols",
                d: "Thirteen named protocols (2.1–2.13) turn each idea into a testable daily practice. Run them at 70% scale, one at a time, and log the inputs.",
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