"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="font-display text-6xl font-bold text-gold">!</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">Something in this page went wrong</h1>
      <p className="mt-3 text-ink-soft">
        An unexpected error interrupted the page. You can try again, or head back to the manual.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-gold px-6 py-3 font-display text-sm font-semibold text-paper transition-colors cta-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-line px-6 py-3 font-display text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
        >
          Back to the beginning
        </Link>
      </div>
    </div>
  );
}
