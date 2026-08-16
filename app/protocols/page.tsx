import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "The 13 Protocols",
  description: "Thirteen named, testable protocols distilled from the 28 trainings.",
  alternates: { canonical: canonical("/protocols/") },
};

export default function ProtocolsPage() {
  const { protocols } = getSiteData();
  return (
    <PageShell>
      <SectionHeading
        eyebrow="The 13 Protocols"
        title="Ideas you can run"
        lede="Each protocol turns a chapter's central idea into a named, repeatable practice. Run one at a time, at 70% scale, with a zero-day floor — then log the inputs."
      />

      <div className="space-y-6">
        {protocols.map((p) => {
          const anchor = `protocol-${p.num.replace(".", "-")}`;
          return (
            <section key={p.num} id={anchor} className="rounded-xl border border-line bg-card p-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-lg font-bold text-gold">{p.num}</span>
                <h2 className="font-display text-xl font-bold text-ink">{p.title}</h2>
                {p.duration && (
                  <span className="ml-auto rounded-full border border-line bg-paper-deep px-3 py-1 text-[11px] uppercase tracking-wider text-ink-faint">
                    {p.duration}
                  </span>
                )}
              </div>
              {p.purpose && <p className="mt-2 font-display italic text-ink-soft">{p.purpose}</p>}

              {p.steps.length > 0 && (
                <ol className="mt-4 space-y-2.5">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-[11px] font-bold text-gold">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {p.evidence && p.evidence.length > 0 && (
                <div className="mt-4 rounded-lg bg-paper-deep/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Why it works</p>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink-soft">
                    {p.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gold">◆</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}