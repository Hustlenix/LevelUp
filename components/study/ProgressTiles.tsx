"use client";

import {
  useStudentProfile,
  nearestExam,
  getProfileAgeTier,
} from "@/lib/studentProfile";
import { levelFor } from "@/lib/gamification";
import { useProgressStore, overallStats } from "@/lib/progress";

export default function ProgressTiles({
  streak,
  xp,
  totalChapters,
}: {
  streak: number;
  xp: number;
  totalChapters: number;
}) {
  const profile = useStudentProfile();
  const progress = useProgressStore();
  const tier = getProfileAgeTier(profile);
  const level = levelFor(xp);
  const stats = overallStats(progress, totalChapters);
  const exam = nearestExam(profile, new Date());

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Streak", value: `${streak} day${streak === 1 ? "" : "s"}` },
    { label: "Level", value: level.name, hint: `${xp} XP` },
    { label: "Book progress", value: `${stats.pct}%` },
  ];
  if (exam) {
    tiles.push({
      label: "Next exam",
      value: exam.days === 0 ? "Today" : `${exam.days} day${exam.days === 1 ? "" : "s"}`,
      hint: `Prep for your upcoming exam`,
    });
  }

  return (
    <section aria-label="Your progress" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-card p-4">
          <p className={`text-[11px] font-medium uppercase tracking-wider ${tier === "child" ? "text-ink-faint text-xs" : "text-ink-faint"}`}>
            {t.label}
          </p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{t.value}</p>
          {t.hint ? <p className="mt-0.5 text-xs text-ink-soft">{t.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}
