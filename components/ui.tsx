import Link from "next/link";
import type { Chapter, Pillar } from "@/lib/types";

const PILLAR_STYLES: Record<Pillar, string> = {
  health: "border-health/40 bg-health/5 text-health",
  wealth: "border-wealth/40 bg-wealth/5 text-wealth",
  love: "border-love/40 bg-love/5 text-love",
  self: "border-self/40 bg-self/5 text-self",
};

export function PillarTag({ pillar, label }: { pillar: Pillar; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${PILLAR_STYLES[pillar]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PILLAR_STYLES[pillar].split(" ").pop()}`} />
      {label ?? pillar}
    </span>
  );
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-700 text-white",
  B: "bg-sky-700 text-white",
  C: "bg-amber-600 text-white",
  D: "bg-rose-700 text-white",
  U: "bg-stone-500 text-white",
};

export function GradeBadge({ grade }: { grade: string }) {
  const primary = grade.toUpperCase().trim().split(" ")[0].split("/")[0][0] ?? "U";
  const g = GRADE_STYLES[primary] ? primary : "U";
  const cls = GRADE_STYLES[g] ?? GRADE_STYLES.U;
  return (
    <span
      title={`Evidence grade ${grade}`}
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-display text-xs font-bold ${cls}`}
    >
      {g}
    </span>
  );
}

interface ChapterCardProps {
  chapter: Chapter;
  completed?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export function ChapterCard({ chapter, completed, bookmarked, onToggleBookmark }: ChapterCardProps) {
  const num = String(chapter.number).padStart(2, "0");
  return (
    <div className="relative h-full">
      <Link
        href={`/chapters/${chapter.slug}/`}
        className={`group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-gold sm:p-6 ${
          completed ? "border-gold/60" : "border-line"
        }`}
      >
        <div className="flex items-center gap-3 pr-10">
          <span className="text-xs font-medium tabular-nums text-ink-faint">LESSON {num}</span>
          <PillarTag pillar={chapter.pillar} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink">
              {chapter.title}
            </h3>
            {completed && (
              <span aria-label="Completed" title="Completed" className="font-display text-gold">
                ✓
              </span>
            )}
          </div>
          <p className="mt-3 mb-5 line-clamp-2 text-sm leading-6 text-ink-soft">
            {chapter.teaser}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-4 text-xs text-ink-faint">
            <span>~{chapter.duration} read</span>
            <span>·</span>
            <span>{chapter.keyConcepts.length} concepts</span>
            {chapter.studies.length > 0 && (
              <>
                <span>·</span>
                <span>{chapter.studies.length} study {chapter.studies.length === 1 ? "claim" : "claims"}</span>
              </>
            )}
            <span className="ml-auto text-gold opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
              →
            </span>
          </div>
        </div>
      </Link>
      {onToggleBookmark && (
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={bookmarked}
          aria-label={`Bookmark ${chapter.title}`}
          title="Bookmark this chapter"
          className={`absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-xl no-print transition-colors hover:bg-paper-deep ${
            bookmarked ? "text-gold" : "text-ink-faint hover:text-gold"
          }`}
        >
          {bookmarked ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="mb-8">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {lede ? <p className="mt-3 max-w-2xl text-ink-soft">{lede}</p> : null}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="interface-font mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">{children}</div>;
}
