"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Flame, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { Chapter } from "@/lib/types";
import { overallStats, useProgressStore } from "@/lib/progress";
import { useClientToday } from "@/lib/clientToday";
import { LIFE_SKILLS, SKILL_META, skillLevel, strongestAndNeglected, useLifeStore, weeklySummary } from "@/lib/life";
import { AppPageHeader, EmptyAppState, SkillBadge, XPMeter } from "./AppUI";

function offsetDate(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export default function LifeProgressView({ chapters }: { chapters: Chapter[] }) {
  const state = useLifeStore();
  const reading = useProgressStore();
  const today = useClientToday();
  const readingStats = overallStats(reading, chapters.length);
  if (!state.profile) return <div className="app-page"><EmptyAppState title="Progress starts with one real action" body="Create your starter path, complete a mission, and this page will turn your activity into useful evidence." action={<Link href="/onboarding/" className="life-primary-button">Build my plan <ArrowRight aria-hidden="true" /></Link>} /></div>;
  if (!today) return <div className="app-loading"><i /><i /><i /></div>;

  const current = weeklySummary(state, today);
  const previousEnd = offsetDate(today, -7);
  const previous = weeklySummary(state, previousEnd);
  const minuteDelta = current.minutes - previous.minutes;
  const totalMinutes = state.progression.completions.reduce((sum, record) => sum + record.minutes, 0);
  const balance = strongestAndNeglected(state);
  const maxSkillXp = Math.max(1, ...Object.values(state.progression.skillXp));
  const heatmapDates = Array.from({ length: 28 }, (_, index) => offsetDate(today, index - 27));
  const recordsByDate = new Map<string, number>();
  state.progression.completions.forEach((record) => recordsByDate.set(record.date, (recordsByDate.get(record.date) ?? 0) + 1));

  return (
    <div className="app-page progress-page">
      <AppPageHeader eyebrow="Your evidence" title="Compare yourself with your own past." description="Progress is useful when it changes the next decision. LevelUp shows consistency, time, skill balance, and personal records without public rankings." actions={<Link href="/backup/" className="life-secondary-button">Backup data</Link>} />
      <section className="progress-hero"><div><p>Total progression</p><XPMeter state={state} /></div><div className="progress-hero-metrics"><article><CheckCircle2 aria-hidden="true" /><span>Missions</span><strong>{state.progression.completions.length}</strong><small>real actions recorded</small></article><article><Clock3 aria-hidden="true" /><span>Time invested</span><strong>{totalMinutes}m</strong><small>across every skill</small></article><article><Flame aria-hidden="true" /><span>Best streak</span><strong>{state.progression.streak.best}</strong><small>active days in a row</small></article></div></section>

      <div className="progress-grid"><section className="progress-panel progress-heatmap"><header><div><p>Last 28 days</p><h2>Consistency map</h2></div><span>{current.activeDays} active days this week</span></header><div className="heatmap-grid" aria-label="Mission activity over the last 28 days">{heatmapDates.map((date) => { const count = recordsByDate.get(date) ?? 0; return <i key={date} data-count={Math.min(count, 3)} title={`${date}: ${count} mission${count === 1 ? "" : "s"}`} aria-label={`${date}, ${count} completed missions`} />; })}</div><footer><span>Less</span><i data-count="0" /><i data-count="1" /><i data-count="2" /><i data-count="3" /><span>More</span></footer></section>

      <section className="progress-panel weekly-compare"><header><div><p>Week over week</p><h2>{minuteDelta >= 0 ? "Momentum increased" : "The week got lighter"}</h2></div>{minuteDelta >= 0 ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}</header><div><span><small>This week</small><strong>{current.minutes}m</strong><i style={{ width: `${Math.min(100, (current.minutes / Math.max(current.minutes, previous.minutes, 1)) * 100)}%` }} /></span><span><small>Previous week</small><strong>{previous.minutes}m</strong><i style={{ width: `${Math.min(100, (previous.minutes / Math.max(current.minutes, previous.minutes, 1)) * 100)}%` }} /></span></div><p>{minuteDelta === 0 ? "Your invested time is unchanged." : `${Math.abs(minuteDelta)} minutes ${minuteDelta > 0 ? "more" : "less"} than the previous seven days.`} Use this as information, not a score.</p></section>

      <section className="progress-panel skill-balance"><header><div><p>Skill distribution</p><h2>Where your effort is going</h2></div><span>{SKILL_META[balance.strongest].label} leads</span></header><div>{LIFE_SKILLS.map((skill) => { const xp = state.progression.skillXp[skill]; return <article key={skill}><div><SkillBadge skill={skill} /><span>Lv. {skillLevel(xp)} · {xp} XP</span></div><i><b style={{ width: `${(xp / maxSkillXp) * 100}%`, backgroundColor: SKILL_META[skill].color }} /></i></article>; })}</div><footer>Least trained: <strong>{SKILL_META[balance.neglected].label}</strong>. Train it only if balance supports your real goals.</footer></section>

      <section className="progress-panel personal-records"><header><div><p>Personal records</p><h2>Your strongest proof so far</h2></div><Sparkles aria-hidden="true" /></header><dl><div><dt>Most missions in one day</dt><dd>{Math.max(0, ...recordsByDate.values())}</dd></div><div><dt>Most trained skill</dt><dd>{SKILL_META[balance.strongest].label}</dd></div><div><dt>Manual progress</dt><dd>{readingStats.pct}%</dd></div><div><dt>Current streak</dt><dd>{state.progression.streak.current}d</dd></div></dl></section></div>

      <section className="reading-progress-bridge"><BookOpenCheck aria-hidden="true" /><div><p>Learning evidence</p><h2>{readingStats.done} of {chapters.length} manual chapters completed</h2><span>Your reading stays part of LevelUp, but it does not replace real-world missions.</span></div><div className="reading-progress-track"><i style={{ width: `${readingStats.pct}%` }} /></div><Link href="/chapters/">Continue learning <ArrowRight aria-hidden="true" /></Link></section>
    </div>
  );
}
