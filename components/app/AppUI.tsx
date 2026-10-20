import type { ReactNode } from "react";
import { Check, Flame, Sparkles } from "lucide-react";
import { SKILL_META, companionStage, levelSummary, type LifeSkill, type LifeState } from "@/lib/life";

export function AppPageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="app-page-header">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>
      {actions ? <div className="app-page-actions">{actions}</div> : null}
    </header>
  );
}

export function SkillBadge({ skill }: { skill: LifeSkill }) {
  const meta = SKILL_META[skill];
  return <span className="skill-badge" style={{ "--skill-color": meta.color } as React.CSSProperties}><i />{meta.label}</span>;
}

export function XPMeter({ state, compact = false }: { state: LifeState; compact?: boolean }) {
  const level = levelSummary(state.progression.totalXp);
  return (
    <div className={`xp-meter ${compact ? "is-compact" : ""}`}>
      <div className="xp-meter-row"><span>Level {level.level} · {level.title}</span><strong>{level.currentXp} XP</strong></div>
      <div className="xp-meter-track" aria-label={`${Math.round(level.progress * 100)}% to level ${level.level + 1}`}><i style={{ width: `${level.progress * 100}%` }} /></div>
      {!compact ? <small>{Math.max(0, level.nextXp - level.currentXp)} XP to level {level.level + 1}</small> : null}
    </div>
  );
}

const STAGE_COPY = {
  seed: "Milo is waiting for your first proof.",
  spark: "Milo noticed the first real step.",
  scout: "Milo is learning your rhythm.",
  builder: "Milo's room is taking shape.",
  guide: "Milo has grown into a steady guide.",
  legend: "Milo carries the history you built together.",
};

export function CompanionCard({ state, compact = false }: { state: LifeState; compact?: boolean }) {
  const stage = companionStage(state.progression.completions.length);
  return (
    <section className={`life-companion-card stage-${stage} ${compact ? "is-compact" : ""}`} aria-label={`Milo companion, ${stage} stage`}>
      <div className="life-companion-scene" aria-hidden="true">
        <span className="life-companion-orbit" />
        <span className="life-companion-body"><i className="ear left" /><i className="ear right" /><i className="eye left" /><i className="eye right" /><i className="mouth" /></span>
        <Sparkles className="life-companion-spark" />
      </div>
      <div><p>Milo · {stage}</p><h2>{STAGE_COPY[stage]}</h2>{!compact ? <span>Complete meaningful missions to evolve Milo and the room. No tapping or fake rewards count.</span> : null}</div>
    </section>
  );
}

export function StreakPill({ current }: { current: number }) {
  return <span className="streak-pill"><Flame aria-hidden="true" />{current} day{current === 1 ? "" : "s"}</span>;
}

export function CompletionMark({ complete }: { complete: boolean }) {
  return <span className={`completion-mark ${complete ? "is-complete" : ""}`} aria-label={complete ? "Completed" : "Not completed"}>{complete ? <Check aria-hidden="true" /> : null}</span>;
}

export function EmptyAppState({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return <section className="app-empty"><span className="app-empty-mark" aria-hidden="true">↗</span><div><h1>{title}</h1><p>{body}</p>{action}</div></section>;
}
