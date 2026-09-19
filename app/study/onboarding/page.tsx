import type { Metadata } from "next";
import OnboardingWizard from "@/components/study/OnboardingWizard";

export const metadata: Metadata = {
  title: "Set up Study Mode",
  description:
    "Set your name, age, subjects, and a weekly study schedule to create your Study Mode plan.",
  alternates: { canonical: "/study/onboarding/" },
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}