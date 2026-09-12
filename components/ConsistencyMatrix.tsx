"use client";

import { useMemo, useState } from "react";
import { 
  BarChart3, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Heart, 
  Zap, 
  Coins, 
  Brain, 
  Download, 
  Upload, 
  Trash2 
} from "lucide-react";
import { 
  usePillarsStore, 
  useFocusStore, 
  useProtocolLogsStore, 
  useUrgesStore,
  reloadActionToolsCaches,
  type PillarFloorCheck 
} from "@/lib/actionTools";
import { useStreakStore } from "@/lib/activity";

export default function ConsistencyMatrix() {
  const pillarsHistory = usePillarsStore();
  const focusSessions = useFocusStore();
  const protocolLogs = useProtocolLogsStore();
  const urgesLog = useUrgesStore();
  const streak = useStreakStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Generate last 28 days array
  const last28Days = useMemo(() => {
    const days: { dateStr: string; label: string; entry?: PillarFloorCheck; focusMinutes: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const entry = pillarsHistory[dateStr];
      
      const dayFocus = focusSessions
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      days.push({
        dateStr,
        label: d.toLocaleDateString(undefined, { weekday: "narrow", month: "numeric", day: "numeric" }),
        entry,
        focusMinutes: dayFocus,
      });
    }
    return days;
  }, [pillarsHistory, focusSessions]);

  // Aggregate Pillar completions
  const pillarStats = useMemo(() => {
    const historyEntries = Object.values(pillarsHistory);
    const totalDaysRecorded = Math.max(1, historyEntries.length);
    let healthCount = 0;
    let wealthCount = 0;
    let loveCount = 0;
    let selfCount = 0;

    historyEntries.forEach((h) => {
      if (h.health?.done) healthCount++;
      if (h.wealth?.done) wealthCount++;
      if (h.love?.done) loveCount++;
      if (h.self?.done) selfCount++;
    });

    return [
      {
        name: "Health",
        count: healthCount,
        pct: Math.round((healthCount / totalDaysRecorded) * 100),
        icon: Heart,
        color: "text-health",
        bg: "bg-health",
      },
      {
        name: "Wealth",
        count: wealthCount,
        pct: Math.round((wealthCount / totalDaysRecorded) * 100),
        icon: Coins,
        color: "text-wealth",
        bg: "bg-wealth",
      },
      {
        name: "Love",
        count: loveCount,
        pct: Math.round((loveCount / totalDaysRecorded) * 100),
        icon: Zap,
        color: "text-love",
        bg: "bg-love",
      },
      {
        name: "Self",
        count: selfCount,
        pct: Math.round((selfCount / totalDaysRecorded) * 100),
        icon: Brain,
        color: "text-self",
        bg: "bg-self",
      },
    ];
  }, [pillarsHistory]);

  const totalFocusMinutes = useMemo(() => {
    return focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [focusSessions]);

  const totalUrgesResisted = useMemo(() => {
    return urgesLog.filter((u) => u.resisted).length;
  }, [urgesLog]);

  // JSON Data Backup & Portability
  const handleExportJSON = () => {
    const data = {
      schema: "levelup-consistency-v1",
      exportedAt: new Date().toISOString(),
      pillarsHistory,
      focusSessions,
      protocolLogs,
      urgesLog,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `levelup-lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result;
        if (typeof raw !== "string") {
          throw new Error("Unable to read backup file.");
        }
        const json = JSON.parse(raw);
        if (!json || typeof json !== "object") {
          throw new Error("Invalid JSON structure.");
        }

        let restoredItems = 0;
        if (json.pillarsHistory && typeof json.pillarsHistory === "object" && !Array.isArray(json.pillarsHistory)) {
          localStorage.setItem("levelup-pillar-floors-v1", JSON.stringify(json.pillarsHistory));
          restoredItems++;
        }
        if (Array.isArray(json.focusSessions)) {
          localStorage.setItem("levelup-focus-sessions-v1", JSON.stringify(json.focusSessions));
          restoredItems++;
        }
        if (Array.isArray(json.protocolLogs)) {
          localStorage.setItem("levelup-protocol-logs-v1", JSON.stringify(json.protocolLogs));
          restoredItems++;
        }
        if (Array.isArray(json.urgesLog)) {
          localStorage.setItem("levelup-urge-pauses-v1", JSON.stringify(json.urgesLog));
          restoredItems++;
        }
        if (json.calibrations && typeof json.calibrations === "object") {
          localStorage.setItem("levelup-daily-calibration-v1", JSON.stringify(json.calibrations));
          restoredItems++;
        }

        if (restoredItems === 0) {
          setImportStatus("No recognizable LevelUp LifeOS data found in file.");
          return;
        }

        reloadActionToolsCaches();
        setImportStatus(`Successfully restored ${restoredItems} data collections!`);
        setTimeout(() => {
          setImportStatus(null);
        }, 3500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid JSON file.";
        setImportStatus(`Import failed: ${msg}`);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-import same file if needed
    e.target.value = "";
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to reset your local progress? All sessions, calibrations, streak, and logs will be wiped.")) {
      localStorage.removeItem("levelup-pillar-floors-v1");
      localStorage.removeItem("levelup-focus-sessions-v1");
      localStorage.removeItem("levelup-protocol-logs-v1");
      localStorage.removeItem("levelup-urge-pauses-v1");
      localStorage.removeItem("levelup-daily-calibration-v1");
      localStorage.removeItem("levelup-streak-v1");
      reloadActionToolsCaches();
      window.location.reload();
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
              Habits & History
            </span>
            <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
              28-Day Consistency Matrix
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(!showExportModal)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-gold hover:text-ink transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Data Backup & Restore
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Daily Streak</span>
            <Flame className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {streak.current} <span className="text-xs font-normal text-ink-faint">days</span>
          </div>
          <span className="text-[11px] text-ink-soft">Non-zero daily momentum</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Focus Logged</span>
            <Clock className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {Math.round(totalFocusMinutes / 60 * 10) / 10} <span className="text-xs font-normal text-ink-faint">hrs</span>
          </div>
          <span className="text-[11px] text-ink-soft">{focusSessions.length} total sprints</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Protocols Run</span>
            <CheckCircle2 className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {protocolLogs.length}
          </div>
          <span className="text-[11px] text-ink-soft">13 protocols executed</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Urges Resisted</span>
            <Zap className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-ink">
            {totalUrgesResisted}
          </div>
          <span className="text-[11px] text-ink-soft">10-sec delay victories</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            4-Week Activity Heatmap (Pillars & Focus Intensity)
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
            <span>Zero</span>
            <span className="h-2.5 w-2.5 rounded-xs bg-paper-deep border border-line" />
            <span className="h-2.5 w-2.5 rounded-xs bg-gold/30" />
            <span className="h-2.5 w-2.5 rounded-xs bg-gold/70" />
            <span className="h-2.5 w-2.5 rounded-xs bg-gold" />
            <span>Complete</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 rounded-xl border border-line bg-paper p-4">
          {last28Days.map((day) => {
            const completedCount = day.entry
              ? [day.entry.health?.done, day.entry.wealth?.done, day.entry.love?.done, day.entry.self?.done].filter(Boolean).length
              : 0;
            
            let bgClass = "bg-paper-deep border-line";
            if (completedCount === 1 || day.focusMinutes > 0) bgClass = "bg-gold/25 border-gold/40 text-ink";
            if (completedCount === 2 || day.focusMinutes >= 45) bgClass = "bg-gold/50 border-gold/70 text-ink";
            if (completedCount >= 3 || day.focusMinutes >= 90) bgClass = "bg-gold text-paper font-bold";

            const isToday = day.dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div
                key={day.dateStr}
                title={`${day.dateStr}: ${completedCount}/4 pillars, ${day.focusMinutes}m focus`}
                className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-transform hover:scale-105 ${bgClass} ${
                  isToday ? "ring-2 ring-ink ring-offset-1" : ""
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{day.dateStr.slice(8)}</span>
                <span className="text-[11px] font-bold">
                  {completedCount > 0 ? `${completedCount}/4` : day.focusMinutes > 0 ? `${day.focusMinutes}m` : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pillar Balance Breakdown */}
      <div className="mt-6 border-t border-line pt-5">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Autonomic Balance (4-Pillar Floor Consistency)
        </span>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillarStats.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="rounded-xl border border-line bg-paper p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${p.color}`} />
                    <span className="font-display text-sm font-bold text-ink">{p.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-ink">{p.pct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className={`h-full ${p.bg}`}
                    style={{ width: `${Math.min(100, Math.max(5, p.pct))}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-ink-faint">
                  {p.count} non-zero logged days
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup Modal / Drawer */}
      {showExportModal && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-ink">
              Data Portability & Local Storage Backup
            </h4>
            <button
              onClick={() => setShowExportModal(false)}
              className="text-xs text-ink-faint hover:text-ink"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            All your daily logs, focus sprints, and streaks live 100% locally in your browser. Download a full JSON backup to move between devices, or restore an earlier backup.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-gold transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export Backup (.json)
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-gold transition-colors">
              <Upload className="h-3.5 w-3.5 text-gold" /> Restore from JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>

            <button
              onClick={handleClearData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-crimson/30 bg-crimson/10 px-4 py-2 text-xs font-semibold text-crimson hover:bg-crimson/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Reset Local Data
            </button>
          </div>

          {importStatus && (
            <p className="mt-3 text-xs font-bold text-gold">{importStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}
