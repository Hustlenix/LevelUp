import type { Metadata } from "next";
import { getSiteData } from "@/lib/content";
import { buildContentDocuments } from "@/lib/ai/retrieval";
import CoachView from "@/components/CoachView";

export const metadata: Metadata = {
  title: "Coach — LevelUp",
  description:
    "Ask what to focus on next, and get an answer grounded in your saved plan, goals, and progress.",
  alternates: { canonical: "/coach/" },
  robots: { index: false, follow: false },
};

/** Coach page: a focused AI advisor panel, grounded in the site's content. */
export default async function CoachPage() {
  const data = await getSiteData();
  const documents = buildContentDocuments(data);
  return <CoachView documents={documents} />;
}