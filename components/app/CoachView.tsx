"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, CalendarRange, Gauge, History, ListChecks, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useClientToday } from "@/lib/clientToday";
import { missionIsComplete, missionsForDay, SKILL_META, strongestAndNeglected, useLifeStore, weeklySummary } from "@/lib/life";
import { useOSStore } from "@/lib/os/store";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { AppPageHeader, EmptyAppState } from "./AppUI";

type CoachAction = "plan" | "easier" | "harder" | "recover" | "explain" | "focus" | "review" | "next";
const ACTIONS: { id: CoachAction; label: string; detail: string; icon: typeof ListChecks }[] = [
  { id: "plan", label: "Plan my day", detail: "Put today's work in a sensible order", icon: ListChecks },
  { id: "easier", label: "Make it easier", detail: "Shrink the next action without faking it", icon: Gauge },
  { id: "harder", label: "Give me a challenge", detail: "Raise difficulty when energy is good", icon: TrendingUp },
  { id: "recover", label: "Help me restart", detail: "Recover after missed or messy days", icon: RotateCcw },
  { id: "explain", label: "Explain my progress", detail: "Read the evidence in plain language", icon: History },
  { id: "focus", label: "Give me a focus block", detail: "Start one bounded work session", icon: BrainCircuit },
  { id: "review", label: "Review my week", detail: "Keep what worked and change one thing", icon: CalendarRange },
  { id: "next", label: "What should I train next?", detail: "Balance a neglected skill", icon: Sparkles },
];

