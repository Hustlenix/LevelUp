"use client";

import { useEffect, useMemo } from "react";
import { useProgressStore } from "@/lib/progress";
import { useHighlightsStore, useQuizStore, useReflectionsStore, useStreakStore } from "@/lib/activity";
import { badgesFor, computeXp, levelFor, type GamificationState } from "@/lib/gamification";

const BADGES_KEY = "levelup-badges-v1";

function readBadges(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(BADGES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function GamificationPanel() {
  const progress = useProgressStore();
  const highlights = useHighlightsStore();
  const quiz = useQuizStore();
  const reflections = useReflectionsStore();
  const streak = useStreakStore();

  const state: GamificationState = useMemo(
    () => ({
      completedSlugs: Object.keys(progress).filter((s) => progress[s]?.complete),
      quizResults: quiz,
      highlightCount: highlights.length,
      reflectionCount: Object.keys(reflections).length,
      streak,
    }),
    [progress, highlights, quiz, reflections, streak]
  );

  const xp = useMemo(() => computeXp(state), [state]);
  const level = useMemo(() => levelFor(xp), [xp]);
  const { badges, store, changed } = useMemo(
    () => badgesFor(state, readBadges(), localToday()),
    [state]
  );

  useEffect(() => {
    if (!changed) return;
    try {
      window.localStorage.setItem(BADGES_KEY, JSON.stringify(store));
    } catch {
      /* storage unavailable */
    }
  }, [changed, store]);

  const barPct = Math.round(level.progress * 100);
  const toNext =
    level.next === null ? null : (level.next - level.xp === 0 ? 0 : level.next - level.xp);

  return (
    <div className="mt-8 rounded-xl border border-line bg-card p-6">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        Level &amp; badges
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-bold text-ink">
            {level.name} <span className="text-sm font-normal text-ink-faint">· Level {level.index + 1}</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {xp} XP
            {toNext !== null && toNext > 0
              ? ` · ${toNext} XP to the next level`
              : " · max level reached"}
          </p>
        </div>
        <p className="text-sm text-ink-soft">
          Day {streak.current}
          {streak.best > streak.current ? ` · best ${streak.best}` : ""}
        </p>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${barPct}%` }} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-lg border p-3 transition-colors ${
              b.unlocked ? "border-gold/50 bg-paper-deep/60" : "border-line bg-paper opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-semibold text-ink">{b.name}</p>
              {b.unlocked ? (
                <span className="text-[10px] uppercase tracking-wider text-gold">Earned</span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-ink-faint">Locked</span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-soft">{b.blurb}</p>
            <p className="mt-1 text-[10px] text-ink-faint">
              {b.unlocked && b.unlockDate ? `${b.unlockDate} · ` : ""}
              {b.rule}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}