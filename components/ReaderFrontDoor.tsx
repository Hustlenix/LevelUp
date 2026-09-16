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
    <div className="space-y-8">
      {/* Book hero */}
      <section className="rounded-2xl border border-line bg-card p-6 shadow-xs sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
          <ShieldCheck className="h-3.5 w-3.5" />
          Evidence-Audited
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {SITE_NAME}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          {BOOK_ONE_LINER}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/chapters/${start.slug}/`}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-paper shadow-xs transition-colors cta-hover"
          >
            <BookOpen className="h-4 w-4" />
            Start reading
          </Link>
          <span className="text-xs text-ink-faint">
            Chapter {start.number} · {start.title}
          </span>
        </div>
      </section>

      {/* Guided entry point: one card per pillar */}
      <section>
        <div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
            Begin Wherever You Are
          </span>
          <h2 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
            Pick a pillar
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-soft">
            Each pillar leads with its earliest chapter in reading order.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map(({ ch, meta }) => {
            const Icon = meta.icon;
            return (
              <Link
                key={ch.slug}
                href={`/chapters/${ch.slug}/`}
                className="group flex flex-col justify-between rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold hover:shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-ink-faint">
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {ch.pillar}
                    </span>
                    <span className="font-mono font-bold text-gold">Ch. {ch.number}</span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold text-ink transition-colors group-hover:text-gold">
                    {ch.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                    {ch.teaser}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-faint">
                  <span>{ch.duration}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gold">
                    Read &amp; Audit <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust strip */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 bg-paper px-5 py-3.5 text-xs text-ink-soft shadow-2xs">
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
      <div className="flex justify-end">
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