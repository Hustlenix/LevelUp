import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { PageShell, SectionHeading } from "@/components/ui";
import { canonical } from "@/lib/site";
import ProtocolsListInteractive from "@/components/ProtocolsListInteractive";

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
        lede="Each protocol turns a chapter's central idea into a named, repeatable practice. Click 'Run Interactive Protocol' to execute any protocol with guided timers, distraction pads, and input logs."
      />

      <ProtocolsListInteractive protocols={protocols} />
    </PageShell>
  );
}