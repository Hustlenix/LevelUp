"use client";

import { useOSStore } from "@/lib/os";
import { useClientToday } from "@/lib/clientToday";
import { useStudentProfile } from "@/lib/studentProfile";
import { useGamification } from "@/lib/useGamification";
import { buildDayMissions, greetingFor, type Mission } from "@/lib/mission";
import { computeProgression, SKILLS } from "@/lib/progression";
import { RoadmapTree } from "@/components/LevelUpOSWorkspace";
import {
  ActionLink,
  EmptyState,
  MetricStrip,
  PrimaryActionCard,
  SectionCard,
  StatusPill,
  WorkspaceHeader,
} from "@/components/workspace";

function skillLabel(id: Mission["skill"]): string {
  return SKILLS.find((s) => s.id === id)?.label ?? id;
}

function difficultyLabel(d: Mission["difficulty"]): string {
  if (d === 1) return "Light";
  if (d === 2) return "Medium";
  return "Deep";
}

export default function JourneyView() {
  const os = useOSStore();
  const date = useClientToday();
  const profile = useStudentProfile();
  const gamification = useGamification();

  const hours = new Date().getHours();
  const missions = buildDayMissions(os, date);
  // computeProgression requires a real date (parseDay("") throws), and
  // useClientToday returns "" during static prerender — so defer until the
  // client date snaps in after hydration, matching the LevelUpOSWorkspace guard.
  const progression = date ? computeProgression(os, gamification.state, date) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <WorkspaceHeader
        eyebrow="Journey"
        title={greetingFor(profile.identity.name ?? null, hours)}
        description="One mission leads the day; the roadmap keeps the rest on track."
      />

      <MetricStrip
        items={[
          { label: "XP", value: String(gamification.xp) },
          { label: "Level", value: gamification.level.name },
          {
            label: "Streak",
            value: String(progression?.streak.current ?? 0),
            detail:
              progression && progression.streak.best > progression.streak.current
                ? `best ${progression.streak.best}`
                : undefined,
          },
        ]}
      />

      <div className="mt-8">
        <PrimaryActionCard
          eyebrow="Today's mission"
          title={missions.primary.title}
          description={missions.primary.subtitle}
          meta={`${missions.primary.minutes} min · ${missions.primary.xpReward} XP · ${difficultyLabel(
            missions.primary.difficulty,
          )} · ${skillLabel(missions.primary.skill)}`}
          href={missions.primary.href}
          actionLabel={missions.primary.done ? "Done" : "Start"}
        />
      </div>

      <section aria-labelledby="journey-secondary" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="journey-secondary" className="font-display text-xl font-semibold text-ink">
            Also today
          </h2>
          {missions.hasPlan || missions.nextAction ? (
            <p className="text-sm text-ink-soft">
              Up next: <span className="font-medium text-ink">{missions.nextAction}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {missions.secondary.map((mission) => (
            <SectionCard key={mission.id}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone="neutral">{skillLabel(mission.skill)}</StatusPill>
                  <span className="text-xs text-ink-faint">
                    {mission.minutes} min · {mission.xpReward} XP
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-ink">
                  {mission.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{mission.subtitle}</p>
                <div className="mt-auto pt-4">
                  <ActionLink href={mission.href} variant="secondary">
                    {mission.done ? "Done" : "Do it"}
                  </ActionLink>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      </section>

      {!missions.hasPlan && (
        <div className="mt-8">
          <EmptyState
            eyebrow="No active plan"
            title="Your journey starts with one goal"
            description="Create a goal, and tomorrow's missions will drive themselves from the roadmap you build."
            href="/goals/"
            actionLabel="Create a goal"
          />
        </div>
      )}

      <div className="mt-8">
        <RoadmapTree state={os} />
      </div>
    </div>
  );
}
