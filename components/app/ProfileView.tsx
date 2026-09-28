"use client";

import Link from "next/link";
import { ArrowRight, Check, Database, LockKeyhole, Pencil, ShieldCheck, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { achievementsFor, LIFE_SKILLS, SKILL_META, skillLevel, updateLifePreferences, useLifeStore } from "@/lib/life";
import { PREMIUM_FEATURES } from "@/lib/entitlements";
import { AppPageHeader, CompanionCard, EmptyAppState, SkillBadge, XPMeter } from "./AppUI";

export default function ProfileView() {
  const state = useLifeStore();
  const profile = state.profile;
  if (!profile) return <div className="app-page"><EmptyAppState title="Build the identity you want to see here" body="Your profile is not social media. It becomes a private record of skills, milestones, and the person your actions are building." action={<Link href="/onboarding/" className="life-primary-button">Start my path <ArrowRight aria-hidden="true" /></Link>} /></div>;
  const achievements = achievementsFor(state);
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
  const displayName = profile.name || "Builder";

  return (
    <div className="app-page profile-page">
      <AppPageHeader eyebrow="Who you are becoming" title={`${displayName}'s LevelUp profile`} description="Private identity, earned through action. Nothing here is public and no account is required." actions={<Link href="/onboarding/?edit=1" className="life-secondary-button"><Pencil aria-hidden="true" />Edit direction</Link>} />
      <section className="profile-identity"><CompanionCard state={state} /><div className="profile-level"><p>Current identity</p><h2>{displayName}</h2><span>{profile.goals.map((skill) => SKILL_META[skill].label).join(" · ")}</span><XPMeter state={state} /><div><span><strong>{state.progression.completions.length}</strong> missions</span><span><strong>{state.progression.streak.best}</strong> best streak</span><span><strong>{unlocked}</strong> achievements</span></div></div></section>

      <div className="profile-grid"><section className="profile-panel"><header><div><p>Skill identity</p><h2>Your current build</h2></div><Sparkles aria-hidden="true" /></header><div className="profile-skills">{LIFE_SKILLS.map((skill) => { const xp = state.progression.skillXp[skill]; return <article key={skill}><SkillBadge skill={skill} /><strong>Level {skillLevel(xp)}</strong><span>{xp} XP</span></article>; })}</div></section>

      <section className="profile-panel"><header><div><p>Achievements</p><h2>Proof worth remembering</h2></div><span>{unlocked}/{achievements.length}</span></header><div className="achievement-list">{achievements.map((achievement) => <article key={achievement.id} className={achievement.unlocked ? "is-unlocked" : ""}><i>{achievement.unlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</i><div><strong>{achievement.title}</strong><span>{achievement.description}</span></div></article>)}</div></section>

      <section className="profile-panel profile-settings"><header><div><p>Experience</p><h2>Comfort and privacy</h2></div><ShieldCheck aria-hidden="true" /></header><button type="button" onClick={() => updateLifePreferences({ reducedMotion: !state.preferences.reducedMotion })}><span><strong>Reduce motion</strong><small>Use simpler transitions and companion movement</small></span>{state.preferences.reducedMotion ? <ToggleRight aria-hidden="true" /> : <ToggleLeft aria-hidden="true" />}</button><button type="button" onClick={() => updateLifePreferences({ sound: !state.preferences.sound })}><span><strong>Celebration sounds</strong><small>Off by default and never required</small></span>{state.preferences.sound ? <ToggleRight aria-hidden="true" /> : <ToggleLeft aria-hidden="true" />}</button><Link href="/backup/"><span><strong>Backup or restore</strong><small>Export your local history as a file</small></span><Database aria-hidden="true" /></Link></section>

      <section className="profile-panel premium-preview"><header><div><p>LevelUp Plus · future-ready</p><h2>The free loop stays complete.</h2></div><span>Not for sale yet</span></header><p>Premium architecture is separated from the core experience, but billing is intentionally not connected. No fake checkout, no blocked onboarding.</p><ul>{PREMIUM_FEATURES.map((feature) => <li key={feature.entitlement}><Sparkles aria-hidden="true" />{feature.label}</li>)}</ul><small>Core missions, progress, the manual, and basic Coach remain free.</small></section></div>
    </div>
  );
}
