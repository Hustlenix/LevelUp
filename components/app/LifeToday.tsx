"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Clock3, Flag, Flame, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import { useClientToday } from "@/lib/clientToday";
import {
  completeLifeMission,
  missionIsComplete,
  missionsForDay,
  quickStartLife,
  SKILL_META,
  useLifeStore,
  weeklySummary,
  type DailyMission,
} from "@/lib/life";
import { useOSStore } from "@/lib/os/store";
import { emitCompanionEvent } from "@/lib/companion";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { AppPageHeader, CompanionCard, SkillBadge, StreakPill, XPMeter } from "./AppUI";

function FirstRunToday() {
  return (
    <div className="life-first-run">
      <section className="life-first-hero">
        <div><p>Your life, turned into a playable plan</p><h1>Know what to do next.<br />Build proof that you did it.</h1><span>LevelUp creates a small daily path from your goals and available time. The app rewards completed real-world actions, not taps or screen time.</span><div className="life-first-actions"><Link href="/onboarding/" className="life-primary-button">Build my plan <ArrowRight aria-hidden="true" /></Link><button type="button" onClick={() => { quickStartLife(); trackEvent(ANALYTICS_EVENTS.onboardingCompleted, { quick_start: true }); }} className="life-secondary-button">Try a 30-minute starter day</button></div><small><ShieldCheck aria-hidden="true" />No account required. Your data stays in this browser.</small></div>
        <div className="first-run-path" aria-label="How LevelUp works"><span><i>1</i><strong>Choose direction</strong><small>Focus, learning, fitness, and more</small></span><b /><span><i>2</i><strong>Do one mission</strong><small>A real action sized to your day</small></span><b /><span><i>3</i><strong>Build evidence</strong><small>XP, skills, Milo, and your journey grow</small></span></div>
      </section>
      <section className="life-principles"><article><Flag aria-hidden="true" /><h2>One clear main mission</h2><p>No dashboard scavenger hunt. Open the app and see the next useful action immediately.</p></article><article><Sparkles aria-hidden="true" /><h2>Progress with a memory</h2><p>Milo evolves from completed work and becomes a visual record of the effort you invested.</p></article><article><Flame aria-hidden="true" /><h2>Streaks without shame</h2><p>A missed day resets a number, not your identity. The coach helps you restart smaller.</p></article></section>
    </div>
  );
}

function MissionCard({ mission, complete, onStart, secondary = false }: { mission: DailyMission; complete: boolean; onStart: () => void; secondary?: boolean }) {
  const meta = SKILL_META[mission.skill];
  return (
    <article className={`daily-mission-card ${secondary ? "is-secondary" : "is-primary"} ${complete ? "is-complete" : ""}`} style={{ "--skill-color": meta.color } as React.CSSProperties}>
      <div className="daily-mission-top"><SkillBadge skill={mission.skill} /><span className="mission-difficulty">{mission.difficulty}</span></div>
      <div className="daily-mission-copy"><p>{mission.primary ? "Today's main mission" : "Side mission"}</p><h2>{mission.title}</h2><span>{mission.description}</span></div>
      <div className="daily-mission-meta"><span><Clock3 aria-hidden="true" />{mission.minutes} min</span><span><Sparkles aria-hidden="true" />+{mission.xp} XP</span></div>
      <button type="button" onClick={onStart} disabled={complete} className="daily-mission-action">{complete ? <><CheckCircle2 aria-hidden="true" />Completed</> : <><Play aria-hidden="true" />{secondary ? "Start" : "Start mission"}</>}</button>
    </article>
  );
}

function MissionRunner({ mission, onClose, onComplete }: { mission: DailyMission; onClose: () => void; onComplete: (proof: string) => void }) {
  const [seconds, setSeconds] = useState(0);
  const [proof, setProof] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.missionStarted, { skill: mission.skill, duration: mission.minutes * 60 });
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [mission]);

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="mission-runner-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="mission-runner" role="dialog" aria-modal="true" aria-labelledby="mission-runner-title">
        <button type="button" onClick={onClose} className="mission-runner-close" aria-label="Close mission"><X aria-hidden="true" /></button>
        <div className="mission-runner-header"><SkillBadge skill={mission.skill} /><span>{mission.difficulty} · {mission.minutes} minutes</span></div>
        <h2 id="mission-runner-title">{mission.title}</h2><p>{mission.description}</p>
        <div className="mission-clock"><span>Time in this mission</span><strong>{elapsed}</strong><small>The timer is a guide, not proof. Finish the real action before completing.</small></div>
        {!confirming ? <div className="mission-runner-actions"><button type="button" className="life-secondary-button" onClick={onClose}>Pause and return</button><button type="button" className="life-primary-button" onClick={() => setConfirming(true)}>I did the work <Check aria-hidden="true" /></button></div> : <div className="mission-proof"><label htmlFor="mission-proof">{mission.proofPrompt} <small>optional, private</small></label><textarea id="mission-proof" value={proof} onChange={(event) => setProof(event.target.value)} maxLength={280} rows={3} placeholder="A short note helps your future review." /><div><button type="button" className="life-secondary-button" onClick={() => setConfirming(false)}>Back</button><button type="button" className="life-primary-button" onClick={() => onComplete(proof)}>Complete · +{mission.xp} XP</button></div></div>}
      </section>
    </div>
  );
}

