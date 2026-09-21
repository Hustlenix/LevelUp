import type { LearningGuide } from "@/lib/learningGuides";

export default function ChapterCompanion({ guide }: { guide: LearningGuide }) {
  return (
    <section id="chapter-guide" aria-labelledby="chapter-guide-heading" className="mb-8 scroll-mt-28 rounded-2xl border border-gold/30 bg-card p-5 font-sans sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold">Understand → Try → Reflect</p>
      <h2 id="chapter-guide-heading" className="mt-2 font-display text-2xl font-semibold">In plain English</h2>
      <p className="mt-3 text-base leading-relaxed text-ink">{guide.meaning}</p>
      <div className="mt-4 rounded-lg bg-paper-deep/60 p-4">
        <h3 className="text-sm font-semibold">Your smallest first step</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{guide.tinyAction}</p>
      </div>
      <details className="mt-3 border-b border-line pb-2">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Unpack the idea · example & limits</summary>
        <dl className="space-y-3 pb-3 text-sm leading-relaxed">
          <div><dt className="font-semibold">Translate the language</dt><dd className="mt-1 text-ink-soft">{guide.translation}</dd></div>
          <div><dt className="font-semibold">A real-life example</dt><dd className="mt-1 text-ink-soft">{guide.example}</dd></div>
          <div><dt className="font-semibold">Keep in mind</dt><dd className="mt-1 text-ink-soft">{guide.caution}</dd></div>
        </dl>
      </details>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Check your understanding</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{guide.question}</p>
        <details className="mt-1 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-gold">Think first, then reveal a possible answer</summary>
          <p className="pb-3 leading-relaxed text-ink-soft">{guide.answer}</p>
        </details>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold no-print">
        <a href="#chapter-practice" className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 py-2 text-paper">Try the guided plan ↓</a>
        <a href="#full-lesson" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 py-2">Read the full lesson ↓</a>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">An editorial reading aid, not a new evidence grade. The original lesson and its sources follow.</p>
    </section>
  );
}
