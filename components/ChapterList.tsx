"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Chapter, Pillar } from "@/lib/types";
import { ChapterCard } from "@/components/ui";
import { PILLAR_META } from "@/lib/types";

const PILLAR_ORDER: Pillar[] = ["self", "wealth", "health", "love"];

export default function ChapterList({ chapters }: { chapters: Chapter[] }) {
  const searchParams = useSearchParams();
  const pillarParam = searchParams.get("pillar");
  const pillar = pillarParam && PILLAR_ORDER.includes(pillarParam as Pillar) ? pillarParam : null;

  const filtered = pillar ? chapters.filter((c) => c.pillar === pillar) : chapters;

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2 no-print">
        <Link
          href="/chapters/"
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            !pillar
              ? "border-gold bg-gold/10 text-gold"
              : "border-line bg-paper text-ink-soft hover:border-gold"
          }`}
        >
          All ({chapters.length})
        </Link>
        {PILLAR_ORDER.map((p) => {
          const n = chapters.filter((c) => c.pillar === p).length;
          return (
            <Link
              key={p}
              href={`/chapters/?pillar=${p}`}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                pillar === p
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line bg-paper text-ink-soft hover:border-gold"
              }`}
            >
              {PILLAR_META[p].label} ({n})
            </Link>
          );
        })}
      </div>

      {pillar && (
        <p className="mb-6 font-display italic text-ink-faint">
          “{PILLAR_META[pillar as Pillar]?.verse}”
        </p>
      )}

      <div className="grid gap-4">
        {filtered.map((c) => (
          <ChapterCard key={c.slug} chapter={c} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-ink-faint">No chapters in this pillar yet.</p>
      )}
    </>
  );
}