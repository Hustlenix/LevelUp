import type { ReactNode } from "react";

export function WorkspaceHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