export default function CoachView() {
  const state = useLifeStore();
  const os = useOSStore();
  const today = useClientToday();
  const [selected, setSelected] = useState<CoachAction>("plan");
  const profile = state.profile;
  const missions = useMemo(() => profile && today ? missionsForDay(profile, today) : [], [profile, today]);
  const week = useMemo(() => today ? weeklySummary(state, today) : { completed: 0, minutes: 0, xp: 0, activeDays: 0 }, [state, today]);

  if (!profile) return <div className="app-page"><EmptyAppState title="Coach needs a little context" body="Build your private starter profile so the Coach can use your goals, time, and progress instead of giving generic advice." action={<Link href="/onboarding/" className="life-primary-button">Build my plan <ArrowRight aria-hidden="true" /></Link>} /></div>;

  const remaining = missions.filter((mission) => !missionIsComplete(state, mission.id));
  const easiest = [...remaining].sort((a, b) => a.minutes - b.minutes)[0] ?? missions[0];
  const hardest = [...missions].sort((a, b) => b.minutes - a.minutes)[0];
  const balance = strongestAndNeglected(state);
  const overdue = Object.values(os.sessions).filter((session) => today && session.date < today && session.status !== "completed").length;

  const responses: Record<CoachAction, { eyebrow: string; title: string; body: string; steps: string[]; href: string; action: string }> = {
    plan: { eyebrow: "Today's order", title: remaining.length ? `Begin with ${remaining[0].title}` : "The useful work is already done", body: remaining.length ? `It matches your main ${SKILL_META[remaining[0].skill].label.toLowerCase()} goal and needs ${remaining[0].minutes} protected minutes. Do the smaller missions only after this one has a real result.` : "Do not manufacture more tasks for XP. Recover, review the day, or spend time away from the app.", steps: remaining.map((mission) => `${mission.minutes} min · ${mission.title}`), href: remaining.length ? "/today/" : "/review/", action: remaining.length ? "Open today's plan" : "Close the day" },
    easier: { eyebrow: "Minimum useful version", title: `Shrink it to ${Math.max(2, Math.round(easiest.minutes / 2))} honest minutes`, body: `Start ${easiest.title.toLowerCase()} with one visible outcome. Stopping after the smaller version is allowed; claiming work you did not do is not.`, steps: ["Remove one obvious distraction", "Write the next physical action", `Work for ${Math.max(2, Math.round(easiest.minutes / 2))} minutes`, "Record what actually moved"], href: "/today/", action: "Open the mission" },
    harder: { eyebrow: "Challenge mode", title: `${hardest.title}, with proof`, body: `Protect the full ${hardest.minutes}-minute block and finish with a concrete artifact, result, or reflection. Difficulty comes from deeper practice, not more tapping.`, steps: ["Define the finish line first", "Use one uninterrupted block", "Capture a result someone else could inspect"], href: "/today/", action: "Take the challenge" },
    recover: { eyebrow: "Recovery protocol", title: overdue ? `You have ${overdue} unfinished block${overdue === 1 ? "" : "s"}. Restart one.` : "Nothing needs rescuing. Keep today small.", body: "A reset is not a punishment. Choose the smallest important task, lower the starting friction, and collect one new proof before redesigning the whole week.", steps: ["Name what interrupted the plan", "Cut the next action in half", "Restart once, without catching up everything", "Review after the attempt"], href: overdue ? "/review/" : "/today/", action: overdue ? "Open recovery" : "Return to Today" },
    explain: { eyebrow: "Evidence read", title: `${state.progression.completions.length} missions and ${state.progression.totalXp} earned XP`, body: week.completed ? `This week you invested ${week.minutes} minutes across ${week.activeDays} active day${week.activeDays === 1 ? "" : "s"}. ${SKILL_META[balance.strongest].label} currently has the strongest evidence.` : "There is not enough evidence for a pattern yet. Complete one mission; the Coach will explain behavior, not invent a personality from empty data.", steps: [`Current streak: ${state.progression.streak.current} day(s)`, `Strongest evidence: ${SKILL_META[balance.strongest].label}`, `Least trained: ${SKILL_META[balance.neglected].label}`], href: "/progress/", action: "See full progress" },
    focus: { eyebrow: "Bounded block", title: `Protect ${remaining[0]?.minutes ?? 20} minutes for one outcome`, body: "Put the phone out of reach, keep only the tools needed for the task, and decide what 'done enough' means before starting.", steps: ["One outcome", "One visible timer", "One completion note"], href: "/focus/", action: "Open Focus room" },
    review: { eyebrow: "Weekly review", title: week.completed ? `Keep the pattern behind ${week.completed} completed missions` : "Build one proof before judging the week", body: week.completed ? `You invested ${week.minutes} minutes. Keep the condition that made starting easiest, and change only one recurring source of friction.` : "An empty week is not an identity verdict. Pick a five-minute restart and use that result as the first data point.", steps: ["What helped you start?", "Where did plans become unrealistic?", "What single change will next week test?"], href: "/review/", action: "Write the review" },
    next: { eyebrow: "Balance suggestion", title: `Give ${SKILL_META[balance.neglected].label} one small proof`, body: `${SKILL_META[balance.strongest].label} has the most XP right now. A short ${SKILL_META[balance.neglected].label.toLowerCase()} mission would widen your system without abandoning what is working.`, steps: [SKILL_META[balance.neglected].short, "Choose a 5–15 minute version", "Return to your main path tomorrow"], href: "/journey/", action: "Explore the path" },
  };
  const response = responses[selected];

  return (
    <div className="app-page coach-page">
      <AppPageHeader eyebrow="Contextual, local, honest" title="Coach the next decision, not your entire life." description="The Coach reads only the progress stored on this device. It offers structured actions and never pretends a generic chat response knows you deeply." />
      <div className="coach-layout"><section className="coach-actions"><p>What would help now?</p>{ACTIONS.map((action) => { const Icon = action.icon; return <button type="button" key={action.id} className={selected === action.id ? "is-active" : ""} onClick={() => { setSelected(action.id); trackEvent(ANALYTICS_EVENTS.coachUsed, { coach_action: action.id }); }}><Icon aria-hidden="true" /><span><strong>{action.label}</strong><small>{action.detail}</small></span><ArrowRight aria-hidden="true" /></button>; })}</section>
      <section className="coach-response" aria-live="polite"><header><BrainCircuit aria-hidden="true" /><div><p>{response.eyebrow}</p><span>Based on your local LevelUp record</span></div></header><h2>{response.title}</h2><p>{response.body}</p><ol>{response.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><Link href={response.href} className="life-primary-button">{response.action}<ArrowRight aria-hidden="true" /></Link><footer><span>Private local coach</span><span>No journal or reflection text is sent anywhere</span></footer></section></div>
    </div>
  );
}
