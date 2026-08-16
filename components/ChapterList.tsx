"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Chapter, Pillar } from "@/lib/types";
import { ChapterCard } from "@/components/ui";
import { PILLAR_META } from "@/lib/types";
import { BOOK_GROUPS } from "@/lib/groups";
import { useProgressStore } from "@/lib/progress";
import { useBookmarksStore, toggleBookmark } from "@/lib/bookmarks";

const PILLAR_ORDER: Pillar[] = ["self", "wealth", "health", "love"];

const PILLAR_ACTIVE: Record<Pillar, string> = {
  health: "border-health bg-health/10 text-health",
  wealth: "border-wealth bg-wealth/10 text-wealth",
  love: "border-love bg-love/10 text-love",
  self: "border-self bg-self/10 text-self",
};

function readMinutes(duration: string): number {
  const m = /^(\d+)/.exec(duration);
  return m ? parseInt(m[1], 10) : 0;
}

function ChapterRow({
  chapter,
  completed,
  bookmarked,
}: {
  chapter: Chapter;
  completed: boolean;
  bookmarked: boolean;
}) {
  const num = String(chapter.number).padStart(2, "0");
  return (
    <Link
      href={`/chapters/${chapter.slug}/`}
      className={`group flex items-center gap-4 rounded-lg border bg-card px-4 py-2.5 transition-all hover:border-gold hover:shadow-sm hover:shadow-gold/10 ${
        completed ? "border-gold/40" : "border-line"
      }`}
    >
      <span className="w-8 shrink-0 font-display text-sm font-bold text-gold/70 group-hover:text-gold">
        {num}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{chapter.title}</span>
      <span className="hidden shrink-0 items-center gap-2 sm:flex">
        {completed && (
          <span aria-label="Completed" title="Completed" className="font-display text-xs text-gold">
            ✓
          </span>
        )}
        {bookmarked && (
          <span aria-label="Bookmarked" title="Bookmarked" className="text-xs text-gold">
            ★
          </span>
        )}
        <span className="rounded-full border border-line/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
          {PILLAR_META[chapter.pillar].label}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink-faint">
          ~{chapter.duration}
        </span>
      </span>
    </Link>
  );
}

