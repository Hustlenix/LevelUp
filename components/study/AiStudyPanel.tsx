"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Check, Clock3, MessageCircle, Play, Sparkles } from "lucide-react";
import type { Chapter, SearchDoc } from "@/lib/types";
import type { AiContext, CoachResult, ContentReference, TutorResult } from "@/lib/ai/contracts";
import { chapterReference } from "@/lib/ai/context";
import { retrieveLevelUpContent } from "@/lib/ai/retrieval";
import { createAiServices } from "@/lib/ai/services";
import { validateCoachRequest, validatePlannerRequest, validateTutorRequest } from "@/lib/ai/schemas";
import { configuredAiEndpoint } from "@/lib/ai/remote-provider";
import { saveAiPlan, setAiSessionStatus, useAiPlanStore } from "@/lib/ai/store";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

interface AiStudyPanelProps {
  context: AiContext;
  documents: SearchDoc[];
  chapters: Chapter[];
}

type BusyOperation = "planner" | "coach" | "tutor" | null;

const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-paper-deep px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

function sourceLabel(source: "local" | "remote") {
  return source === "remote" ? "Remote response" : "Local fallback";
}

function TypePill({ type }: { type: string }) {
  return <span className="rounded-full border border-line bg-paper-deep px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{type}</span>;
}

