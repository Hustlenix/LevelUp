import type { Metadata } from "next";
import LevelUpOSWorkspace from "@/components/LevelUpOSWorkspace";

export const metadata: Metadata = {
  title: "Review",
  description: "Review local completion evidence and recover from unfinished sessions without punishment.",
  alternates: { canonical: "/review/" },
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return <LevelUpOSWorkspace mode="review" />;
}
