"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3, Compass, Gauge, MoonStar } from "lucide-react";
import { LIFE_SKILLS, SKILL_META, saveLifeProfile, useLifeStore, type ConsistencyLevel, type LifeIntensity, type LifeSkill } from "@/lib/life";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

const STEPS = ["Direction", "Time", "Pace", "Rhythm"] as const;

export default function OnboardingFlow() {
  const router = useRouter();
  const saved = useLifeStore();
  const hydratedProfile = useRef(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<LifeSkill[]>(["focus"]);
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<LifeIntensity>("steady");
  const [consistency, setConsistency] = useState<ConsistencyLevel>("starting");
  const [wakeTime, setWakeTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");

  useEffect(() => {
    if (!saved.profile || hydratedProfile.current) return;
    hydratedProfile.current = true;
    setName(saved.profile.name);
    setGoals(saved.profile.goals);
    setMinutes(saved.profile.minutesPerDay);
    setIntensity(saved.profile.intensity);
    setConsistency(saved.profile.consistency);
    setWakeTime(saved.profile.wakeTime ?? "");
    setSleepTime(saved.profile.sleepTime ?? "");
  }, [saved.profile]);

  const dailySplit = useMemo(() => [Math.max(5, Math.round(minutes * 0.55)), Math.max(5, Math.round(minutes * 0.25)), Math.max(5, Math.round(minutes * 0.2))], [minutes]);

  function toggleGoal(skill: LifeSkill) {
    setGoals((current) => current.includes(skill) ? (current.length === 1 ? current : current.filter((item) => item !== skill)) : current.length >= 3 ? current : [...current, skill]);
    trackEvent(ANALYTICS_EVENTS.goalSelected, { skill });
  }

  function finish() {
    saveLifeProfile({ name: name.trim().slice(0, 40), goals, minutesPerDay: minutes, intensity, consistency, wakeTime: wakeTime || null, sleepTime: sleepTime || null });
    trackEvent(ANALYTICS_EVENTS.onboardingCompleted, { duration: minutes * 60, skill: goals[0] });
    router.push("/today/");
  }

  return (
    <div className="onboarding-shell interface-font">
      <aside className="onboarding-story">
        <div className="onboarding-wordmark"><span>L</span>LevelUp</div>
        <div><p className="onboarding-kicker">Build a system that fits your life</p><h1>Start with one honest direction.</h1><p>LevelUp turns the time you actually have into a small daily plan. No account, no guilt, and no rewards for pretending.</p></div>
        <ol>{STEPS.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}><span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
        <small>Stored privately in this browser. You can export or erase it at any time.</small>
      </aside>

      <main className="onboarding-main" aria-live="polite">
        <div className="onboarding-progress"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        {step === 0 ? <section>
          <Compass className="onboarding-step-icon" aria-hidden="true" /><p className="onboarding-step-count">Step 1 of 4</p><h2>What do you want to strengthen?</h2><p className="onboarding-lede">Choose up to three. Your first choice becomes the main mission each day.</p>
          <div className="goal-choice-grid">{LIFE_SKILLS.map((skill) => { const selected = goals.includes(skill); const meta = SKILL_META[skill]; return <button key={skill} type="button" aria-pressed={selected} onClick={() => toggleGoal(skill)} className={selected ? "is-selected" : ""} style={{ "--skill-color": meta.color } as React.CSSProperties}><i /><span><strong>{meta.label}</strong><small>{meta.short}</small></span>{selected ? <Check aria-hidden="true" /> : null}</button>; })}</div>
          <p className="onboarding-hint">{goals.length}/3 selected</p>
        </section> : null}

        {step === 1 ? <section>
          <Clock3 className="onboarding-step-icon" aria-hidden="true" /><p className="onboarding-step-count">Step 2 of 4</p><h2>How much time is honestly available?</h2><p className="onboarding-lede">Choose the budget you can protect on an ordinary day, not your best day.</p>
          <div className="time-choice-row">{[15, 30, 45, 60].map((value) => <button key={value} type="button" className={minutes === value ? "is-selected" : ""} onClick={() => setMinutes(value)}><strong>{value}</strong><span>min/day</span></button>)}</div>
          <div className="day-preview"><p>Your plan will roughly use:</p><div>{dailySplit.map((value, index) => <span key={index}><strong>{value}m</strong>{index === 0 ? " main mission" : index === 1 ? " second skill" : " reset"}</span>)}</div></div>
        </section> : null}

        {step === 2 ? <section>
          <Gauge className="onboarding-step-icon" aria-hidden="true" /><p className="onboarding-step-count">Step 3 of 4</p><h2>Pick the pace you can sustain.</h2><p className="onboarding-lede">Intensity changes mission size, not your worth. You can change it later.</p>
          <div className="stacked-choices">{([
            ["gentle", "Gentle", "Smaller missions, easier restarts"], ["steady", "Steady", "Balanced work and recovery"], ["ambitious", "Ambitious", "Longer blocks and harder challenges"],
          ] as [LifeIntensity, string, string][]).map(([value, label, copy]) => <button type="button" key={value} className={intensity === value ? "is-selected" : ""} onClick={() => setIntensity(value)}><span><strong>{label}</strong><small>{copy}</small></span><i /></button>)}</div>
          <fieldset className="consistency-field"><legend>Right now, I am…</legend>{([[
            "starting", "starting again"], ["sometimes", "inconsistent but trying"], ["consistent", "already fairly consistent"],
          ] as [ConsistencyLevel, string][]).map(([value, label]) => <label key={value}><input type="radio" name="consistency" checked={consistency === value} onChange={() => setConsistency(value)} />{label}</label>)}</fieldset>
        </section> : null}

        {step === 3 ? <section>
          <MoonStar className="onboarding-step-icon" aria-hidden="true" /><p className="onboarding-step-count">Step 4 of 4</p><h2>Make it feel like yours.</h2><p className="onboarding-lede">Only your name is useful for the greeting. The schedule is optional and stays on this device.</p>
          <div className="onboarding-fields"><label><span>What should LevelUp call you? <small>optional</small></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Your name" /></label><div><label><span>Usual wake time <small>optional</small></span><input type="time" value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} /></label><label><span>Usual sleep time <small>optional</small></span><input type="time" value={sleepTime} onChange={(event) => setSleepTime(event.target.value)} /></label></div></div>
          <div className="onboarding-summary"><p>Your starting system</p><strong>{goals.map((skill) => SKILL_META[skill].label).join(" + ")}</strong><span>{minutes} minutes · {intensity} pace · first mission ready today</span></div>
        </section> : null}

        <footer className="onboarding-actions">
          <button type="button" className="onboarding-back" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft aria-hidden="true" />Back</button>
          {step < STEPS.length - 1 ? <button type="button" className="onboarding-next" onClick={() => { if (step === 0) trackEvent(ANALYTICS_EVENTS.onboardingStarted); setStep((value) => value + 1); }}>Continue<ArrowRight aria-hidden="true" /></button> : <button type="button" className="onboarding-next" onClick={finish}>Build my first day<ArrowRight aria-hidden="true" /></button>}
        </footer>
      </main>
    </div>
  );
}
