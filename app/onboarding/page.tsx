import type { Metadata } from "next";
import LifeOSOnboarding from "@/components/LifeOSOnboarding";

export const metadata: Metadata = {
  title: "Set up your study OS",
  description: "A few quick questions to personalize your study plan. Everything stays on this device.",
  alternates: { canonical: "/onboarding/" },
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <LifeOSOnboarding />;
}