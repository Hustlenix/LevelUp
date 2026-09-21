export interface MetricStripItem {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricStrip({ items }: { items: MetricStripItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-3 py-5 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint sm:text-xs">{item.label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink">{item.value}</p>
          {item.detail ? <p className="mt-1 text-[11px] leading-relaxed text-ink-soft sm:text-xs">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
