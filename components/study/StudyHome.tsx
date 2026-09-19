"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStudentProfile } from "@/lib/studentProfile";
import { useProgressStore } from "@/lib/progress";
import { useHighlightsStore, useQuizStore, useReflectionsStore, useStreakStore } from "@/lib/activity";
import { useCalibrationStore, useFocusStore, usePillarsStore } from "@/lib/actionTools";
import { computeXp, type GamificationState } from "@/lib/gamification";
import type { SiteData } from "@/lib/types";
import { useClientToday } from "@/lib/clientToday";
import { buildAiContext } from "@/lib/ai/context";
import { buildContentDocuments } from "@/lib/ai/retrieval";
import AiStudyPanel from "@/components/study/AiStudyPanel";
import MissionCard from "@/components/study/MissionCard";
import ProgressTiles from "@/components/study/ProgressTiles";
import { PageShell, SectionHeading } from "@/components/ui";

export default function StudyHome({ data }: { data: SiteData }) {
  const profile = useStudentProfile();
  const progress = useProgressStore();
  const highlights = useHighlightsStore();
  const quiz = useQuizStore();
  const reflections = useReflectionsStore();
  const streak = useStreakStore();
  const calibrations = useCalibrationStore();
  const focusSessions = useFocusStore();
  const pillars = usePillarsStore();

  const state: GamificationState = useMemo(
    () => ({
      completedSlugs: Object.keys(progress).filter((s) => progress[s]?.complete),
      quizResults: quiz,
      highlightCount: highlights.length,
      reflectionCount: Object.keys(reflections).length,
      streak,
    }),
    [progress, highlights, quiz, reflections, streak]
  );

  const xp = useMemo(() => computeXp(state), [state]);
  const today = useClientToday();
  const resolvedToday = today || "1970-01-01";
  const aiContext = useMemo(
    () => buildAiContext({
       date: resolvedToday,
      profile,
      progress,
      quiz,
      highlights,
      reflections,
      streak,
      focusSessions,
      pillars,
       todayCalibration: calibrations[resolvedToday],
      siteData: data,
    }),
     [resolvedToday, profile, progress, quiz, highlights, reflections, streak, focusSessions, pillars, calibrations, data]
  );
  const aiDocuments = useMemo(() => buildContentDocuments(data), [data]);

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Study Mode"
        title="Your study space"
        lede="Personalized to how you learn. Everything stays on this device."
      />
      <div className="flex flex-col gap-6">
        <MissionCard xp={xp} />
        <ProgressTiles streak={streak.current} xp={xp} totalChapters={data.chapters.length} />
        <AiStudyPanel context={aiContext} documents={aiDocuments} chapters={data.chapters} />
        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Your subjects</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {profile.subjects.length === 0
              ? "No subjects yet — add a few to personalize your missions."
              : profile.subjects.map((s) => s.name).join(", ")}
          </p>
          <Link
            href="/study/settings/"
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-line bg-paper-deep px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold"
          >
            Edit profile
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