function ResultSource({ source, note, fallbackReason }: { source: "local" | "remote"; note?: string; fallbackReason?: string }) {
  return (
    <div className="mt-3 rounded-lg border border-line/80 bg-paper-deep/60 px-3 py-2 text-xs text-ink-soft" role="status" aria-live="polite">
      <span className="font-semibold text-ink">{sourceLabel(source)}.</span>{" "}
      {note ?? (fallbackReason === "remote-unavailable" ? "The remote endpoint was unavailable, so this answer was generated locally." : "This answer was generated locally from your saved LevelUp state.")}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose/30 bg-rose/5 px-3 py-2 text-sm text-ink" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export default function AiStudyPanel({ context, documents, chapters }: AiStudyPanelProps) {
  const planState = useAiPlanStore();
  const plan = planState.plans[context.date] ?? null;
  const services = useMemo(() => createAiServices(), []);
  const defaultChapter = context.progress.nextChapterSlug ?? chapters[0]?.slug ?? "";
  const [availableMinutes, setAvailableMinutes] = useState(String(context.profile.preferredMinutesPerDay || 30));
  const [objective, setObjective] = useState("");
  const [question, setQuestion] = useState("");
  const [coach, setCoach] = useState<CoachResult | null>(null);
  const [coachMeta, setCoachMeta] = useState<{ source: "local" | "remote"; note?: string; fallbackReason?: string } | null>(null);
  const [tutor, setTutor] = useState<TutorResult | null>(null);
  const [tutorMeta, setTutorMeta] = useState<{ source: "local" | "remote"; note?: string; fallbackReason?: string } | null>(null);
  const [tutorChapter, setTutorChapter] = useState(defaultChapter);
  const [tutorMode, setTutorMode] = useState<"explain" | "summarize" | "practice">("explain");
  const [tutorLevel, setTutorLevel] = useState<"beginner" | "normal" | "advanced">("normal");
  const [busy, setBusy] = useState<BusyOperation>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.aiOpened);
  }, []);

  const remoteConfigured = Boolean(configuredAiEndpoint());
  const selectedChapter = chapters.find((chapter) => chapter.slug === tutorChapter) ?? null;

  async function generatePlan() {
    const request = validatePlannerRequest({ date: context.date, availableMinutes: Number(availableMinutes), objective: objective || undefined });
    if (!request) {
      setError("Choose between 5 and 240 minutes. The objective is optional and should be brief.");
      return;
    }
    setBusy("planner");
    setError(null);
    const refs = retrieveLevelUpContent(documents, `${request.objective ?? "today"} ${context.mission.label} ${context.profile.weakSubjects.join(" ")}`, 4);
    const result = await services.planner(request, context, refs);
    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    saveAiPlan(result.value);
    trackEvent(ANALYTICS_EVENTS.aiPlanGenerated, {
      ai_operation: "planner",
      ai_source: result.source,
      ai_session_count: result.value.sessions.length,
      ai_available_minutes: result.value.availableMinutes,
    });
  }

  async function askCoach(event?: React.FormEvent) {
    event?.preventDefault();
    const request = validateCoachRequest({ question });
    if (!request) {
      setError("Ask a short question so the Coach can give you a specific next move.");
      return;
    }
    setBusy("coach");
    setError(null);
    const refs = retrieveLevelUpContent(documents, request.question, 4);
    const result = await services.coach(request, context, refs);
    setBusy(null);
    trackEvent(ANALYTICS_EVENTS.aiPromptSubmitted, { ai_operation: "coach" });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setCoach(result.value);
    setCoachMeta({ source: result.source, note: result.note, fallbackReason: result.fallbackReason });
  }

  async function runTutor() {
    const request = validateTutorRequest({ chapterSlug: tutorChapter, mode: tutorMode, level: tutorLevel });
    if (!request || !selectedChapter) {
      setError("Choose a LevelUp chapter before starting the Tutor.");
      return;
    }
    setBusy("tutor");
    setError(null);
    const refs: ContentReference[] = [chapterReference(selectedChapter), ...retrieveLevelUpContent(documents, `${selectedChapter.title} ${selectedChapter.keyConcepts.join(" ")}`, 3)];
    const uniqueRefs = refs.filter((ref, index) => refs.findIndex((candidate) => candidate.id === ref.id) === index);
    const result = await services.tutor(request, context, uniqueRefs);
    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTutor(result.value);
    setTutorMeta({ source: result.source, note: result.note, fallbackReason: result.fallbackReason });
  }

  function updateSession(date: string, sessionId: string, status: "started" | "completed") {
    setAiSessionStatus(date, sessionId, status);
    trackEvent(status === "started" ? ANALYTICS_EVENTS.aiPlanStarted : ANALYTICS_EVENTS.aiPlanCompleted, {
      ai_operation: "planner",
      ai_source: plan?.source,
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-xs sm:p-8" aria-labelledby="ai-study-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            LevelUp Coach
          </div>
          <h2 id="ai-study-heading" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Turn today into a next move</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Plans, answers, and explanations use the progress already on this device. Nothing is sent anywhere unless a remote endpoint is configured.
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper-deep px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {remoteConfigured ? "Remote-ready" : "Local-first"}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-gold">Daily Planner</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-ink">Generate today&apos;s plan</h3>
            </div>
            <Clock3 className="h-5 w-5 text-ink-faint" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Minutes</span>
              <input
                type="number"
                min={5}
                max={240}
                step={5}
                value={availableMinutes}
                onChange={(event) => setAvailableMinutes(event.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Objective <span className="text-ink-faint">(optional)</span></span>
              <input
                type="text"
                maxLength={240}
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                placeholder={context.mission.label}
                className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </label>
          </div>
          <button type="button" onClick={generatePlan} disabled={busy !== null} className={`mt-4 w-full ${buttonClass}`}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {busy === "planner" ? "Building a plan…" : "Generate today’s plan"}
          </button>

          {plan ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{plan.priority}</p>
                  <p className="mt-1 font-display text-base font-semibold text-ink">{plan.objective}</p>
                </div>
                <TypePill type={sourceLabel(plan.source)} />
              </div>
              <ol className="mt-4 space-y-3">
                {plan.sessions.map((session) => (
                  <li key={session.id} className="rounded-lg border border-line bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-gold" aria-hidden="true">
                        {session.status === "completed" ? <Check className="h-4 w-4" /> : <span className="font-mono text-xs">{session.durationMinutes}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-ink">{session.title}</h4>
                          <TypePill type={session.type} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{session.reason}</p>
                        {session.chapterSlug ? <Link href={`/chapters/${session.chapterSlug}/`} className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"><BookOpen className="h-3 w-3" aria-hidden="true" />Open chapter</Link> : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {session.status === "pending" ? <button type="button" onClick={() => updateSession(plan.date, session.id, "started")} className={secondaryButtonClass}><Play className="h-3.5 w-3.5" aria-hidden="true" />Start</button> : null}
                          {session.status === "started" ? <button type="button" onClick={() => updateSession(plan.date, session.id, "completed")} className={buttonClass}><Check className="h-3.5 w-3.5" aria-hidden="true" />Complete</button> : null}
                          {session.status === "completed" ? <span className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-gold"><Check className="h-3.5 w-3.5" aria-hidden="true" />Completed</span> : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <ResultSource source={plan.source} />
            </div>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">No plan is saved for today yet. Generate one when you are ready to choose the next move.</p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-gold">Ask Coach</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">What should happen next?</h3>
              </div>
              <MessageCircle className="h-5 w-5 text-ink-faint" aria-hidden="true" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["What should I focus on today?", "What should I learn next?", "Why am I falling behind?"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="min-h-9 rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{prompt}</button>
              ))}
            </div>
            <form className="mt-3" onSubmit={askCoach}>
              <label htmlFor="coach-question" className="sr-only">Ask the LevelUp Coach</label>
              <textarea id="coach-question" maxLength={500} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about today, recovery, progress, or what to learn next." className="w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40" />
              <button type="submit" disabled={busy !== null} className={`mt-3 ${buttonClass}`}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {busy === "coach" ? "Thinking…" : "Ask Coach"}
              </button>
            </form>
            {coach ? <div className="mt-4 border-t border-line pt-4"><p className="text-sm leading-relaxed text-ink">{coach.answer}</p><ul className="mt-3 space-y-1.5 text-xs text-ink-soft">{coach.nextActions.map((action) => <li key={action} className="flex gap-2"><span className="text-gold">→</span><span>{action}</span></li>)}</ul><p className="mt-3 text-[11px] text-ink-faint">Basis: {coach.basis.join(" · ")}</p>{coachMeta ? <ResultSource source={coachMeta.source} note={coachMeta.note} fallbackReason={coachMeta.fallbackReason} /> : null}</div> : null}
          </div>

          <div className="rounded-xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-gold">Tutor</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">Explain or practice a chapter</h3>
              </div>
              <BookOpen className="h-5 w-5 text-ink-faint" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-3">
                <span className="text-xs font-medium text-ink-soft">Chapter</span>
                <select value={tutorChapter} onChange={(event) => setTutorChapter(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">
                  {chapters.map((chapter) => <option key={chapter.slug} value={chapter.slug}>Chapter {chapter.number} — {chapter.title}</option>)}
                </select>
              </label>
              <label className="block"><span className="text-xs font-medium text-ink-soft">Mode</span><select value={tutorMode} onChange={(event) => setTutorMode(event.target.value as typeof tutorMode)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"><option value="explain">Explain</option><option value="summarize">Summarize</option><option value="practice">Practice</option></select></label>
              <label className="block"><span className="text-xs font-medium text-ink-soft">Level</span><select value={tutorLevel} onChange={(event) => setTutorLevel(event.target.value as typeof tutorLevel)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"><option value="beginner">Beginner</option><option value="normal">Normal</option><option value="advanced">Advanced</option></select></label>
              <div className="flex items-end"><button type="button" onClick={runTutor} disabled={busy !== null || chapters.length === 0} className={`w-full ${buttonClass}`}>{busy === "tutor" ? "Preparing…" : "Start Tutor"}</button></div>
            </div>
            {tutor ? <div className="mt-4 border-t border-line pt-4"><p className="text-sm leading-relaxed text-ink">{tutor.answer}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Takeaways</p><ul className="mt-2 space-y-1 text-xs text-ink-soft">{tutor.takeaways.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Try this</p><ul className="mt-2 space-y-1 text-xs text-ink-soft">{tutor.practicePrompts.map((item) => <li key={item}>• {item}</li>)}</ul></div></div><p className="mt-3 text-[11px] text-ink-faint">{tutor.evidenceNote}</p>{tutorMeta ? <ResultSource source={tutorMeta.source} note={tutorMeta.note} fallbackReason={tutorMeta.fallbackReason} /> : null}<Link href={`/chapters/${tutor.chapterSlug}/`} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-gold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Read the full chapter →</Link></div> : null}
          </div>
        </div>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </section>
  );
}
