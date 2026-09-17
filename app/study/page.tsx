import { getSiteData } from "@/lib/content";
import StudyHome from "@/components/study/StudyHome";

export const metadata = { title: "Study Mode" };

export default function StudyPage() {
  const data = getSiteData();
  return <StudyHome totalChapters={data.chapters.length} />;
}