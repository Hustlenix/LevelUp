"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useStudentProfile,
  todayMission,
  TIER_WORDS,
  getProfileAgeTier,
} from "@/lib/studentProfile";
import { levelFor } from "@/lib/gamification";

export default function MissionCard({ xp }: { xp: number }) {
  const profile = useStudentProfile();
  const [sessionsToday, setSessionsToday] = useState(0);
  const now = new Date();
  const mission = todayMission(profile, now);
  const tier = getProfileAgeTier(profile);
  const level = levelFor(xp);

  if (!profile.onboarded) {
    return (
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Your Study Mode is ready when you are
        </h2>
        <p className="mt-2 text-ink-soft">
          Set up subjects, schedule and goals to get a personalized mission every day.
        </p>
        <Link
          href="/study/onboarding/"
          className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 font-medium text-paper hover:bg-gold-deep"
        >
          Set up study plan
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-label="Today's Mission">
      <p
        className={`font-display text-xs font-semibold uppercase tracking-[0.25em] ${
          tier === "child" ? "text-ink-soft" : "text-gold"
        }`}
      >
        {TIER_WORDS[tier].greeting}
        {profile.identity.name ? `, ${profile.identity.name}` : ""} — Today&apos;s Mission
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        {mission.label}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        {mission.revision && (
          <span className="rounded-full border border-rose/40 bg-rose/5 px-3 py-1 text-rose">
            Revision mode
          </span>
        )}
        <span className="rounded-full border border-line bg-paper-deep px-3 py-1">
          {mission.minutes} min
        </span>
        {mission.isOffDay && (
          <span className="rounded-full border border-line bg-paper-deep px-3 py-1">Off day</span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSessionsToday((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-medium text-paper transition-colors hover:bg-gold-deep"
        >
          +1 session done
        </button>
        <span className="text-sm text-ink-soft">
          {sessionsToday > 0
            ? `${sessionsToday} session${sessionsToday === 1 ? "" : "s"} today`
            : "Track a completed session"}
        </span>
      </div>
      {level.next && (
        <p className="mt-4 text-xs text-ink-faint">
          Level {level.name} · {level.next - xp} XP to {levelFor(level.next).name}
        </p>
      )}
    </section>
  );
}
