import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteData } from "@/lib/content";
import { PILLAR_META, type Chapter } from "@/lib/types";
import { BOOK_GROUPS } from "@/lib/groups";
import { GradeBadge, PillarTag } from "@/components/ui";
import { BookMarkdown, StudyList } from "@/components/Markdown";
import { ReadingProgress } from "@/components/ReadingProgress";
import ReaderControls from "@/components/ReaderControls";
import ResumeScroll from "@/components/ResumeScroll";
import HighlightLayer from "@/components/HighlightLayer";
import ChapterQuiz from "@/components/ChapterQuiz";
import ChapterToc from "@/components/ChapterToc";
import ChapterKeys from "@/components/ChapterKeys";
import JsonLd from "@/components/JsonLd";
import ChapterCompanion from "@/components/ChapterCompanion";
import PracticeRunner from "@/components/PracticeRunner";
import { getLearningGuide } from "@/lib/learningGuides";
import { getPracticePlan } from "@/lib/practicePlans";
import { SITE_URL, SITE_NAME, SITE_AUTHOR, PUBLISHED_DATE, canonical } from "@/lib/site";

export function generateStaticParams() {
  const { chapters } = getSiteData();
  return chapters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getSiteData().chapters.find((c) => c.slug === slug);
  if (!chapter) return {};
  const url = canonical(`/chapters/${chapter.slug}/`);
  return {
    title: `Chapter ${chapter.number} — ${chapter.title}`,
    description: chapter.teaser,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `Chapter ${chapter.number} — ${chapter.title}`,
      description: chapter.teaser,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      publishedTime: PUBLISHED_DATE,
      authors: [SITE_AUTHOR],
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Chapter ${chapter.number} — ${chapter.title}`,
      description: chapter.teaser,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

function PrevNext({ chapter }: { chapter: Chapter }) {
  const { chapters } = getSiteData();
  const idx = chapters.findIndex((c) => c.slug === chapter.slug);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
  return (
    <nav className="mt-14 grid gap-4 border-t border-line pt-8 sm:grid-cols-2 no-print">
      {prev ? (
        <Link
          href={`/chapters/${prev.slug}/`}
          className="group rounded-xl border border-line bg-card p-5 transition-colors hover:border-gold"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Previous — {prev.number}</p>
          <p className="mt-1 font-display font-semibold text-ink group-hover:text-gold">{prev.title}</p>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link
          href={`/chapters/${next.slug}/`}
          className="group rounded-xl border border-line bg-card p-5 text-right transition-colors hover:border-gold sm:col-start-2"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Next — {next.number}</p>
          <p className="mt-1 font-display font-semibold text-ink group-hover:text-gold">{next.title}</p>
        </Link>
      )}
    </nav>
  );
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getSiteData().chapters.find((c) => c.slug === slug);
  if (!chapter) notFound();

  const guide = getLearningGuide(chapter.slug);

  const meta = PILLAR_META[chapter.pillar];
  const num = String(chapter.number).padStart(2, "0");
  const group = BOOK_GROUPS.find((g) => chapter.number >= g.start && chapter.number <= g.end);
  const groupIndex = group ? BOOK_GROUPS.indexOf(group) + 1 : 0;
  const quiz = getSiteData().quizzes.find((q) => q.slug === chapter.slug);
  const { chapters, protocols } = getSiteData();
  const idx = chapters.findIndex((c) => c.slug === chapter.slug);
  const prevHref = idx > 0 ? `/chapters/${chapters[idx - 1].slug}/` : undefined;
  const nextHref = idx < chapters.length - 1 ? `/chapters/${chapters[idx + 1].slug}/` : undefined;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `Chapter ${chapter.number} — ${chapter.title}`,
          description: chapter.teaser,
          url: canonical(`/chapters/${chapter.slug}/`),
          inLanguage: "en",
          author: { "@type": "Organization", name: SITE_AUTHOR },
          publisher: { "@type": "Organization", name: SITE_AUTHOR },
          datePublished: PUBLISHED_DATE,
          dateModified: PUBLISHED_DATE,
          articleSection: meta.label,
          wordCount: chapter.stats.words,
        }}
      />
      <ResumeScroll slug={chapter.slug} />
      <ChapterKeys prevHref={prevHref} nextHref={nextHref} />
      <div className="border-b border-line bg-paper-deep/40">
        <div className="mx-auto max-w-3xl px-5 py-12">
          {group && chapter.number === group.start && (
            <div className="mb-6 rounded-xl border border-gold/40 bg-card p-5 no-print">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Group {groupIndex} of 4 — {group.name}
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                {group.message} These chapters run {group.start}–{group.end}; read them in
                order.
              </p>
              <Link
                href="/chapters/"
                className="mt-3 inline-block text-xs font-medium text-gold underline-offset-2 hover:underline"
              >
                Back to contents
              </Link>
            </div>
          )}
          {group && (
            <p className="mb-4 no-print text-xs uppercase tracking-wider text-ink-faint">
              <Link
                href="/chapters/"
                className="transition-colors hover:text-gold"
              >
                Group {groupIndex} · {group.name} · Chapters {group.start}–{group.end}
              </Link>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm font-bold text-gold">Chapter {num}</span>
            <span className="h-1 w-1 rounded-full bg-line" />
            <PillarTag pillar={chapter.pillar} label={meta.label} />
            <span className="h-1 w-1 rounded-full bg-line" />
            <span className="text-xs uppercase tracking-wider text-ink-faint">{chapter.duration}</span>
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink">
            {chapter.title}
          </h1>
          <p className="mt-4 font-display text-lg italic leading-relaxed text-ink-soft">
            {chapter.teaser}
          </p>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-sm">
              <ReadingProgress slug={chapter.slug} />
            </div>
            <ReaderControls />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {guide && <ChapterCompanion guide={guide} />}
          <details className="mb-6 rounded-xl border border-line bg-card p-4 font-sans lg:hidden no-print">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Jump to a section</summary>
            <ChapterToc chapter={chapter} />
          </details>
          <div id="full-lesson" className="scroll-mt-28">
            <HighlightLayer slug={chapter.slug}>
              <BookMarkdown body={chapter.body} dropCap />
            </HighlightLayer>
          </div>

          {guide && <section id="chapter-practice" aria-labelledby="chapter-practice-heading" className="mt-10 scroll-mt-28 rounded-2xl border border-gold/30 bg-card p-5 sm:p-6 no-print">
            <h2 id="chapter-practice-heading" className="mb-5 font-display text-2xl font-semibold">Put this lesson to work</h2>
            <PracticeRunner plan={getPracticePlan(guide.planId)} chapterSlug={chapter.slug} />
            <Link href="/protocols/#ready-plans" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline underline-offset-4">Explore all practice plans →</Link>
          </section>}

          {quiz && quiz.questions.length > 0 && (
            <ChapterQuiz quiz={quiz} />
          )}

          {chapter.keyConcepts.length > 0 && (
            <div className="mt-10 rounded-xl border border-line bg-card p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Key concepts
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {chapter.keyConcepts.map((k) => (
                  <span key={k} className="rounded-full bg-paper-deep px-3 py-1 text-sm text-ink-soft">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          <StudyList studies={chapter.studies} />

          {chapter.protocols.length > 0 && (
            <div className="mt-6 rounded-xl border border-line bg-card p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Protocols referenced
              </p>
              <ul className="mt-3 space-y-2">
                {chapter.protocols.map((p) => {
                  const protocol = protocols.find((item) => item.title === p);
                  return (
                    <li key={p}>
                      <Link
                        href={`/protocols/${protocol ? `#protocol-${protocol.num.replace(".", "-")}` : ""}`}
                        className="text-sm text-ink-soft underline-offset-2 hover:text-gold hover:underline"
                      >
                        {p}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <aside className="hidden lg:block no-print">
          <div className="sticky top-24 space-y-5">
            <ChapterToc chapter={chapter} />
            <div className="rounded-xl border border-line bg-card p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Reading time
              </p>
              <p className="mt-2 text-3xl font-display font-bold text-ink">{chapter.duration}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {chapter.stats.words.toLocaleString()} words · {chapter.stats.sections.length} sections
              </p>
            </div>
            <div className="rounded-xl border border-line bg-card p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Evidence in this chapter
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">Grades apply to cited claims. Metaphors and planning rules are not the same as scientific findings.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chapter.studies.map((s, i) => (
                  <span key={i} title={s.name}>
                    <GradeBadge grade={s.grade} />
                  </span>
                ))}
                {chapter.studies.length === 0 && (
                  <p className="text-xs text-ink-faint">No external claims cited.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-14">
        <PrevNext chapter={chapter} />
      </div>
    </article>
  );
}
