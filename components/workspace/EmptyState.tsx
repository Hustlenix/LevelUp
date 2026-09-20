import type { ReactNode } from "react";
import { ActionLink } from "./ActionButton";
import { SectionCard } from "./SectionCard";

export function EmptyState({ eyebrow = "Nothing here yet", title, description, href, actionLabel, children }: { eyebrow?: string; title: string; description: string; href?: string; actionLabel?: string; children?: ReactNode }) {
  return (
    <SectionCard className="border-dashed">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
      {href && actionLabel ? <ActionLink href={href} className="mt-5">{actionLabel}<span aria-hidden="true">→</span></ActionLink> : null}
    </SectionCard>
  );
}
