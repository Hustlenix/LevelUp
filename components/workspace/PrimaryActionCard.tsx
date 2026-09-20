import type { ReactNode } from "react";
import { ActionLink } from "./ActionButton";
import { StatusPill } from "./StatusPill";

export function PrimaryActionCard({ eyebrow = "Next action", title, description, meta, href, actionLabel = "Start", children }: { eyebrow?: string; title: string; description: string; meta?: string; href: string; actionLabel?: string; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-gold/50 bg-card p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{description}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          {meta ? <StatusPill tone="active">{meta}</StatusPill> : null}
          <ActionLink href={href}>{actionLabel}<span aria-hidden="true">→</span></ActionLink>
        </div>
      </div>
    </section>
  );
}
