"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLifeStore } from "@/lib/life";

export default function LaunchPage() {
  const state = useLifeStore();
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(state.profile ? "/today/" : "/onboarding/"), 0);
    return () => window.clearTimeout(timer);
  }, [router, state.profile]);
  return <div className="app-launch" aria-live="polite"><span>L</span><div><h1>LevelUp</h1><small>Preparing your next useful step…</small></div></div>;
}
