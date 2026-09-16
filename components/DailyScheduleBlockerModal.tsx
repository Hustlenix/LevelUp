"use client";

import { useState } from "react";
import { X, Calendar, Clock, Download, Sparkles, CheckCircle2 } from "lucide-react";
import { downloadDailyScheduleICS } from "@/lib/calendarExport";
import { localDateOffset, localToday } from "@/lib/dates";

interface Props {
  onClose: () => void;
  defaultGoal?: string;
}

export default function DailyScheduleBlockerModal({ onClose, defaultGoal = "" }: Props) {
  const todayDateStr = localToday();
  const tomorrowDateStr = localDateOffset(1);

  const [targetDate, setTargetDate] = useState(todayDateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [planType, setPlanType] = useState<"sprint3" | "balanced" | "deepwork">("sprint3");
  const [goal, setGoal] = useState(defaultGoal);
  const [downloaded, setDownloaded] = useState(false);

  const handleExport = () => {
    downloadDailyScheduleICS(startTime, planType, goal || undefined, targetDate);
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
    }, 4000);
  };

  const planDescriptions = {
    sprint3: {
      name: "Ultradian Flow (2x 50m + Daylight Walk)",
      structure: "Calibration (15m) → Sprint 1 (50m) → Walk (20m) → Sprint 2 (50m) → Floor Check (15m)",
      bestFor: "High-output days requiring intense mental craftsmanship without cognitive burnout.",
    },
    balanced: {
      name: "Classic Pomodoro (2x 25m Sprints)",
      structure: "Calibration (10m) → Sprint 1 (25m) → Rest (5m) → Sprint 2 (25m) → Winner's Close (15m)",
      bestFor: "Overcoming paralysis or days packed with meetings where only short sprint windows exist.",
    },
    deepwork: {
      name: "God-Mode Monotask (1x 90m + 1x 50m)",
      structure: "Calibration (15m) → 90m Deep Work Block → Rest (30m) → 50m Polish Block → Floor Check (15m)",
      bestFor: "Major creative, architectural, or coding milestones needing sustained immersion.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-paper p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
              Automated Day Architect
            </span>
            <h2 className="font-display text-xl font-bold text-ink">
              Schedule & Export to Calendar (.ics)
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Translate your intentions into protected calendar blocks. Generates a standard <code className="rounded bg-paper-deep px-1.5 py-0.5 text-xs font-mono">.ics</code> file compatible with Google Calendar, Apple Calendar, and Outlook.
        </p>

        <div className="mt-6 space-y-5">
          {/* Target Goal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Primary Needle-Moving Deliverable (Optional)
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Finish drafting architecture specification doc"
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2 text-sm text-ink outline-hidden focus:border-gold"
            />
          </div>

          {/* Date & Start Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Target Date
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDate(todayDateStr)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                    targetDate === todayDateStr
                      ? "border-gold bg-gold/15 text-gold font-bold"
                      : "border-line bg-card text-ink-soft hover:border-gold/40"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(tomorrowDateStr)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                    targetDate === tomorrowDateStr
                      ? "border-gold bg-gold/15 text-gold font-bold"
                      : "border-line bg-card text-ink-soft hover:border-gold/40"
                  }`}
                >
                  Tomorrow
                </button>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="rounded-lg border border-line bg-card px-2 py-1 text-xs font-mono text-ink outline-hidden focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Start Time
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-mono text-ink outline-hidden focus:border-gold"
                />
              </div>
            </div>
          </div>

          {/* Plan Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint mb-2">
              Choose Evidence-Based Time Boxing Structure
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["sprint3", "balanced", "deepwork"] as const).map((key) => {
                const p = planDescriptions[key];
                const active = planType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPlanType(key)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      active
                        ? "border-gold bg-gold/10 shadow-xs"
                        : "border-line bg-card hover:border-gold/50"
                    }`}
                  >
                    <span className="block font-display text-xs font-bold text-ink">
                      {key === "sprint3" && "Ultradian (50m/15m)"}
                      {key === "balanced" && "Pomodoro (25m/5m)"}
                      {key === "deepwork" && "God-Mode (90m Block)"}
                    </span>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                      {p.bestFor}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline preview */}
          <div className="rounded-xl border border-line bg-paper-deep/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Calendar Blocks Breakdown
            </span>
            <p className="mt-1 font-mono text-xs text-ink-soft leading-relaxed">
              {planDescriptions[planType].structure}
            </p>
          </div>

          {/* Export button */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
            <span className="text-xs text-ink-faint flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-gold" />
              Direct browser download. No cloud login required.
            </span>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-paper transition-colors cta-hover shadow-xs"
            >
              {downloaded ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Downloaded .ics File!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Export Schedule (.ics)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
