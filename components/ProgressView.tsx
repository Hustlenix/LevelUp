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
import { buildBackup, validateBackup, type BackupState } from "@/lib/backup";
import { PillarTag } from "@/components/ui";
import GamificationPanel from "@/components/GamificationPanel";

const THEME_KEY = "levelup-theme";
const SCALE_KEY = "levelup-reader-scale";

export default function ProgressView({ chapters }: { chapters: Chapter[] }) {
  const map = useProgressStore();
  const stats = overallStats(map, chapters.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const onExport = () => {
    const state: BackupState = {
      theme: document.documentElement.getAttribute("data-theme"),
      readerScale: document.documentElement.getAttribute("data-reader-scale"),
      progress: getProgressSnapshot(),
      bookmarks: [...getBookmarksSnapshot()],
      highlights: getHighlightsSnapshot(),
      quiz: getQuizSnapshot(),
      reflections: getReflectionsSnapshot(),
      streak: getStreakSnapshot(),
    };
    const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `levelup-backup-v1-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
      restoreProgress(d.progress);
      restoreBookmarks(d.bookmarks);
      restoreHighlights(d.highlights);
      restoreQuiz(d.quiz);
      restoreReflections(d.reflections);
      if (d.streak) restoreStreak(d.streak);
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
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Progress</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
        Your reading, in one place
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Stored locally in your browser — nothing leaves this device. Chapters mark
        themselves complete at 90% scroll; adjust anything below.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-5xl font-bold text-ink">{stats.pct}%</span>
          <span className="text-sm text-ink-faint">
            {stats.done} of {chapters.length} chapters complete
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <GamificationPanel />

      <div className="mt-8 space-y-2">
        {chapters.map((c) => {
          const entry = map[c.slug];
          const complete = entry?.complete ?? false;
          return (
            <div
              key={c.slug}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                complete ? "border-emerald-500/40 bg-emerald-500/10" : "border-line bg-card"
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
                    className={`h-full rounded-full ${complete ? "bg-emerald-600" : "bg-gold"}`}
                    style={{ width: `${entry?.maxScroll ?? 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => markComplete(c.slug, !complete)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  complete
                    ? "border-emerald-500/60 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-line bg-paper text-ink-soft hover:border-gold hover:text-gold"
                }`}
              >
                {complete ? "✓ Read" : "Mark read"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-6">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Backup &amp; restore
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Your progress, highlights, quiz scores, reflections and settings live only in
          this browser. Export a JSON backup to keep them, or import one to move them to
          another device.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onExport}
            className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold"
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
          <p role="status" className="mt-3 text-sm text-emerald-600">
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