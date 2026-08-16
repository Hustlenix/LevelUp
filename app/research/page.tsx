import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { BookMarkdown } from "@/components/Markdown";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research Notes",
  description: "The full verification document behind every grade on this site.",
  alternates: { canonical: canonical("/research/") },
};

export default function ResearchPage() {
  const { audit } = getSiteData();
  const researchPath = join(process.cwd(), "content", "research", "belief-reality-research.md");
  const body = readFileSync(researchPath, "utf8");
  const claimCount = audit.length;

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Research Notes"
        title="The source document"
        lede={`This is the full working document behind the site: every one of the ${claimCount} claims in the audit, the thirteen protocols, the roadmap, and the source list, with full citations. It is the raw material; the site is its distillation.`}
      />
      <div className="rounded-xl border border-line bg-card p-6 sm:p-10">
        <BookMarkdown body={body} />
      </div>
    </PageShell>
  );
}