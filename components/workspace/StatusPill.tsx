import type { ReactNode } from "react";

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "active" | "success" | "warning" }) {
  const tones = {
    neutral: "border-line bg-paper-deep text-ink-faint",
    active: "border-gold/40 bg-gold/10 text-gold-deep",
    success: "border-emerald-700/30 bg-emerald-700/10 text-emerald-800",
    warning: "border-amber-700/30 bg-amber-700/10 text-amber-800",
  };
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}
