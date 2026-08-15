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

export function ChapterCard({ chapter }: { chapter: Chapter }) {
  const num = String(chapter.number).padStart(2, "0");
  return (
    <Link
      href={`/chapters/${chapter.slug}/`}
      className="group flex gap-4 rounded-xl border border-line bg-card p-4 transition-all hover:border-gold hover:shadow-md hover:shadow-gold/10"
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-gold/70 transition-colors group-hover:text-gold">
          {num}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {chapter.title}
          </h3>
          <PillarTag pillar={chapter.pillar} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {chapter.teaser}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-faint">
          <span>~{chapter.duration}</span>
          <span>·</span>
          <span>{chapter.keyConcepts.length} concepts</span>
          {chapter.studies.length > 0 && (
            <>
              <span>·</span>
              <span>{chapter.studies.length} study {chapter.studies.length === 1 ? "claim" : "claims"}</span>
            </>
          )}
        </div>
      </div>
    </Link>
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
  return <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">{children}</div>;
}