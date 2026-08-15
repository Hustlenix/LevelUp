"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProgressStore } from "@/lib/progress";

let slugsPromise: Promise<string[]> | null = null;

function getChapterSlugs(): Promise<string[]> {
  if (slugsPromise) return slugsPromise;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  slugsPromise = fetch(`${window.location.origin}${base}/data/site.json`)
    .then((r) => r.json())
    .then((data: { chapters: { slug: string }[] }) => data.chapters.map((c) => c.slug))
    .catch(() => []);
  return slugsPromise;
}

export default function ContinueReading() {
  const map = useProgressStore();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    getChapterSlugs().then((s) => {
      if (alive) setSlugs(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const next = slugs.find((slug) => !map[slug]?.complete);

  if (!next) return null;

  return (
    <Link
      href={`/chapters/${next}/`}
      className="hidden items-center gap-2 rounded-full bg-ink px-4 py-1.5 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold md:flex"
      title="Jump to the next chapter you haven't finished"
    >
      Continue reading
      <span aria-hidden="true">→</span>
    </Link>
  );
}