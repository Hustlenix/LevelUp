import type { Metadata } from "next";
import ProfileView from "@/components/app/ProfileView";
export const metadata: Metadata = { title: "Profile", description: "Your private LevelUp identity, skills, companion, and achievements.", robots: { index: false, follow: false } };
export default function ProfilePage() { return <ProfileView />; }
