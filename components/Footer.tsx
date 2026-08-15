import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper-deep/60 no-print">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 text-sm text-ink-soft md:flex-row md:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-base font-semibold text-ink">The Level Up Manual</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            A book-like distillation of twenty-eight self-development trainings, every
            notable claim graded against the research it cites. Built for the reader who
            checks the evidence.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <span className="font-display uppercase tracking-[0.2em] text-gold">Browse</span>
          <Link className="hover:text-gold" href="/chapters/">Table of Contents</Link>
          <Link className="hover:text-gold" href="/audit/">Verification Audit</Link>
          <Link className="hover:text-gold" href="/protocols/">13 Protocols</Link>
          <Link className="hover:text-gold" href="/roadmap/">90-Day Roadmap</Link>
          <Link className="hover:text-gold" href="/research/">Research Notes</Link>
        </div>
        <div className="flex flex-col gap-2 text-xs">
          <span className="font-display uppercase tracking-[0.2em] text-gold">Read</span>
          <Link className="hover:text-gold" href="/glossary/">Glossary</Link>
          <Link className="hover:text-gold" href="/quotes/">Quote Library</Link>
          <Link className="hover:text-gold" href="/search/">Search</Link>
          <Link className="hover:text-gold" href="/progress/">Reading Progress</Link>
        </div>
      </div>
      <div className="border-t border-line/60 py-4 text-center text-[11px] text-ink-faint">
        Grades are honest, claims are sourced, protocols are testable. Read, verify, apply.
      </div>
      <div className="pb-4 text-center text-[11px] text-ink-faint">
        Built by Hustlenix · © 2026 · CC BY-NC 4.0
      </div>
    </footer>
  );
}