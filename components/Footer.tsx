"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "@/components/Brand";
export default function Footer() {
  const home = usePathname() === "/";
  if (!home) return <footer className="workspace-footer mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs text-ink-faint sm:px-8 no-print"><span>LevelUp · The manual & workspace</span><div className="flex gap-5"><Link href="/privacy/">Privacy</Link><Link href="/backup/">Back up your progress</Link><Link href="/devlog/">What’s new</Link></div></footer>;
  return <footer className="border-t border-line bg-card no-print">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-[2fr_1fr_1fr] sm:px-8">
      <div><Brand /><p className="mt-4 max-w-xs text-sm leading-6 text-ink-soft">Evidence-audited lessons. Practical tools.<br />A local record of the work you do.</p></div>
      <div className="flex flex-col items-start gap-3 text-sm text-ink-soft"><p className="mb-1 text-xs font-semibold text-ink">MAKE IT A PRACTICE</p><Link href="/today/">Your daily workspace</Link><Link href="/chapters/">The lesson library</Link><Link href="/protocols/">Guided practice plans</Link><Link href="/journey/">Your journey</Link></div>
      <div className="flex flex-col items-start gap-3 text-sm text-ink-soft"><p className="mb-1 text-xs font-semibold text-ink">A CLOSER LOOK</p><Link href="/audit/">The evidence</Link><Link href="/research/">Research notes</Link><Link href="/privacy/">Privacy & your data</Link><Link href="/devlog/">What’s new</Link></div>
    </div>
    <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-line px-5 py-6 text-xs text-ink-faint sm:px-8"><span>© 2026 Hustlenix · LevelUp</span><span>Shared under CC BY-NC 4.0.</span></div>
  </footer>;
}
