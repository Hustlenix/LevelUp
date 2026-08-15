import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { GradeBadge, PageShell, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verification Audit",
  description: "Every notable claim from the 28 trainings, graded against the research.",
};

const GRADE_LABEL: Record<string, string> = {
  A: "Solid — well-replicated research supports the claim.",
  B: "Good — real support, with caveats about size, population, or context.",
  C: "Mixed — plausible and partially supported, but the training overstates it.",
  D: "Weak — the cited research does not support the claim as stated.",
  U: "Unverifiable — no source found; treated as metaphor.",
};

export default function AuditPage() {
  const { audit, chapters } = getSiteData();
  const byGrade = audit.reduce<Record<string, number>>((acc, a) => {
    acc[a.grade] = (acc[a.grade] ?? 0) + 1;
    return acc;
  }, {});
  const gradeOrder = ["A", "B", "C", "D", "U"];

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Verification Audit"
        title="Every claim, graded"
        lede="The trainings make roughly thirty notable empirical claims. Each one below is graded against the actual research, not the training's description of it. A grade is a statement about the evidence, not about whether the practice is useful."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {gradeOrder.map((g) => (
          <div key={g} className="flex items-center gap-3 rounded-xl border border-line bg-white/40 px-4 py-3">
            <GradeBadge grade={g} />
            <div>
              <p className="font-display text-xl font-bold leading-none text-ink">{byGrade[g] ?? 0}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-faint">claims</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10 rounded-xl border border-line bg-paper-deep/60 p-5 text-sm leading-relaxed text-ink-soft">
        {gradeOrder.map((g) => (
          <p key={g} className="mb-1.5 last:mb-0">
            <span className="mr-2 inline-block">
              <GradeBadge grade={g} />
            </span>
            <span className="align-middle">{GRADE_LABEL[g]}</span>
          </p>
        ))}
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
          Grades are assigned per claim by a careful reading of the cited source. Where the
          training misquotes or overstates a source, the verdict says so plainly — the
          practice can still be worth keeping, but the story should not be.
        </p>
      </div>

      <div className="grid gap-3">
        {audit.map((a) => {
          const anchor = `claim-${a.id.replace(".", "-")}`;
          return (
            <details
              key={a.id}
              id={anchor}
              className="group rounded-xl border border-line bg-white/40 open:border-gold/60"
            >
              <summary className="flex cursor-pointer items-start gap-4 p-4 marker:content-none">
                <span className="mt-0.5 shrink-0">
                  <GradeBadge grade={a.grade} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-wider text-ink-faint">
                    Claim {a.id} · {a.category}
                  </span>
                  <span className="mt-0.5 block font-display text-base font-semibold text-ink">
                    {a.claim}
                  </span>
                </span>
                <span className="mt-1 shrink-0 text-xs uppercase tracking-wider text-ink-faint">
                  {a.verdict}
                </span>
                <span className="mt-1 shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="border-t border-line/60 px-4 py-4 pl-[4.25rem]">
                <p className="text-sm leading-relaxed text-ink-soft">{a.detail}</p>
                {a.citation && (
                  <p className="mt-3 border-l-2 border-gold pl-3 text-xs leading-relaxed text-ink-faint">
                    Source: {a.citation}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-ink-faint">
        Cross-reference: {chapters.length} chapters cite these claims; the full research
        notes are on the <a className="text-gold underline-offset-2 hover:underline" href="/research/">Research</a> page.
      </p>
    </PageShell>
  );
}