"use client";

import { useState } from "react";
import { 
  Flame, 
  Sparkles, 
  Target, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Play, 
  HelpCircle, 
  Layers, 
  Heart, 
  Zap, 
  DollarSign, 
  Brain, 
  Check, 
  ChevronRight
} from "lucide-react";
import type { Protocol } from "@/lib/types";
import { 
  useCalibrationStore, 
  useFocusStore, 
  useUrgesStore, 
  usePillarsStore, 
  useProtocolLogsStore, 
  togglePillarFloor
} from "@/lib/actionTools";
import { useStreakStore } from "@/lib/activity";
import { localToday } from "@/lib/dates";
import ProtocolRunnerModal from "@/components/ProtocolRunnerModal";
import AmbientAudioPlayer from "@/components/AmbientAudioPlayer";
import DailyScheduleBlockerModal from "@/components/DailyScheduleBlockerModal";
import { Calendar } from "lucide-react";

interface DailyActionHubProps {
  protocols: Protocol[];
}

export default function DailyActionHub({ protocols }: DailyActionHubProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "focus" | "diagnostic" | "protocols">("dashboard");
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  const streak = useStreakStore();
  const calibrations = useCalibrationStore();
  const focusSessions = useFocusStore();
  const urges = useUrgesStore();
  const pillars = usePillarsStore();
  const protocolLogs = useProtocolLogsStore();

  const todayStr = localToday();
  const todayCalibration = calibrations[todayStr];
  const todayPillars = pillars[todayStr] || {
    date: todayStr,
    health: { floor: "10 pushups or 15-min walk", done: false },
    wealth: { floor: "30m deep work or 1 high-leverage outreach", done: false },
    love: { floor: "1 honest message or present conversation", done: false },
    self: { floor: "5-min reflection or 1 chapter read", done: false },
  };

  const todayFocus = focusSessions.filter((s) => s.date === todayStr);
  const totalFocusMinutes = todayFocus.reduce((acc, s) => acc + Math.round(s.completedSeconds / 60), 0);

  const pillarsDoneCount = [
    todayPillars.health?.done,
    todayPillars.wealth?.done,
    todayPillars.love?.done,
    todayPillars.self?.done,
  ].filter(Boolean).length;

  const handleLaunchProtocol = (num: string) => {
    const proto = protocols.find((p) => p.num === num) || null;
    setSelectedProtocol(proto);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Today's Bar */}
      <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-widest text-gold">
              Daily Action Operating System
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Execute Today&apos;s Protocols
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Convert reading into daily behavioral outcomes. Your local-first action center.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm shadow-xs">
              <Flame className="h-4 w-4 text-gold fill-gold" />
              <span className="font-display font-bold text-ink">{streak.current}</span>
              <span className="text-xs text-ink-faint">Day Streak</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm shadow-xs">
              <Clock className="h-4 w-4 text-gold" />
              <span className="font-display font-bold text-ink">{totalFocusMinutes}m</span>
              <span className="text-xs text-ink-faint">Focused Today</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm shadow-xs">
              <Layers className="h-4 w-4 text-gold" />
              <span className="font-display font-bold text-ink">{pillarsDoneCount}/4</span>
              <span className="text-xs text-ink-faint">Pillar Floors</span>
            </div>
            <button
              onClick={() => setShowScheduler(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-gold transition-colors shadow-xs"
            >
              <Calendar className="h-3.5 w-3.5 text-gold" />
              Schedule Day (.ics)
            </button>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="mt-6 flex overflow-x-auto border-b border-line gap-2 pt-2 text-sm font-medium scrollbar-thin">
          {[
            { id: "dashboard", label: "Daily Action Board", icon: Target },
            { id: "focus", label: "God-Mode Sprint Studio", icon: Clock },
            { id: "diagnostic", label: "Friction Troubleshooter", icon: HelpCircle },
            { id: "protocols", label: "Interactive Protocol Runner", icon: Play },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors ${
                activeTab === id
                  ? "border-gold text-gold font-bold"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-line"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DAILY ACTION DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Morning Calibration Card */}
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      Morning Calibration (Protocol 2.3)
                    </h2>
                    <p className="text-xs text-ink-faint">
                      Discharge goal intrusion before opening devices
                    </p>
                  </div>
                </div>
                {todayCalibration?.completed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-health/15 px-3 py-1 text-xs font-bold text-health">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed Today
                  </span>
                ) : (
                  <button
                    onClick={() => handleLaunchProtocol("2.3")}
                    className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-gold"
                  >
                    Start Calibration (2m)
                  </button>
                )}
              </div>

              {todayCalibration?.completed ? (
                <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-paper p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-faint w-28 shrink-0">
                      Primary Target:
                    </span>
                    <span className="font-medium text-ink">{todayCalibration.primaryOutcome}</span>
                  </div>
                  {todayCalibration.physicalAction && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-faint w-28 shrink-0">
                        Action & Time:
                      </span>
                      <span className="text-ink-soft">
                        {todayCalibration.physicalAction} {todayCalibration.actionTime ? `· ${todayCalibration.actionTime}` : ""}
                      </span>
                    </div>
                  )}
                  {todayCalibration.obstacleReframe && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-faint w-28 shrink-0">
                        Mental Reframe:
                      </span>
                      <span className="italic text-ink-soft">{todayCalibration.obstacleReframe}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-paper-deep/20 p-4 text-center">
                  <p className="text-sm text-ink-soft">
                    You haven&apos;t calibrated your focus for today yet. Take 2 minutes to define your primary needle-moving target.
                  </p>
                  <button
                    onClick={() => handleLaunchProtocol("2.3")}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-xs font-bold text-paper transition-colors hover:bg-gold-soft"
                  >
                    Launch Calibration Tool <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 4-Pillar Non-Zero Floors Card */}
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    The 4-Pillar Floor Check (Protocol 2.4)
                  </h2>
                  <p className="text-xs text-ink-faint">
                    &ldquo;Below that floor, no day is ever zero.&rdquo; Check off your non-negotiable minimums.
                  </p>
                </div>
                <span className="font-display text-sm font-bold text-gold">
                  {pillarsDoneCount}/4 Done
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Health */}
                <div 
                  onClick={() => togglePillarFloor("health")}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                    todayPillars.health?.done 
                      ? "border-health/40 bg-health/10" 
                      : "border-line bg-paper hover:border-health/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      todayPillars.health?.done ? "bg-health text-paper" : "bg-health/15 text-health"
                    }`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-health">Health</p>
                      <p className="text-xs text-ink-soft">{todayPillars.health?.floor}</p>
                    </div>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    todayPillars.health?.done ? "border-health bg-health text-paper" : "border-line text-transparent"
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>

                {/* Wealth */}
                <div 
                  onClick={() => togglePillarFloor("wealth")}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                    todayPillars.wealth?.done 
                      ? "border-wealth/40 bg-wealth/10" 
                      : "border-line bg-paper hover:border-wealth/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      todayPillars.wealth?.done ? "bg-wealth text-paper" : "bg-wealth/15 text-wealth"
                    }`}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-wealth">Wealth</p>
                      <p className="text-xs text-ink-soft">{todayPillars.wealth?.floor}</p>
                    </div>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    todayPillars.wealth?.done ? "border-wealth bg-wealth text-paper" : "border-line text-transparent"
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>

                {/* Love */}
                <div 
                  onClick={() => togglePillarFloor("love")}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                    todayPillars.love?.done 
                      ? "border-love/40 bg-love/10" 
                      : "border-line bg-paper hover:border-love/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      todayPillars.love?.done ? "bg-love text-paper" : "bg-love/15 text-love"
                    }`}>
                      <Heart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-love">Love</p>
                      <p className="text-xs text-ink-soft">{todayPillars.love?.floor}</p>
                    </div>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    todayPillars.love?.done ? "border-love bg-love text-paper" : "border-line text-transparent"
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>

                {/* Self */}
                <div 
                  onClick={() => togglePillarFloor("self")}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                    todayPillars.self?.done 
                      ? "border-self/40 bg-self/10" 
                      : "border-line bg-paper hover:border-self/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      todayPillars.self?.done ? "bg-self text-paper" : "bg-self/15 text-self"
                    }`}>
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-self">Self</p>
                      <p className="text-xs text-ink-soft">{todayPillars.self?.floor}</p>
                    </div>
                  </div>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    todayPillars.self?.done ? "border-self bg-self text-paper" : "border-line text-transparent"
                  }`}>
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Quick Urge Delayer & Active Sprints */}
          <div className="space-y-6">
            {/* Quick 10s Urge Delayer */}
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    10s Urge Interceptor
                  </h3>
                  <p className="text-xs text-ink-faint">Protocol 2.8: Break compulsive triggers</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                About to mindlessly check your phone, open Twitter, or grab a snack? Pause for 10 seconds first.
              </p>

              <button
                onClick={() => handleLaunchProtocol("2.8")}
                className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 font-display text-xs font-bold text-paper transition-colors hover:bg-gold flex items-center justify-center gap-2"
              >
                <Clock className="h-3.5 w-3.5" /> Start 10-Second Urge Pause
              </button>

              <div className="mt-3 flex items-center justify-between text-xs text-ink-faint">
                <span>Interceptions logged:</span>
                <span className="font-bold text-ink">{urges.length} total</span>
              </div>
            </div>

            {/* Quick Sprint Launcher */}
            <div className="rounded-2xl border border-line bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    God-Mode Focus Block
                  </h3>
                  <p className="text-xs text-ink-faint">Protocol 2.9: Single-task sprint</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLaunchProtocol("2.6")}
                  className="rounded-xl border border-line bg-paper p-3 text-left transition-colors hover:border-gold"
                >
                  <p className="font-display text-sm font-bold text-ink">25m Sprint</p>
                  <p className="text-[11px] text-ink-faint">Standard block</p>
                </button>
                <button
                  onClick={() => handleLaunchProtocol("2.9")}
                  className="rounded-xl border border-line bg-paper p-3 text-left transition-colors hover:border-gold"
                >
                  <p className="font-display text-sm font-bold text-gold">90m God-Mode</p>
                  <p className="text-[11px] text-ink-faint">Peak intensity</p>
                </button>
              </div>

              {todayFocus.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Today&apos;s Wins:
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
                    {todayFocus.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-health shrink-0" />
                        <span className="font-medium text-ink">{s.taskName}</span>
                        <span className="text-[10px] text-ink-faint">({Math.round(s.completedSeconds / 60)}m)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOD-MODE SPRINT STUDIO */}
      {activeTab === "focus" && (
        <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                Deep-Work Focus Studio
              </h2>
              <p className="text-sm text-ink-soft">
                Full-screen distraction-free execution engine with intrusive thought parking and Winner&apos;s Loop closure.
              </p>
            </div>
            <button
              onClick={() => handleLaunchProtocol("2.9")}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 font-display text-sm font-semibold text-paper transition-colors hover:bg-gold"
            >
              <Play className="h-4 w-4" /> Open Dedicated Sprint Engine
            </button>
          </div>

          <div className="rounded-xl border border-line bg-paper p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              Protocol 2.6 & 2.9 Execution Rules
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 text-left">
              <div className="rounded-lg bg-paper-deep/50 p-4">
                <span className="font-display font-bold text-gold">1. Specific Deliverable</span>
                <p className="mt-1 text-xs text-ink-soft">
                  Never work on &ldquo;projects&rdquo;. Name the exact physical output: &ldquo;draft 500 words&rdquo; or &ldquo;export presentation deck&rdquo;.
                </p>
              </div>
              <div className="rounded-lg bg-paper-deep/50 p-4">
                <span className="font-display font-bold text-gold">2. Distraction Parking</span>
                <p className="mt-1 text-xs text-ink-soft">
                  When an urge or stray idea hits, write it on the scratchpad and immediately return. Do not switch contexts.
                </p>
              </div>
              <div className="rounded-lg bg-paper-deep/50 p-4">
                <span className="font-display font-bold text-gold">3. Winner&apos;s Loop Close</span>
                <p className="mt-1 text-xs text-ink-soft">
                  At the finish chime, say the outcome aloud and log your 1-line win to trigger dopaminergic reinforcement.
                </p>
              </div>
            </div>
          </div>

          {/* Embedded Ambient Soundscape Generator */}
          <div>
            <AmbientAudioPlayer />
          </div>
        </div>
      )}

      {/* TAB 3: REAL-TIME FRICTION TROUBLESHOOTER */}
      {activeTab === "diagnostic" && (
        <div className="rounded-2xl border border-line bg-card p-6 shadow-xs space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              Real-Time Friction Troubleshooter
            </h2>
            <p className="text-sm text-ink-soft">
              Select your current psychological or physical resistance to get an immediate, evidence-grounded intervention.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Trouble 1 */}
            <div className="rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold">
              <span className="rounded-full bg-love/15 px-2.5 py-0.5 text-[11px] font-bold text-love">
                Paralysis & Resistance
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-ink">
                &ldquo;I&apos;m dreading this task and keep delaying it.&rdquo;
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Root Cause: Challenge-skill mismatch or outcome over-fixation.
              </p>
              <div className="mt-3 rounded bg-paper-deep/40 p-3 text-xs text-ink">
                <strong>Prescription (The 70% Rule):</strong> Shrink the scope until your brain ceases to resist. Do 70% of the ideal version, or execute just the zero-day floor (e.g. write 1 sentence).
              </div>
              <button
                onClick={() => handleLaunchProtocol("2.4")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
              >
                Launch 70% Scale Tool <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Trouble 2 */}
            <div className="rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold">
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                Compulsive Distraction
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-ink">
                &ldquo;My brain craves constant stimulation / social feeds.&rdquo;
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Root Cause: Dopamine baseline down-regulation and low boredom tolerance.
              </p>
              <div className="mt-3 rounded bg-paper-deep/40 p-3 text-xs text-ink">
                <strong>Prescription (The 10-Second Pause):</strong> Don&apos;t ban the impulse. Just add a mandatory 10-second delay. State what you are doing before you do it.
              </div>
              <button
                onClick={() => handleLaunchProtocol("2.8")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
              >
                Launch Urge Delayer <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Trouble 3 */}
            <div className="rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold">
              <span className="rounded-full bg-self/15 px-2.5 py-0.5 text-[11px] font-bold text-self">
                Goal Overwhelm
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-ink">
                &ldquo;Too many competing priorities; I can&apos;t decide what to do.&rdquo;
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Root Cause: Zeigarnik effect / goal intrusion from unfinished plans.
              </p>
              <div className="mt-3 rounded bg-paper-deep/40 p-3 text-xs text-ink">
                <strong>Prescription (Masicampo & Baumeister):</strong> Write down the next physical action and schedule it. Plan-making discharges cognitive load from working memory.
              </div>
              <button
                onClick={() => handleLaunchProtocol("2.3")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
              >
                Run Morning Calibration <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Trouble 4 */}
            <div className="rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold">
              <span className="rounded-full bg-health/15 px-2.5 py-0.5 text-[11px] font-bold text-health">
                Afternoon Slump
              </span>
              <h3 className="mt-2 font-display text-base font-bold text-ink">
                &ldquo;Brain fog and low physical energy after lunch.&rdquo;
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Root Cause: Circadian post-prandial dip and autonomic imbalance.
              </p>
              <div className="mt-3 rounded bg-paper-deep/40 p-3 text-xs text-ink">
                <strong>Prescription (Physiological Calm):</strong> 2 minutes of deliberate box breathing or a 10-minute walk with zero audio.
              </div>
              <button
                onClick={() => handleLaunchProtocol("2.3")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
              >
                Start Box Breathing Pacer <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROTOCOL RUNNER SUITE */}
      {activeTab === "protocols" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                Interactive Protocol Suite
              </h2>
              <p className="text-sm text-ink-soft">
                All 13 testable protocols available to execute interactively.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {protocols.map((p) => {
              const runCount = protocolLogs.filter((l) => l.protocolNum === p.num).length;
              return (
                <div key={p.num} className="flex flex-col justify-between rounded-xl border border-line bg-card p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold text-gold">Protocol {p.num}</span>
                      <div className="flex items-center gap-2">
                        {runCount > 0 && (
                          <span className="rounded-full bg-health/15 px-2 py-0.5 text-[10px] font-bold text-health">
                            {runCount} {runCount === 1 ? "run" : "runs"}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-ink-faint">{p.duration}</span>
                      </div>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold text-ink">{p.title}</h3>
                    <p className="mt-1 text-xs text-ink-soft line-clamp-2">{p.purpose}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex justify-end">
                    <button
                      onClick={() => setSelectedProtocol(p)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-gold"
                    >
                      <Play className="h-3 w-3" /> Run Protocol
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Protocol Runner Modal */}
      {selectedProtocol && (
        <ProtocolRunnerModal
          protocol={selectedProtocol}
          onClose={() => setSelectedProtocol(null)}
        />
      )}

      {/* Daily Schedule Blocker Modal */}
      {showScheduler && (
        <DailyScheduleBlockerModal
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  );
}
