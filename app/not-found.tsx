import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="font-display text-6xl font-bold text-gold">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">No such page in this volume</h1>
      <p className="mt-3 text-ink-soft">
        The manual ends at chapter 28 — this page falls outside it.
      </p>
      <Link
        href="/chapters/"
        className="mt-8 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold"
      >
        Back to the Table of Contents
      </Link>
    </div>
  );
}