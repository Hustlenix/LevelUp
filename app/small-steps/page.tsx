import type { Metadata } from "next";
import SmallSteps from "@/components/SmallSteps";
export const metadata: Metadata = { title: "Small Steps", description: "Start with one small action, take a break, and keep your place.", robots: { index: false, follow: false } };
export default function SmallStepsPage() { return <SmallSteps />; }
