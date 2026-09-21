import type { ReactNode } from "react";
import { ActionLink } from "./ActionButton";
import { StatusPill } from "./StatusPill";

export function PrimaryActionCard({ eyebrow = "Next action", title, description, meta, href, actionLabel = "Start", children }: { eyebrow?: string; title: string; description: string; meta?: string; href: string; actionLabel?: string; children?: ReactNode }) {
  return (
    <section className="editorial-hero panel-shadow relative overflow-hidden rounded-2xl border border-gold/30 p-6 sm:p-9">
      <div className="absolute inset-y-0 left-0 w-1 bg-gold" aria-hidden="true" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">{title}</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-ink-soft">{description}</p>
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
