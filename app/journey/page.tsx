import type { Metadata } from "next";
import JourneyView from "@/components/app/JourneyView";
export const metadata: Metadata = { title: "Journey", description: "Your visible LevelUp skill paths and next checkpoints.", robots: { index: false, follow: false } };
export default function JourneyPage() { return <JourneyView />; }
