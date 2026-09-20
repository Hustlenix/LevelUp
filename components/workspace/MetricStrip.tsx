export interface MetricStripItem {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricStrip({ items }: { items: MetricStripItem[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">{item.label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{item.value}</p>
          {item.detail ? <p className="mt-1 text-xs text-ink-soft">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
