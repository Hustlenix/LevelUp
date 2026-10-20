import type { Metadata } from "next";
import LifeToday from "@/components/app/LifeToday";

export const metadata: Metadata = {
  title: "Today",
  description: "A local-first command center for today's outcome, sessions, progress, and recovery.",
  alternates: { canonical: "/today/" },
  robots: { index: false, follow: false },
};

export default function TodayPage() {
  return <LifeToday />;
}
