import type { Metadata } from "next";
import HabitsView from "@/components/HabitsView";

export const metadata: Metadata = {
  title: "Habits",
  description: "The small repeatable actions that hold the rest together — schedule, streaks, and this week's record.",
  alternates: { canonical: "/habits/" },
  robots: { index: false, follow: false },
};

export default function HabitsPage() {
  return <HabitsView />;
}