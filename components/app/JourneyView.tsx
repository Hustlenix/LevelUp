"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Flag, LockKeyhole, Map, Sparkles } from "lucide-react";
import { useClientToday } from "@/lib/clientToday";
import { LIFE_SKILLS, SKILL_META, missionIsComplete, missionsForDay, skillLevel, useLifeStore, type LifeSkill } from "@/lib/life";
import { AppPageHeader, EmptyAppState, SkillBadge } from "./AppUI";

function dateOffset(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export default function JourneyView() {
  const state = useLifeStore();
  const today = useClientToday();
  const [selected, setSelected] = useState<LifeSkill>(state.profile?.goals[0] ?? "focus");
  const profile = state.profile;
  const nodes = useMemo(() => {
    if (!profile || !today) return [];
    const pathProfile = { ...profile, goals: [selected] };
    return Array.from({ length: 7 }, (_, index) => {
      const date = dateOffset(today, index - 1);
      const mission = missionsForDay(pathProfile, date)[0];
      return { mission, offset: index - 1, complete: missionIsComplete(state, mission.id) };
    });
  }, [profile, selected, state, today]);

  if (!profile) return <div className="app-page"><EmptyAppState title="Your journey needs a direction" body="Choose the skills you want to strengthen and LevelUp will build the first path." action={<Link href="/onboarding/" className="life-primary-button">Set my direction <ArrowRight aria-hidden="true" /></Link>} /></div>;

  const meta = SKILL_META[selected];
  const selectedXp = state.progression.skillXp[selected];
  const completed = state.progression.completions.filter((record) => record.skill === selected).length;

  return (
    <div className="app-page journey-page">
      <AppPageHeader eyebrow="Your growth map" title="See the road, then take the next node." description="Every path is built from real actions. Future nodes stay visible so you can plan, but useful content is never hidden behind artificial locks." />
      <section className="journey-overview" style={{ "--skill-color": meta.color } as React.CSSProperties}><div><SkillBadge skill={selected} /><h2>{meta.short}</h2><p>A seven-node starter path that adapts to your pace. Complete today&apos;s mission to move the marker.</p></div><div><span>Skill level</span><strong>{skillLevel(selectedXp)}</strong><small>{selectedXp} XP · {completed} missions</small></div><Map aria-hidden="true" /></section>

      <div className="journey-layout">
        <aside className="journey-path-list"><p>Choose a path</p>{LIFE_SKILLS.map((skill) => { const skillMeta = SKILL_META[skill]; const count = state.progression.completions.filter((record) => record.skill === skill).length; return <button type="button" key={skill} className={selected === skill ? "is-active" : ""} onClick={() => setSelected(skill)} style={{ "--skill-color": skillMeta.color } as React.CSSProperties}><i /><span><strong>{skillMeta.label}</strong><small>Level {skillLevel(state.progression.skillXp[skill])} · {count} proof{count === 1 ? "" : "s"}</small></span><ArrowRight aria-hidden="true" /></button>; })}</aside>

        <section className="journey-map" aria-label={`${meta.label} journey nodes`}>
          <header><div><p>Chapter 1</p><h2>The first seven proofs</h2></div><span>{nodes.filter((node) => node.complete).length}/7 complete</span></header>
          <ol>{nodes.map(({ mission, offset, complete }, index) => { const current = offset === 0; const future = offset > 0; return <li key={mission.id} className={`${complete ? "is-complete" : ""} ${current ? "is-current" : ""} ${future ? "is-future" : ""}`}><div className="journey-line"><i>{complete ? <Check aria-hidden="true" /> : current ? <Flag aria-hidden="true" /> : future ? <LockKeyhole aria-hidden="true" /> : index + 1}</i></div><article><div><span>{offset < 0 ? "Previous node" : current ? "Current node" : `Day ${offset + 1}`}</span><small>{mission.minutes} min · +{mission.xp} XP</small></div><h3>{mission.title}</h3><p>{mission.description}</p>{current && !complete ? <Link href="/today/" className="journey-node-action">Go to today&apos;s mission <ArrowRight aria-hidden="true" /></Link> : complete ? <strong className="journey-node-done"><Check aria-hidden="true" />Proof recorded</strong> : null}</article></li>; })}</ol>
          <footer><Sparkles aria-hidden="true" /><p><strong>Checkpoint reward</strong><span>Finish five nodes to strengthen this skill and move Milo&apos;s room forward.</span></p></footer>
        </section>
      </div>
    </div>
  );
}