export default function ChapterList({ chapters }: { chapters: Chapter[] }) {
  const searchParams = useSearchParams();
  const progress = useProgressStore();
  const bookmarks = useBookmarksStore();
  const [query, setQuery] = useState("");

  const pillarParam = searchParams.get("pillar");
  const pillar = pillarParam && PILLAR_ORDER.includes(pillarParam as Pillar) ? (pillarParam as Pillar) : null;
  const sortParam = searchParams.get("sort");
  const sortByTime = sortParam === "time";
  const viewParam = searchParams.get("view");
  const compact = viewParam === "compact";
  const onlyBookmarked = searchParams.get("bookmarked") === "1";

  const buildHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return `/chapters/${qs ? `?${qs}` : ""}`;
  };

  let list = pillar ? chapters.filter((c) => c.pillar === pillar) : chapters;
  if (onlyBookmarked) list = list.filter((c) => bookmarks.has(c.slug));
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.teaser.toLowerCase().includes(q) ||
        c.keyConcepts.some((k) => k.toLowerCase().includes(q))
    );
  }
  const shown = sortByTime
    ? [...list].sort((a, b) => readMinutes(a.duration) - readMinutes(b.duration))
    : list;

  const bookmarkCount = chapters.filter((c) => bookmarks.has(c.slug)).length;

  const grouped =
    !pillar && !onlyBookmarked && !sortByTime && !query.trim();

  const renderList = (list: Chapter[]) =>
    compact ? (
      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <ChapterRow
            key={c.slug}
            chapter={c}
            completed={progress[c.slug]?.complete ?? false}
            bookmarked={bookmarks.has(c.slug)}
          />
        ))}
      </div>
    ) : (
      <div className="grid gap-4">
        {list.map((c) => (
          <ChapterCard
            key={c.slug}
            chapter={c}
            completed={progress[c.slug]?.complete ?? false}
            bookmarked={bookmarks.has(c.slug)}
            onToggleBookmark={() => toggleBookmark(c.slug)}
          />
        ))}
      </div>
    );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
        <Link
          href="/chapters/"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            !pillar && !onlyBookmarked
              ? "border-gold bg-gold/10 text-gold"
              : "border-line bg-paper text-ink-soft hover:border-gold"
          }`}
        >
          All ({chapters.length})
        </Link>
        {PILLAR_ORDER.map((p) => {
          const n = chapters.filter((c) => c.pillar === p).length;
          const active = pillar === p && !onlyBookmarked;
          return (
            <Link
              key={p}
              href={buildHref({ pillar: p, bookmarked: null })}
              title={PILLAR_META[p].description}
              aria-pressed={active}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? PILLAR_ACTIVE[p]
                  : "border-line bg-paper text-ink-soft hover:border-gold"
              }`}
            >
              {PILLAR_META[p].label} ({n})
            </Link>
          );
        })}
        <Link
          href={buildHref({ bookmarked: "1" })}
          aria-pressed={onlyBookmarked}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            onlyBookmarked
              ? "border-gold bg-gold/10 text-gold"
              : "border-line bg-paper text-ink-soft hover:border-gold"
          }`}
        >
          Bookmarked{bookmarkCount > 0 ? ` (${bookmarkCount})` : ""}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm no-print">
        <label className="flex flex-1 items-center gap-2 min-w-56">
          <span className="sr-only">Filter chapters</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter chapters by title, idea, or concept"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
          <Link
            href={buildHref({ sort: null })}
            aria-pressed={!sortByTime}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !sortByTime ? "bg-paper-deep text-ink" : "text-ink-faint hover:text-ink"
            }`}
          >
            Chapter order
          </Link>
          <Link
            href={buildHref({ sort: "time" })}
            aria-pressed={sortByTime}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              sortByTime ? "bg-paper-deep text-ink" : "text-ink-faint hover:text-ink"
            }`}
          >
            Reading time
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-1">
          <Link
            href={buildHref({ view: null })}
            aria-pressed={!compact}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !compact ? "bg-paper-deep text-ink" : "text-ink-faint hover:text-ink"
            }`}
          >
            Cards
          </Link>
          <Link
            href={buildHref({ view: "compact" })}
            aria-pressed={compact}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              compact ? "bg-paper-deep text-ink" : "text-ink-faint hover:text-ink"
            }`}
          >
            Compact
          </Link>
        </div>
      </div>

      {pillar && (
        <p className="mb-6 font-display italic text-ink-faint">
          “{PILLAR_META[pillar]?.verse}”
        </p>
      )}

      {grouped ? (
        <div className="space-y-10">
          {BOOK_GROUPS.map((g) => {
            const groupChapters = chapters.filter(
              (c) => c.number >= g.start && c.number <= g.end
            );
            return (
              <section key={g.name} aria-label={g.name}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h2 className="font-display text-xl font-bold text-ink">{g.name}</h2>
                  <span className="text-[11px] uppercase tracking-wider text-ink-faint">
                    Chapters {g.start}–{g.end}
                  </span>
                </div>
                <p className="mb-4 font-display text-sm italic text-ink-faint">
                  {g.message}
                </p>
                {renderList(groupChapters)}
              </section>
            );
          })}
        </div>
      ) : compact ? (
        <div className="flex flex-col gap-2">
          {shown.map((c) => (
            <ChapterRow
              key={c.slug}
              chapter={c}
              completed={progress[c.slug]?.complete ?? false}
              bookmarked={bookmarks.has(c.slug)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {shown.map((c) => (
            <ChapterCard
              key={c.slug}
              chapter={c}
              completed={progress[c.slug]?.complete ?? false}
              bookmarked={bookmarks.has(c.slug)}
              onToggleBookmark={() => toggleBookmark(c.slug)}
            />
          ))}
        </div>
      )}

      {shown.length === 0 && (
        <p className="py-10 text-center text-ink-faint">
          {onlyBookmarked
            ? "No bookmarked chapters yet. Star a chapter to save it here."
            : query.trim()
              ? "No chapters match that filter."
              : "No chapters in this pillar yet."}
        </p>
      )}
    </>
  );
}