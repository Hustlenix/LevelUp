"use client";

import { useState, useSyncExternalStore } from "react";
import { clearBackupTransaction, inspectBackupTransaction, recoverBackupTransaction } from "@/lib/backup";

export default function BackupJournalNotice() {
  const [dismissed, setDismissed] = useState(false);
  const visible = useSyncExternalStore(() => () => {}, () => typeof window !== "undefined" && Boolean(inspectBackupTransaction(window.localStorage)), () => false);
  if (!visible || dismissed) return null;
  return <div className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-amber-950 no-print" role="alert"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3"><p className="min-w-0 flex-1 text-sm"><strong>Backup recovery is available.</strong> An earlier restore was interrupted; your previous local values are still protected.</p><button type="button" className="min-h-10 rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800" onClick={() => { recoverBackupTransaction(window.localStorage); window.location.reload(); }}>Recover</button><button type="button" className="min-h-10 rounded-lg border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800" onClick={() => setDismissed(true)}>Dismiss</button><button type="button" className="text-xs font-semibold text-amber-900 underline" onClick={() => { if (window.confirm("Clear the incomplete backup journal? Valid local data will not be deleted.")) { clearBackupTransaction(window.localStorage); setDismissed(true); } }}>Clear journal</button></div></div>;
}
