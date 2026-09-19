"use client";

import { useRef, useState } from "react";
import { buildBackup, restoreBackupAtomically, validateBackup, type BackupState } from "@/lib/backup";
import { getOSStateSnapshot, restoreOSState } from "@/lib/os/store";
import { reloadActionToolsCaches } from "@/lib/actionTools";
import { localToday } from "@/lib/dates";
import { toBackupPayload, fromBackupPayload } from "@/lib/studentProfile";
import { getProgressSnapshot, restoreProgress } from "@/lib/progress";
import { getBookmarksSnapshot, restoreBookmarks } from "@/lib/bookmarks";
import { getHighlightsSnapshot, getQuizSnapshot, getReflectionsSnapshot, getStreakSnapshot, restoreHighlights, restoreQuiz, restoreReflections, restoreStreak } from "@/lib/activity";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

const THEME_KEY = "levelup-theme";
const SCALE_KEY = "levelup-reader-scale";

export default function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  function onExport() {
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
      /* keep the backup usable even if an older action key is malformed */
    }
    const state: BackupState = { theme: document.documentElement.getAttribute("data-theme"), readerScale: document.documentElement.getAttribute("data-reader-scale"), progress: getProgressSnapshot(), bookmarks: [...getBookmarksSnapshot()], highlights: getHighlightsSnapshot(), quiz: getQuizSnapshot(), reflections: getReflectionsSnapshot(), streak: getStreakSnapshot(), studentProfile: toBackupPayload() ?? undefined, actionState, osState: getOSStateSnapshot() };
    const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `levelup-backup-v1-${localToday()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    trackEvent(ANALYTICS_EVENTS.backupExported);
  }

  function onImportFile(file: File) {
    setImportError(null);
    setImported(false);
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: unknown;
      try { parsed = JSON.parse(String(reader.result)); } catch { setImportError("That file is not valid JSON."); return; }
      const result = validateBackup(parsed);
      if (!result.ok || !result.data) { setImportError(result.errors.join(" ")); return; }
      const data = result.data;
      const atomicRestore = restoreBackupAtomically(data, window.localStorage);
      if (!atomicRestore.ok) { setImportError(atomicRestore.error ?? "Backup restore failed; your previous local state was kept."); return; }
      restoreProgress(data.progress);
      restoreBookmarks(data.bookmarks);
      restoreHighlights(data.highlights);
      restoreQuiz(data.quiz);
      restoreReflections(data.reflections);
      if (data.streak) restoreStreak(data.streak);
      if (data.studentProfile !== undefined) fromBackupPayload(data.studentProfile);
      if (data.osState !== undefined) restoreOSState(data.osState);
      if (data.actionState) reloadActionToolsCaches();
      if (data.theme) { document.documentElement.setAttribute("data-theme", data.theme); localStorage.setItem(THEME_KEY, data.theme); }
      if (data.readerScale) { document.documentElement.setAttribute("data-reader-scale", data.readerScale); localStorage.setItem(SCALE_KEY, data.readerScale); }
      setImported(true);
      trackEvent(ANALYTICS_EVENTS.backupImported);
    };
    reader.readAsText(file);
  }

  return <section className="rounded-2xl border border-line bg-card p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">Local backup</p><h2 className="mt-1 font-display text-2xl font-semibold text-ink">Move your system safely</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Exports include reading progress, study profile, action logs, experiments, and the Goal → Session operating state. Nothing is uploaded.</p></div><span className="rounded-full border border-line bg-paper-deep px-3 py-1 text-[11px] uppercase tracking-wider text-ink-faint">JSON · local only</span></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onExport} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Export full backup</button><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Import backup</button><input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportFile(file); event.target.value = ""; }} /></div>{importError ? <p className="mt-4 text-sm text-rose-700" role="alert">{importError}</p> : null}{imported ? <p className="mt-4 text-sm text-gold" role="status">Backup imported safely. Refresh the page to see every surface update.</p> : null}<p className="mt-5 text-xs leading-relaxed text-ink-faint">The restore validates the complete file first and uses a rollback journal for the older multi-key stores. The new OS state remains a single atomic record.</p></section>;
}
