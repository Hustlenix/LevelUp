import type { ReactNode } from "react";

export function WorkspaceHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-gold">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
