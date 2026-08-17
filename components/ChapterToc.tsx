"use client";

import { useEffect, useMemo, useState } from "react";
import type { Chapter } from "@/lib/types";
import { useHighlightsStore } from "@/lib/activity";

export default function ChapterToc({ chapter }: { chapter: Chapter }) {
  const [active, setActive] = useState<string | null>(null);
  const highlights = useHighlightsStore();
  const highlightCount = highlights.filter((h) => h.slug === chapter.slug).length;

  const items = useMemo(
    () => [
      ...chapter.stats.sections.map((s) => ({
        id: `sec-${s.num}`,
        label: `${s.num} — ${s.title}`,
      })),
      ...(chapter.stats.keyIdeas ? [{ id: "sec-keyideas", label: "Key Ideas" }] : []),
      ...(chapter.stats.applyToday ? [{ id: "sec-apply", label: "Apply Today" }] : []),
      ...(chapter.stats.theScience ? [{ id: "sec-science", label: "The Science" }] : []),
    ],
    [chapter]
  );

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const el = visible[0].target as HTMLElement;
          if (el.id) setActive(el.id);
        }
      },
      { rootMargin: "-72px 0px -60% 0px", threshold: [0, 0.1, 0.5, 1] }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  return (
    <div className="rounded-xl border border-line bg-paper-deep/50 p-5">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        In this chapter
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "true" : undefined}
              className={`block transition-colors ${
                active === i.id ? "font-semibold text-gold" : "text-ink-soft hover:text-ink"
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ol>
      {highlightCount > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
          {highlightCount} highlight{highlightCount === 1 ? "" : "s"} saved on this chapter
        </p>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        Press <kbd className="rounded border border-line bg-paper px-1">J</kbd> /{" "}
        <kbd className="rounded border border-line bg-paper px-1">K</kbd> to flip chapters
      </p>
    </div>
  );
}