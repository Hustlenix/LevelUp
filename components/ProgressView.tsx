"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Chapter } from "@/lib/types";
import { markComplete, overallStats, resetProgress, useProgressStore, getProgressSnapshot, restoreProgress } from "@/lib/progress";
import { getBookmarksSnapshot, restoreBookmarks } from "@/lib/bookmarks";
import {
  getHighlightsSnapshot,
  getQuizSnapshot,
  getReflectionsSnapshot,
  getStreakSnapshot,
  restoreHighlights,
  restoreQuiz,
  restoreReflections,
  restoreStreak,
} from "@/lib/activity";
import { buildBackup, restoreBackupAtomically, validateBackup, type BackupState } from "@/lib/backup";
import { reloadActionToolsCaches } from "@/lib/actionTools";
import { localToday } from "@/lib/dates";
import { toBackupPayload, fromBackupPayload } from "@/lib/studentProfile";
import { PillarTag } from "@/components/ui";
import { useGamification } from "@/lib/useGamification";
import { computeLifeosBadges, computeProgression } from "@/lib/progression";
import { useClientToday } from "@/lib/clientToday";
import GamificationPanel from "@/components/GamificationPanel";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { getOSStateSnapshot, restoreOSState, useOSStore } from "@/lib/os/store";
import { getPortfolioSnapshot, restorePortfolioArtifacts } from "@/lib/portfolio";
import { deriveLocalPatterns } from "@/lib/os/patterns";
import { MetricStrip, WorkspaceHeader } from "@/components/workspace";
import { getNotificationStateSnapshot, restoreNotificationState } from "@/lib/notifications";
import { getExperimentsSnapshot, restoreExperiments } from "@/lib/experiments";
import { getHabitsBackupSnapshot, restoreHabits } from "@/lib/habitsStore";
import { getSmallStepsBackup, reloadSmallSteps } from "@/lib/smallStepsStore";
import { getPracticeDraftsBackup, reloadPracticeDrafts } from "@/lib/practiceDraftsStore";

const THEME_KEY = "levelup-theme";
const SCALE_KEY = "levelup-reader-scale";

