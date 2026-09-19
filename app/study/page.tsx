import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import StudyHome from "@/components/study/StudyHome";

export const metadata: Metadata = {
  title: "Study Mode",
  description:
    "Turn The Level Up Manual into a daily practice: a personal study plan, a daily mission, streak and XP tracking, and a schedule that fits your week.",
  alternates: { canonical: "/study/" },
  openGraph: {
    title: "Study Mode — The Level Up Manual",
    description:
      "Turn The Level Up Manual into a daily practice: a personal study plan, a daily mission, streak and XP tracking, and a schedule that fits your week.",
    url: `${SITE_URL}/study/`,
  },
};

export default function StudyPage() {
  const data = getSiteData();
  return <StudyHome data={data} />;
}
