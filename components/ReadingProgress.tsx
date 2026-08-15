"use client";

import { useEffect } from "react";
import { markComplete, recordScroll, useProgressStore, getProgressSnapshot } from "@/lib/progress";

export function ReadingProgress({ slug }: { slug: string }) {
  const map = useProgressStore();
  const entry = map[slug];
  const complete = entry?.complete ?? false;

  useEffect(() => {
    const el = document.documentElement;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = el.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        const pct = Math.round(ratio * 100);
        const cur = getProgressSnapshot();
        const shouldComplete = pct >= 90;
        const curEntry = cur[slug];
        if (shouldComplete && !curEntry?.complete) {
          markComplete(slug, true);
        } else {
          recordScroll(slug, pct);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [slug]);

  return (
    <div className="no-print" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-faint">
        <span>{complete ? "Completed — marked in your progress" : "Reading progress"}</span>
        <span>{entry?.maxScroll ?? 0}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-600" : "bg-gold"}`}
          style={{ width: `${entry?.maxScroll ?? 0}%` }}
        />
      </div>
      {!complete && (
        <button
          onClick={() => markComplete(slug, true)}
          className="mt-2 text-xs text-gold underline-offset-2 hover:underline"
        >
          Mark as read
        </button>
      )}
    </div>
  );
}