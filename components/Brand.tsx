import Link from "next/link";

export default function Brand() {
  return <Link href="/" aria-label="LevelUp home" className="inline-flex shrink-0 items-center gap-2.5 text-xl font-bold tracking-[-0.05em] text-ink"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>LevelUp</Link>;
}
