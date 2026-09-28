import type { Metadata } from "next";
import JourneyView from "@/components/JourneyView";

export const metadata: Metadata = {
  title: "Journey",
  description: "Your daily missions, active plan, and the roadmap between you and your goals.",
  alternates: { canonical: "/journey/" },
  robots: { index: false, follow: false },
};

export default function JourneyPage() {
  return <JourneyView />;
}