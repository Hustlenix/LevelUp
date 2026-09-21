import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { canonical } from "@/lib/site";
import ProtocolsListInteractive from "@/components/ProtocolsListInteractive";
import PracticeLibrary from "@/components/PracticeLibrary";

export const metadata: Metadata = {
  title: "Practice Plans & Protocols",
  description: "Start with a ready-to-use practice plan, or explore the thirteen original chapter protocols.",
  alternates: { canonical: canonical("/protocols/") },
};

export default function ProtocolsPage() {
  const { protocols } = getSiteData();
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Practice library"
        title="Ideas you can run"
        lede="Begin with one small, guided plan. The original chapter protocols are here when you want to go deeper."
      />

      <a href="#original-protocols" className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline underline-offset-4">Skip to the 13 original protocols ↓</a>
      <PracticeLibrary />
      <section id="original-protocols" className="scroll-mt-28" aria-labelledby="original-protocols-heading">
        <h2 id="original-protocols-heading" className="mb-5 font-display text-2xl font-semibold">The 13 original protocols</h2>
        <ProtocolsListInteractive protocols={protocols} />
      </section>
    </PageShell>
  );
}
