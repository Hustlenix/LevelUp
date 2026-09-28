import type { Metadata } from "next";
import ProfileView from "@/components/ProfileView";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your study profile — identity, schedule, and preferences, stored locally on this device.",
  alternates: { canonical: "/profile/" },
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileView />;
}