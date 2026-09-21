import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronRight,
  Coins,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Chapter, Pillar } from "@/lib/types";
import { SITE_NAME } from "@/lib/site";

export const BOOK_ONE_LINER =
  "Twenty-eight evidence-audited chapters on belief, identity, and the science of getting better.";

const PILLAR_ORDER: Pillar[] = ["health", "wealth", "love", "self"];

const PILLAR_META: Record<Pillar, { icon: LucideIcon; color: string }> = {
  health: { icon: Heart, color: "text-health" },
  wealth: { icon: Coins, color: "text-wealth" },
  love: { icon: Zap, color: "text-love" },
  self: { icon: Brain, color: "text-self" },
};

interface PillarEntry {
  ch: Chapter;
  meta: { icon: LucideIcon; color: string };
}

export default function ReaderFrontDoor({ chapters }: { chapters: Chapter[] }) {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  const start = sorted[0];

  const lowestByPillar = (pillar: Pillar): Chapter | undefined =>
    chapters
      .filter((c) => c.pillar === pillar)
      .sort((a, b) => a.number - b.number)[0];

  const entries: PillarEntry[] = PILLAR_ORDER.flatMap((p) => {
    const ch = lowestByPillar(p);
    return ch ? [{ ch, meta: PILLAR_META[p] }] : [];
  });

  return (
    <div className="interface-font space-y-10 sm:space-y-12">
      {/* Book hero */}
      <section className="editorial-hero panel-shadow overflow-hidden rounded-2xl border border-line">
        <div className="grid lg:grid-cols-[1.65fr_1fr]">
        <div className="p-6 sm:p-10 lg:py-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Evidence-Audited
        </span>
        <h1 className="mt-6 max-w-xl font-display text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-6xl">
          {SITE_NAME}
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-ink-soft sm:text-base">
          {BOOK_ONE_LINER}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={`/chapters/${start.slug}/`}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-paper shadow-xs transition-colors cta-hover"
          >
            <BookOpen className="h-4 w-4" />
            Start reading
          </Link>
          <Link href="/today/" className="inline-flex min-h-12 items-center gap-2 px-1 text-sm font-semibold text-ink-soft hover:text-gold">Open Today <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink-faint">Begin with Chapter {start.number} · {start.duration} read</p>
        </div>
        <aside className="border-t border-line bg-paper-deep/35 p-6 sm:p-10 lg:flex lg:flex-col lg:justify-center lg:border-t-0 lg:border-l" aria-label="About the manual">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-gold lg:block">A field guide to getting better</p>
          <p className="mt-5 hidden font-display text-2xl leading-snug tracking-tight text-ink sm:text-3xl lg:block">Read with curiosity.<br />Act with intention.</p>
          <div className="grid grid-cols-3 gap-3 lg:mt-7 lg:border-y lg:border-line lg:py-5">
            {[[String(chapters.length), "Chapters"], ["4", "Life pillars"], ["A–D", "Evidence grades"]].map(([value, label]) => <div key={label}><p className="font-display text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-[10px] leading-relaxed text-ink-faint">{label}</p></div>)}
          </div>
          <Link href="/audit/" className="mt-5 hidden min-h-11 items-center gap-2 text-xs font-semibold text-gold lg:inline-flex">See how the evidence is graded <ArrowRight className="h-3.5 w-3.5" /></Link>
        </aside>
        </div>
      </section>

      {/* Guided entry point: one card per pillar */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            Begin Wherever You Are
          </span>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Pick a pillar
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Start with the part of life you want to give more attention.
          </p>
          </div>
          <Link href="/chapters/" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-gold">Browse all chapters <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map(({ ch, meta }) => {
            const Icon = meta.icon;
            return (
              <Link
                key={ch.slug}
                href={`/chapters/${ch.slug}/`}
                className="group flex flex-col justify-between rounded-xl border border-line bg-card p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-gold/60 hover:shadow-md motion-reduce:hover:translate-y-0 sm:min-h-72 sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-ink-faint">
                    <span className="inline-flex items-center gap-2 font-medium capitalize">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-paper-deep/70 ${meta.color}`}><Icon className="h-4 w-4" /></span>
                      {ch.pillar}
                    </span>
                    <span className="text-[10px] tabular-nums text-ink-faint">{String(ch.number).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold">
                    {ch.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">
                    {ch.teaser}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-faint">
                  <span>{ch.duration} read</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gold">
                    Explore <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust strip */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line/80 bg-card px-5 py-5 text-xs leading-relaxed text-ink-soft">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display font-bold text-ink">{chapters.length} chapters</span>
          <span className="hidden text-ink-faint sm:inline">·</span>
          <span>Every notable claim graded A–D against published research.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/audit/"
            className="inline-flex items-center gap-1 font-semibold text-gold hover:underline"
          >
            Verification Audit <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/research/"
            className="inline-flex items-center gap-1 font-semibold text-gold hover:underline"
          >
            Research Notes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Quiet dashboard entry */}
      <div className="flex justify-end border-t border-line pt-5">
        <Link
          href="/dashboard/"
          className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-gold"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Open your dashboard
        </Link>
      </div>
    </div>
  );
}