export default function LifeToday() {
  const state = useLifeStore();
  const os = useOSStore();
  const today = useClientToday();
  const [activeMission, setActiveMission] = useState<DailyMission | null>(null);
  const profile = state.profile;
  const missions = useMemo(() => profile && today ? missionsForDay(profile, today) : [], [profile, today]);
  const week = useMemo(() => today ? weeklySummary(state, today) : { completed: 0, minutes: 0, xp: 0, activeDays: 0 }, [state, today]);

  if (!profile) return <FirstRunToday />;
  if (!today || !missions.length) return <div className="app-loading" aria-label="Preparing today's plan"><i /><i /><i /></div>;

  const completedToday = missions.filter((mission) => missionIsComplete(state, mission.id)).length;
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });
  const greeting = profile.name ? `Ready, ${profile.name}?` : "Ready for one honest win?";
  const legacySessions = Object.values(os.sessions).filter((session) => session.date === today && session.status !== "completed").length;

  function complete(mission: DailyMission, proof: string) {
    completeLifeMission(mission, proof);
    emitCompanionEvent("study_session_completed", { value: mission.minutes });
    trackEvent(ANALYTICS_EVENTS.missionCompleted, { skill: mission.skill, duration: mission.minutes * 60, xp: mission.xp });
    setActiveMission(null);
  }

  return (
    <div className="app-page life-today">
      <AppPageHeader eyebrow={dateLabel} title={greeting} description={completedToday === missions.length ? "Today's plan is complete. Let the work count and recover well." : "Your plan is small on purpose. Finish the real action, then record the proof."} actions={<StreakPill current={state.progression.streak.current} />} />
      <section className="today-status-strip"><XPMeter state={state} compact /><div><span>Today</span><strong>{completedToday}/{missions.length}</strong><small>missions complete</small></div><div><span>This week</span><strong>{week.minutes}m</strong><small>{week.completed} meaningful actions</small></div></section>

      <div className="today-primary-grid">
        <MissionCard mission={missions[0]} complete={missionIsComplete(state, missions[0].id)} onStart={() => setActiveMission(missions[0])} />
        <CompanionCard state={state} compact />
      </div>

      <section className="today-secondary-section"><div className="section-title-row"><div><p>Keep the day balanced</p><h2>Two smaller missions</h2></div><span>{Math.max(0, profile.minutesPerDay - missions[0].minutes)} minutes planned</span></div><div className="today-secondary-grid">{missions.slice(1).map((mission) => <MissionCard key={mission.id} mission={mission} secondary complete={missionIsComplete(state, mission.id)} onStart={() => setActiveMission(mission)} />)}</div></section>

      <section className="weekly-quest"><div><p>Weekly quest</p><h2>Show up on five different days</h2><span>Consistency is the reward. The counter never punishes a restart.</span></div><div className="weekly-quest-days" aria-label={`${week.activeDays} of 5 active days`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < week.activeDays ? "is-filled" : ""}>{index < week.activeDays ? <Check aria-hidden="true" /> : index + 1}</i>)}</div><strong>{Math.min(week.activeDays, 5)}/5</strong></section>

      <section className="today-tools"><div><p>Need a different kind of help?</p><div><Link href="/coach/">Ask the Coach <ArrowRight aria-hidden="true" /></Link><Link href="/journey/">See your Journey <ArrowRight aria-hidden="true" /></Link><Link href="/focus/">Open Focus room <ArrowRight aria-hidden="true" /></Link></div></div>{legacySessions ? <span>{legacySessions} planned legacy session{legacySessions === 1 ? "" : "s"} ready in Focus.</span> : <span>Your older goals and manual progress are still available.</span>}</section>
      {activeMission ? <MissionRunner mission={activeMission} onClose={() => setActiveMission(null)} onComplete={(proof) => complete(activeMission, proof)} /> : null}
    </div>
  );
}
