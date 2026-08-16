import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "The 90-Day Roadmap",
  description: "Three phases — Foundation, Identity and Intensity, Subtraction and Expansion — that sequence the 13 protocols.",
  alternates: { canonical: canonical("/roadmap/") },
};

const PHASE_COLORS = [
  "border-health/50",
  "border-self/50",
  "border-wealth/50",
];

export default function RoadmapPage() {
  const { roadmap, protocols } = getSiteData();
  const protocolTitles = new Map(protocols.map((p) => [p.num, p.title]));

  return (
    <PageShell>
      <SectionHeading
        eyebrow="The 90-Day Roadmap"
        title="How the manual becomes a life"
        lede="Ninety days, three phases, thirteen protocols. The roadmap orders them so each practice settles before the next begins — one at a time, at 70% scale, with a zero-day floor."
      />

      <div className="relative space-y-10">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-gold/40 sm:left-[27px]" />
        {roadmap.phases.map((phase, i) => (
          <section key={phase.phase} className="relative pl-12 sm:pl-16">
            <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold bg-paper font-display text-lg font-bold text-gold sm:h-14 sm:w-14 sm:text-2xl">
              {phase.phase}
            </div>
            <div className={`rounded-xl border bg-card p-6 ${PHASE_COLORS[i] ?? "border-line"}`}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="font-display text-2xl font-bold text-ink">{phase.title}</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">{phase.days}</span>
                <span className="rounded-full bg-paper-deep px-3 py-1 text-[11px] uppercase tracking-wider text-ink-soft">
                  {phase.focus}
                </span>
              </div>
              <ol className="mt-4 space-y-2.5">
                {phase.items.map((item, j) => {
                  const protoMatch = item.match(/\((\d+\.\d+)\)/);
                  return (
                    <li key={j} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-[11px] font-bold text-gold">
                        {j + 1}
                      </span>
                      <span>
                        {item}
                        {protoMatch && protocolTitles.has(protoMatch[1]) && (
                          <span className="ml-1.5 text-xs italic text-ink-faint">
                            — {protocolTitles.get(protoMatch[1])}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 rounded-lg border-l-2 border-gold bg-paper-deep/60 px-4 py-3 text-sm italic leading-relaxed text-ink-soft">
                {phase.milestone}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-line bg-paper-deep/50 p-6">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Ground rules
        </p>
        <ul className="mt-3 space-y-2">
          {roadmap.rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
              <span className="text-gold">◆</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}