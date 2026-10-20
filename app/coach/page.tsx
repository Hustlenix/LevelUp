import type { Metadata } from "next";
import CoachView from "@/components/app/CoachView";
export const metadata: Metadata = { title: "Coach", description: "Contextual local coaching based on your real LevelUp progress.", robots: { index: false, follow: false } };
export default function CoachPage() { return <CoachView />; }
