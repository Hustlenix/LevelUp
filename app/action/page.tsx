import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { PageShell } from "@/components/ui";
import { canonical } from "@/lib/site";
import DailyActionHub from "@/components/DailyActionHub";

export const metadata: Metadata = {
  title: "Daily Action Operating System",
  description: "Execute interactive protocols, run deep-work focus blocks, calibration routines, and 4-pillar floor tracking.",
  alternates: { canonical: canonical("/action/") },
};

export default function ActionPage() {
  const { protocols } = getSiteData();

  return (
    <PageShell>
      <DailyActionHub protocols={protocols} />
    </PageShell>
  );
}
