"use client";

import { useState } from "react";
import { useStudentProfile, resetProfile } from "@/lib/studentProfile";
import { PageShell } from "@/components/ui";
import Link from "next/link";

export default function SettingsPage() {
  const profile = useStudentProfile();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <PageShell>
      <div className="max-w-xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gold">Study Mode</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Study settings</h1>
        <p className="mt-2 text-sm text-ink-soft">Everything is stored privately on this device.</p>

        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">About you</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile.identity.name || "No name set"}
              {profile.identity.age !== null && ` · ${profile.identity.age} years old`}
              {profile.identity.grade && ` · Grade ${profile.identity.grade}`}
              {profile.identity.board && ` · ${profile.identity.board}`}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Subjects</h2>
            {profile.subjects.length === 0 ? (
              <p className="mt-1 text-sm text-ink-soft">No subjects added.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {profile.subjects.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.isWeak && <span className="ml-2 text-xs text-gold">needs practice</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Schedule</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {profile.schedule.studyDays.length === 0
                ? "No study days set"
                : `${profile.schedule.studyDays.length} day(s)/week`}
              {" · "}
              {profile.schedule.preferredMinutesPerDay} min/day
              {" · "}
              {profile.schedule.preferredSessionMinutes} min sessions
            </p>
          </div>

          <Link
            href="/study/onboarding/"
            className="inline-block rounded-lg border border-line bg-paper-deep px-4 py-2 text-sm text-ink-soft transition-colors hover:border-gold hover:text-gold"
          >
            Edit profile
          </Link>

          <div className="rounded-2xl border border-rose/30 bg-rose/5 p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Danger zone</h2>
            <p className="mt-1 text-sm text-ink-soft">Delete all study profile data on this device.</p>
            {confirmReset ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetProfile();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Yes, delete everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink-soft hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="mt-3 rounded-lg border border-rose/40 px-4 py-2 text-sm text-rose hover:bg-rose/10"
              >
                Delete my study profile
              </button>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}