export default function ProgressView({ chapters }: { chapters: Chapter[] }) {
  const map = useProgressStore();
  const osState = useOSStore();
  const gamification = useGamification();
  const date = useClientToday();
  // computeProgression needs a real date (parseDay("") throws); useClientToday
  // returns "" during static prerender, so derive once the client date snaps in.
  const progression = date ? computeProgression(osState, gamification.state, date) : null;
  const badges = progression ? computeLifeosBadges(progression) : null;
  const patterns = deriveLocalPatterns(osState, localToday());
  const stats = overallStats(map, chapters.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const onExport = () => {
    let actionState: BackupState["actionState"] = undefined;
    try {
      actionState = {
        pillarsHistory: JSON.parse(localStorage.getItem("levelup-pillar-floors-v1") || "{}"),
        focusSessions: JSON.parse(localStorage.getItem("levelup-focus-sessions-v1") || "[]"),
        protocolLogs: JSON.parse(localStorage.getItem("levelup-protocol-logs-v1") || "[]"),
        urgesLog: JSON.parse(localStorage.getItem("levelup-urge-pauses-v1") || "[]"),
        calibrations: JSON.parse(localStorage.getItem("levelup-daily-calibration-v1") || "{}"),
      };
    } catch {
      /* ignore storage read error */
    }

    const state: BackupState = {
      theme: document.documentElement.getAttribute("data-theme"),
      readerScale: document.documentElement.getAttribute("data-reader-scale"),
      progress: getProgressSnapshot(),
      bookmarks: [...getBookmarksSnapshot()],
      highlights: getHighlightsSnapshot(),
      quiz: getQuizSnapshot(),
      reflections: getReflectionsSnapshot(),
      streak: getStreakSnapshot(),
      studentProfile: toBackupPayload() ?? undefined,
      actionState,
      habits: getHabitsBackupSnapshot(),
      smallSteps: getSmallStepsBackup(),
      practiceDrafts: getPracticeDraftsBackup(),
      osState: getOSStateSnapshot(),
       portfolio: getPortfolioSnapshot(),
       notifications: getNotificationStateSnapshot(),
       experiments: getExperimentsSnapshot(),
    };
    const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `levelup-backup-v1-${localToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent(ANALYTICS_EVENTS.backupExported);
  };

  const onImportFile = (file: File) => {
    setImportError(null);
    setImported(false);
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        setImportError("That file is not valid JSON.");
        return;
      }
      const res = validateBackup(parsed);
      if (!res.ok || !res.data) {
        setImportError(res.errors.join(" "));
        return;
      }
      const d = res.data;
      const atomicRestore = restoreBackupAtomically(d, window.localStorage);
      if (!atomicRestore.ok) {
        setImportError(atomicRestore.error ?? "Backup restore failed; your previous local state was kept.");
        return;
      }
      restoreProgress(d.progress);
      restoreHabits(d.habits);
      reloadSmallSteps();
      reloadPracticeDrafts();
      restoreBookmarks(d.bookmarks);
      restoreHighlights(d.highlights);
      restoreQuiz(d.quiz);
      restoreReflections(d.reflections);
      if (d.streak) restoreStreak(d.streak);
      if (d.studentProfile !== undefined) fromBackupPayload(d.studentProfile);
      if (d.osState !== undefined) restoreOSState(d.osState);
       if (d.portfolio !== undefined) restorePortfolioArtifacts(d.portfolio);
       if (d.notifications !== undefined) restoreNotificationState(d.notifications);
       if (d.experiments !== undefined) restoreExperiments(d.experiments);
      if (d.actionState) {
        try {
          if (d.actionState.pillarsHistory) {
            localStorage.setItem("levelup-pillar-floors-v1", JSON.stringify(d.actionState.pillarsHistory));
          }
          if (d.actionState.focusSessions) {
            localStorage.setItem("levelup-focus-sessions-v1", JSON.stringify(d.actionState.focusSessions));
          }
          if (d.actionState.protocolLogs) {
            localStorage.setItem("levelup-protocol-logs-v1", JSON.stringify(d.actionState.protocolLogs));
          }
          if (d.actionState.urgesLog) {
            localStorage.setItem("levelup-urge-pauses-v1", JSON.stringify(d.actionState.urgesLog));
          }
          if (d.actionState.calibrations) {
            localStorage.setItem("levelup-daily-calibration-v1", JSON.stringify(d.actionState.calibrations));
          }
          reloadActionToolsCaches();
        } catch {
          /* ignore storage write error */
        }
      }
      if (d.theme) {
        document.documentElement.setAttribute("data-theme", d.theme);
        try {
          window.localStorage.setItem(THEME_KEY, d.theme);
        } catch {
          /* storage unavailable */
        }
      }
      if (d.readerScale) {
        document.documentElement.setAttribute("data-reader-scale", d.readerScale);
        try {
          window.localStorage.setItem(SCALE_KEY, d.readerScale);
        } catch {
          /* storage unavailable */
        }
      }
      setImported(true);
      trackEvent(ANALYTICS_EVENTS.backupImported);
    };
    reader.readAsText(file);
  };

  const last7 = progression?.last7 ?? [];
  const weekPeak = Math.max(1, ...last7.map((d) => d.xp));

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <WorkspaceHeader eyebrow="Your record" title="Progress" description="Chapters read, time focused, and work completed. Based on your recorded activity—not estimates." />

      <MetricStrip items={[{ label: "Level", value: progression ? String(progression.level) : "—", detail: progression ? `${progression.xp} XP recorded` : "Loading your record" }, { label: "Streak", value: progression ? String(progression.streak.current) : "—", detail: progression ? `best ${progression.streak.best} days` : undefined }, { label: "Focus", value: progression ? `${Math.round(progression.totalMinutes)}m` : "—", detail: progression ? `${progression.totalSessions} completed sessions` : undefined }]} />

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-ink">Reading progress</h2>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-display text-5xl font-bold text-ink">{stats.pct}%</span>
          <span className="text-sm text-ink-faint">
            {stats.done} of {chapters.length} chapters complete
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      {progression ? (
        <>
          <section className="mt-8 rounded-xl border border-line bg-card p-6" aria-labelledby="progression-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="progression-heading" className="font-display text-2xl font-bold tracking-tight text-ink">
                {progression.title}
              </h2>
              <p className="text-sm text-ink-soft">
                {progression.xp} XP · {progression.totalSessions} sessions · {Math.round(progression.totalMinutes / 60)}h focused
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progression.bounds.pct}%` }} />
            </div>
            {progression.bounds.next !== null ? (
              <p className="mt-2 text-xs text-ink-faint">
                {progression.bounds.into} of {progression.bounds.next - progression.bounds.floor} XP into level{" "}
                {progression.level + 1}
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-faint">Maximum level reached.</p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Skills</p>
                <ul className="mt-3 space-y-3">
                  {progression.skills.slice(0, 3).map((skill) => (
                    <li key={skill.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-ink">{skill.label}</span>
                        <span className="text-xs text-ink-faint">
                          Lv {skill.level} · {skill.xp} XP
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-gold/70" style={{ width: `${skill.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  Last 7 days
                </p>
                <div className="mt-3 flex h-24 items-end gap-1.5" role="img" aria-label="XP earned per day over the last 7 days">
                  {last7.map((day) => (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-sm ${day.xp > 0 ? "bg-gold/80" : "bg-line"}`}
                        style={{ height: `${Math.max(4, Math.round((day.xp / weekPeak) * 64))}px` }}
                        title={`${day.date}: ${day.xp} XP`}
                      />
                      <span className="text-[0.5625rem] text-ink-faint">{day.date.slice(8)}</span>
                    </div>
                  ))}
                </div>
                {progression.weekSum.xp > 0 ? (
                  <p className="mt-2 text-xs text-ink-soft">
                    This week: {progression.weekSum.xp} XP · {progression.weekSum.sessions} sessions ·{" "}
                    {progression.weekSum.minutes} minutes
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {badges ? (
            <details className="mt-8 border-y border-line py-4">
              <summary className="min-h-11 font-display text-xl font-semibold leading-[44px] text-ink">Milestones</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      b.unlocked ? "border-gold/50 bg-paper-deep/60" : "border-line bg-paper opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold text-ink">{b.name}</p>
                      <span className={`text-[0.625rem] uppercase tracking-wider ${b.unlocked ? "text-gold" : "text-ink-faint"}`}>
                        {b.unlocked ? "Earned" : "Locked"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{b.blurb}</p>
                    <p className="mt-1 text-[0.625rem] text-ink-faint">{b.rule}</p>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-line bg-card p-6">
          <p className="text-sm text-ink-faint" role="status">
            Deriving your LifeOS progression…
          </p>
        </div>
      )}

      <details className="mt-4 border-b border-line pb-4"><summary className="min-h-11 font-display text-xl font-semibold leading-[44px] text-ink">Reading badges</summary><GamificationPanel /></details>

      <section className="mt-8 rounded-xl border border-line bg-card p-6">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Local patterns</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-ink">What your record suggests</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {patterns.map((pattern) => <article key={pattern.id} className="rounded-lg border border-line bg-paper p-3"><p className="text-sm font-semibold text-ink">{pattern.title}</p><p className="mt-1 text-xs leading-relaxed text-ink-soft">{pattern.detail}</p><p className="mt-2 text-xs font-semibold text-gold">Next: {pattern.action}</p></article>)}
        </div>
      </section>

      <details className="mt-8 border-y border-line py-4">
        <summary className="min-h-11 font-display text-xl font-semibold leading-[44px] text-ink">Chapter record <span className="ml-2 font-body text-xs font-normal text-ink-faint">{stats.done} / {chapters.length} read</span></summary>
        <div className="mt-4 divide-y divide-line">
        {chapters.map((c) => {
          const entry = map[c.slug];
          const complete = entry?.complete ?? false;
          return (
            <div
              key={c.slug}
              className={`flex items-center gap-3 py-4 transition-colors ${
                complete ? "bg-gold/5" : "bg-transparent"
              }`}
            >
              <span className="w-8 shrink-0 text-right font-display text-sm font-bold text-ink-faint">
                {c.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/chapters/${c.slug}/`}
                    className="font-display font-semibold text-ink underline-offset-2 hover:text-gold hover:underline"
                  >
                    {c.title}
                  </Link>
                  <PillarTag pillar={c.pillar} />
                </div>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-gold" : "bg-gold/40"}`}
                    style={{ width: `${entry?.maxScroll ?? 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => markComplete(c.slug, !complete)}
                className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  complete
                    ? "border-gold bg-gold text-paper hover:bg-gold-deep"
                    : "border-line bg-paper text-ink-soft hover:border-gold hover:text-gold"
                }`}
              >
                {complete ? "✓ Read" : "Mark read"}
              </button>
            </div>
          );
        })}
        </div>
      </details>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Backup &amp; restore
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Your progress, highlights, quiz scores, reflections and settings live only in
          this browser. Export a JSON backup to keep them, or import one to move them to
          another device.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onExport}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-paper transition-colors cta-hover"
          >
            Export backup
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-line bg-paper px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {importError && (
          <p role="alert" className="mt-3 text-sm text-rose-600">
            {importError}
          </p>
        )}
        {imported && (
          <p role="status" className="mt-3 text-sm text-gold">
            Backup imported — refresh the page to see it everywhere.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => resetProgress()}
          className="text-sm text-ink-faint underline-offset-2 hover:text-rose-700 hover:underline"
        >
          Reset all progress
        </button>
      </div>
    </div>
  );
}
