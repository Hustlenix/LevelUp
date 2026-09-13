"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { 
  Play, 
  Flame, 
  Calendar, 
  Heart, 
  Coins, 
  Zap, 
  Brain, 
  Check, 
  ShieldAlert, 
  Activity, 
  ChevronRight,
  Compass,
  BarChart3,
  BookOpen,
  ArrowRight
} from "lucide-react";
import type { Chapter, Protocol } from "@/lib/types";
import { 
  usePillarsStore, 
  togglePillarFloor 
} from "@/lib/actionTools";
import { useStreakStore } from "@/lib/activity";
import { localToday } from "@/lib/dates";
import AmbientAudioPlayer from "@/components/AmbientAudioPlayer";
import DailyScheduleBlockerModal from "@/components/DailyScheduleBlockerModal";
import ConsistencyMatrix from "@/components/ConsistencyMatrix";
import ProtocolRunnerModal from "@/components/ProtocolRunnerModal";

interface Props {
  protocols: Protocol[];
  chapters: Chapter[];
}

const emptySubscribe = () => () => {};

function getGreetingClient() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getGreetingServer() {
  return "Welcome";
}

function getDateClient() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getDateServer() {
  return "";
}

export default function HomepageDashboard({ protocols, chapters }: Props) {
  const greeting = useSyncExternalStore(emptySubscribe, getGreetingClient, getGreetingServer);
  const dateDisplay = useSyncExternalStore(emptySubscribe, getDateClient, getDateServer);

  const [currentView, setCurrentView] = useState<"today" | "trends" | "chapters" | "all">("today");
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(null);
  const [selectedPillarTab, setSelectedPillarTab] = useState<string>("all");

  const pillarsHistory = usePillarsStore();
  const streak = useStreakStore();

  const todayStr = useMemo(() => localToday(), []);

  const todayPillars = pillarsHistory[todayStr] || {
    date: todayStr,
    health: { floor: "10 pushups / 20 min walk", done: false },
    wealth: { floor: "30 min single-task deep work", done: false },
    love: { floor: "1 intentional message or honest check-in", done: false },
    self: { floor: "5 min box breathing / reflection", done: false },
  };

  const completedPillarsCount = [
    todayPillars.health?.done,
    todayPillars.wealth?.done,
    todayPillars.love?.done,
    todayPillars.self?.done,
  ].filter(Boolean).length;

  const handleLaunchProtocolByNum = (num: string) => {
    const found = protocols.find((p) => p.num === num);
    if (found) setActiveProtocol(found);
  };

  const pillarCards = [
    {
      id: "health" as const,
      name: "Health Floor",
      category: "Physical",
      icon: Heart,
      color: "text-health",
      rule: todayPillars.health?.floor || "10 pushups / 20 min walk",
      done: !!todayPillars.health?.done,
    },
    {
      id: "wealth" as const,
      name: "Wealth Floor",
      category: "Focus & Output",
      icon: Coins,
      color: "text-wealth",
      rule: todayPillars.wealth?.floor || "30 min single-task deep work",
      done: !!todayPillars.wealth?.done,
    },
    {
      id: "love" as const,
      name: "Love Floor",
      category: "Relationships",
      icon: Zap,
      color: "text-love",
      rule: todayPillars.love?.floor || "1 intentional message or check-in",
      done: !!todayPillars.love?.done,
    },
    {
      id: "self" as const,
      name: "Self Floor",
      category: "Mind & Clarity",
      icon: Brain,
      color: "text-self",
      rule: todayPillars.self?.floor || "5 min box breathing / reflection",
      done: !!todayPillars.self?.done,
    },
  ];

  const filteredChapters = useMemo(() => {
    if (selectedPillarTab === "all") return chapters;
    return chapters.filter((c) => c.pillar.toLowerCase() === selectedPillarTab);
  }, [chapters, selectedPillarTab]);

  return (
    <div className="space-y-8">
      {/* Calm, Refined Header */}
      <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-ink-faint">
              <span>{dateDisplay || "Today"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-gold">
                <Flame className="h-3.5 w-3.5 fill-gold text-gold" />
                {streak.current} day streak
              </span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {greeting}.
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Your daily operating dashboard. Complete your non-zero floors, block focus time, and stay steady.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowScheduler(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-gold hover:text-gold transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-gold" />
              Time-Block Day (.ics)
            </button>
            <Link
              href="/action/"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-paper hover:bg-gold transition-colors"
            >
              <Activity className="h-3.5 w-3.5" />
              Full Action OS
            </Link>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-t border-line/80 pt-4 text-xs">
          {[
            { id: "today", label: "Today's Focus", icon: Compass },
            { id: "trends", label: "28-Day Consistency", icon: BarChart3 },
            { id: "chapters", label: "Manual Library (28)", icon: BookOpen },
            { id: "all", label: "Show All", icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id as typeof currentView)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-all ${
                currentView === id
                  ? "bg-gold text-paper font-semibold shadow-xs"
                  : "bg-paper border border-line text-ink-soft hover:text-ink hover:border-gold"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* VIEW: TODAY'S FOCUS (DEFAULT) */}
      {(currentView === "today" || currentView === "all") && (
        <div className="space-y-6">
          {/* Audio Synthesizer & Focus Bar */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-faint">
                Focus Soundscape & Sprints
              </span>
              <button
                onClick={() => handleLaunchProtocolByNum("2.6")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
              >
                <Play className="h-3 w-3 fill-current" /> Launch Guided Sprint Timer (Protocol 2.6) →
              </button>
            </div>
            <AmbientAudioPlayer compact={true} />
          </section>

          {/* 4-Pillar Floors Checklist */}
          <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
                  Daily Baseline Enforcer
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-ink">
                  Today&apos;s 4-Pillar Non-Zero Floors
                </h2>
                <p className="mt-1 text-xs text-ink-soft">
                  Below these minimums, no day is ever zero. Click any floor to toggle completion.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1 text-xs font-medium text-ink-soft">
                <span className="font-display font-bold text-ink">{completedPillarsCount} of 4</span>
                <span>floors held</span>
                <div className="h-2 w-16 overflow-hidden rounded-full bg-paper-deep ml-1">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${(completedPillarsCount / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pillarCards.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePillarFloor(p.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                      p.done
                        ? "border-gold bg-gold/10 shadow-2xs"
                        : "border-line bg-paper hover:border-gold/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${p.color}`} />
                          <span className="font-display text-sm font-bold text-ink">
                            {p.name}
                          </span>
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                            p.done
                              ? "border-gold bg-gold text-paper"
                              : "border-line bg-card text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                        {p.rule}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-line/60 text-[11px]">
                      <span className={p.done ? "font-semibold text-gold" : "text-ink-faint"}>
                        {p.done ? "Completed Today" : "Click to mark done"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quick Intervention Protocols */}
          <section className="rounded-2xl border border-line bg-card p-6 shadow-xs">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-faint">
              Instant Action Protocols
            </span>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => handleLaunchProtocolByNum("2.3")}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4 text-left hover:border-gold hover:shadow-2xs transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold group-hover:bg-gold group-hover:text-paper transition-colors">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-bold text-ink flex items-center gap-1">
                    Morning Calibration <ChevronRight className="h-3 w-3 text-ink-faint" />
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Lock 1 primary outcome & run 2-min box breathing.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleLaunchProtocolByNum("2.6")}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4 text-left hover:border-gold hover:shadow-2xs transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold group-hover:bg-gold group-hover:text-paper transition-colors">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-bold text-ink flex items-center gap-1">
                    Focus Sprint Studio <ChevronRight className="h-3 w-3 text-ink-faint" />
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    25m, 50m, or 90m block with distraction log & chime.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleLaunchProtocolByNum("2.8")}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4 text-left hover:border-gold hover:shadow-2xs transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold group-hover:bg-gold group-hover:text-paper transition-colors">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-bold text-ink flex items-center gap-1">
                    10-Second Urge Delay <ChevronRight className="h-3 w-3 text-ink-faint" />
                  </h3>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    Pause phone or distraction impulses to reset dopamine.
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Calm Momentum Teaser */}
          {currentView === "today" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 bg-paper px-5 py-3.5 text-xs text-ink-soft shadow-2xs">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-gold fill-gold" />
                <span>
                  <strong>{streak.current} consecutive active days.</strong> All progress is stored 100% locally in your browser.
                </span>
              </div>
              <button
                onClick={() => setCurrentView("trends")}
                className="inline-flex items-center gap-1 font-semibold text-gold hover:underline"
              >
                View 28-day matrix & data backup <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW: 28-DAY CONSISTENCY MATRIX */}
      {(currentView === "trends" || currentView === "all") && (
        <section className="space-y-4">
          <ConsistencyMatrix />
        </section>
      )}

      {/* VIEW: CHAPTERS & MANUAL LIBRARY */}
      {(currentView === "chapters" || currentView === "all") && (
        <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
                Evidence Curriculum
              </span>
              <h2 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
                The 28 Audited Chapters
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-ink-soft">
                The empirical foundation behind every tool in this manual. Audited against randomized trials and meta-analyses.
              </p>
            </div>

            {/* Pillar Filters */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "health", label: "Health" },
                { id: "wealth", label: "Wealth" },
                { id: "love", label: "Love" },
                { id: "self", label: "Self" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedPillarTab(t.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedPillarTab === t.id
                      ? "bg-gold text-paper"
                      : "border border-line bg-paper text-ink-soft hover:border-gold"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredChapters.slice(0, 9).map((ch) => (
              <Link
                key={ch.slug}
                href={`/chapters/${ch.slug}/`}
                className="group flex flex-col justify-between rounded-xl border border-line bg-paper p-5 transition-all hover:border-gold hover:shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-ink-faint">
                    <span className="font-mono text-gold font-bold">Ch. {ch.number}</span>
                    <span className="rounded bg-paper-deep px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft capitalize">
                      {ch.pillar}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold text-ink group-hover:text-gold transition-colors">
                    {ch.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft line-clamp-2">
                    {ch.teaser}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-faint">
                  <span>{ch.duration}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gold">
                    Read & Audit <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filteredChapters.length > 9 && (
            <div className="mt-6 text-center">
              <Link
                href="/chapters/"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-6 py-2 text-xs font-semibold text-ink hover:border-gold hover:text-gold transition-colors"
              >
                Browse All 28 Chapters & Verifications →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      {showScheduler && (
        <DailyScheduleBlockerModal onClose={() => setShowScheduler(false)} />
      )}

      {activeProtocol && (
        <ProtocolRunnerModal
          protocol={activeProtocol}
          onClose={() => setActiveProtocol(null)}
        />
      )}
    </div>
  );
}
