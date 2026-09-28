import type { Metadata } from "next";
import OnboardingFlow from "@/components/app/OnboardingFlow";

export const metadata: Metadata = { title: "Set your direction", description: "Create a private, personalized LevelUp starter path.", robots: { index: false, follow: false } };

export default function OnboardingPage() { return <OnboardingFlow />; }
