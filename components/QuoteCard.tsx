/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QuoteEntry {
  text: string;
  source: string;
  chapter: string;
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function QuoteCard() {
  const [quote, setQuote] = useState<QuoteEntry | null>(null);

  useEffect(() => {
    fetch("/data/quotes.json")
      .then((r) => r.json())
      .then((data) => {
        const entries: QuoteEntry[] = (data as { quotes: QuoteEntry[] }).quotes || [];
        if (!entries.length) return;
        const shuffled = shuffleArray(entries);
        const choice = shuffled[0];
        setQuote(choice);
      })
      .catch(() => {
        /* ignore fetch errors silently */
      });
  }, []);

  if (!quote) return null;

  return (
    <div className="mt-4">
      <blockquote className="italic text-lg text-ink-soft">
        <p>{quote.text}</p>
        <p className="text-xs text-ink-faint">— {quote.source}</p>
      </blockquote>
      <Link
        href={`/chapters/${quote.chapter}/`}
        className="mt-2 rounded-full bg-ink px-6 py-2 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold"
      >
        Read chapter
      </Link>
    </div>
  );
}

export default QuoteCard;