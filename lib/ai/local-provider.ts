import {
  type AiContext,
  type AiProvider,
  type CoachRequest,
  type ContentReference,
  type DailyPlan,
  type PlannerRequest,
  type PlanSessionType,
  type TutorRequest,
  type TutorResult,
  type ProviderResult,
} from "./contracts.ts";
import {
  validateCoachRequest,
  validatePlannerRequest,
  validatePlannerResult,
  validateTutorRequest,
  validateTutorResult,
} from "./schemas.ts";

function failure(code: "invalid-request" | "unavailable", message: string): ProviderResult<never> {
  return { ok: false, source: "local", error: { code, message } };
}

function pickReference(context: AiContext, refs: ContentReference[]): ContentReference | null {
  if (context.progress.nextChapterSlug) {
    const next = refs.find((ref) => ref.id === `ch:${context.progress.nextChapterSlug}`);
    if (next) return next;
  }
  return refs[0] ?? null;
}

function sessionDurations(minutes: number): number[] {
  if (minutes <= 15) return [minutes];
  if (minutes <= 30) return [Math.floor(minutes / 2), minutes - Math.floor(minutes / 2)];
  const first = Math.min(25, minutes);
  const remaining = minutes - first;
  if (remaining < 10) return [minutes];
  return [first, remaining];
}

function localGeneratedAt(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function createLocalProvider(): AiProvider {
  return {
    async planner(input: PlannerRequest, context: AiContext, refs: ContentReference[]) {
      const request = validatePlannerRequest(input);
      if (!request) return failure("invalid-request", "The planning request is not valid.");
      const exam = context.exams[0];
      const weakSubject = context.profile.weakSubjects[0];
      const reference = pickReference(context, refs);
      const priority = exam && exam.daysUntil <= 14 ? "exam revision" : weakSubject ? "weak-area practice" : "steady progress";
      const objective = request.objective ?? (exam && exam.daysUntil <= 14
        ? `Prepare ${exam.subjectName} with a short revision loop.`
        : weakSubject
          ? `Build confidence in ${weakSubject} without overloading the day.`
          : context.mission.label);
      const durations = sessionDurations(request.availableMinutes);
      const sessions = durations.map((duration, index) => ({
        id: `session-${request.date}-${index + 1}`,
        title: index === 0
          ? reference ? `Read and mark: ${reference.title}` : `Start: ${objective}`
          : exam ? `Practice ${exam.subjectName}` : weakSubject ? `Practice ${weakSubject}` : "Close with one recall prompt",
        durationMinutes: duration,
        type: (index === 0 ? (exam ? "review" : "learn") : "practice") as PlanSessionType,
        reason: index === 0
          ? reference ? `Uses the next unread LevelUp chapter: ${reference.title}.` : "Starts with the smallest useful learning block."
          : exam ? `Your nearest exam is ${exam.daysUntil} day(s) away.` : weakSubject ? `${weakSubject} is marked as a subject needing extra practice.` : "Turns the reading into a checkable action.",
        status: "pending" as const,
        ...(reference?.id.startsWith("ch:") ? { chapterSlug: reference.id.slice(3) } : {}),
        ...(index === 0 ? { protocolNum: "2.6" } : {}),
      }));
      const raw: DailyPlan = {
        date: request.date,
        availableMinutes: request.availableMinutes,
        objective,
        priority,
        sessions,
        source: "local",
        generatedAt: localGeneratedAt(request.date),
      };
      const plan = validatePlannerResult(raw, "local");
      return plan ? { ok: true, source: "local", value: plan, note: "Deterministic local fallback; no remote AI endpoint is configured." } : failure("unavailable", "The local planner could not build a valid plan.");
    },

    async coach(input: CoachRequest, context: AiContext, refs: ContentReference[]) {
      const request = validateCoachRequest(input);
      if (!request) return failure("invalid-request", "The coach question is empty or too long.");
      const question = request.question.toLowerCase();
      const reference = pickReference(context, refs);
      const suggestedChapterSlug = reference?.id.startsWith("ch:") ? reference.id.slice(3) : undefined;
      if (question.includes("miss") || question.includes("falling behind") || question.includes("recover")) {
        const action = context.behavior.streakCurrent === 0 ? "Do one five-minute minimum action today, then stop or continue by choice." : "Protect one short focus block before adding anything else.";
        return {
          ok: true,
          source: "local",
          value: {
            answer: context.behavior.missedSignals[0] ?? "Your recent record does not show a collapse; use the next small action to keep momentum.",
            nextActions: [action, "Log what made the last attempt difficult instead of guessing about motivation."],
            basis: context.behavior.missedSignals.length ? context.behavior.missedSignals.slice(0, 2) : [`Current streak: ${context.behavior.streakCurrent} day(s).`],
            ...(suggestedChapterSlug ? { suggestedChapterSlug } : {}),
          },
          note: "Deterministic local fallback; no remote AI endpoint is configured.",
        };
      }
      if (question.includes("next") || question.includes("learn")) {
        const nextTitle = context.progress.nextChapterTitle ?? "one LevelUp concept you have not completed";
        return {
          ok: true,
          source: "local",
          value: {
            answer: `Your next useful learning step is ${nextTitle}. Keep it to ${context.mission.minutes} minutes today, then test yourself or write one action.`,
            nextActions: ["Open the recommended chapter.", "Read the Apply Today section.", "Complete one recall or practice prompt."],
            basis: [`Manual completion: ${context.progress.completionPct}%.`, context.progress.quizWeaknesses[0] ? `Quiz weakness: ${context.progress.quizWeaknesses[0]}.` : "No weak quiz result is recorded yet."],
            ...(suggestedChapterSlug ? { suggestedChapterSlug } : {}),
          },
          note: "Deterministic local fallback; no remote AI endpoint is configured.",
        };
      }
      const examLine = context.exams[0] ? ` ${context.exams[0].subjectName} is next in ${context.exams[0].daysUntil} day(s).` : "";
      return {
        ok: true,
        source: "local",
        value: {
          answer: `Today’s focus is ${context.mission.label}.${examLine} Start with one ${context.profile.preferredSessionMinutes}-minute block and make the output observable.`,
          nextActions: ["Choose the first physical output.", "Start one focus session.", "Mark the result before planning more."],
          basis: [`Today’s mission: ${context.mission.label}.`, `Current streak: ${context.behavior.streakCurrent} day(s).`, `Focus minutes in seven days: ${context.behavior.focusMinutesLast7Days}.`],
          ...(suggestedChapterSlug ? { suggestedChapterSlug } : {}),
        },
        note: "Deterministic local fallback; no remote AI endpoint is configured.",
      };
    },

    async tutor(input: TutorRequest, _context: AiContext, refs: ContentReference[]) {
      const request = validateTutorRequest(input);
      if (!request) return failure("invalid-request", "The tutor request is not valid.");
      const reference = refs.find((ref) => ref.id === `ch:${request.chapterSlug}`) ?? null;
      if (!reference) return failure("unavailable", "That chapter is not available in the local knowledge base.");
      const prefix = request.level === "beginner" ? "In plain terms" : request.level === "advanced" ? "At a deeper level" : "The practical idea";
      const answer = request.mode === "summarize"
        ? `${reference.teaser} ${reference.excerpt}`
        : request.mode === "practice"
          ? `${prefix}, use this chapter as a practice loop: ${reference.excerpt}`
          : `${prefix}, this chapter is about ${reference.excerpt}`;
      const raw: TutorResult = {
        chapterSlug: request.chapterSlug,
        title: reference.title,
        mode: request.mode,
        level: request.level,
        answer,
        takeaways: reference.keyConcepts?.slice(0, 4).map((concept) => `Notice how ${concept} appears in the chapter.`) ?? [reference.teaser],
        commonMistakes: ["Treating the framework as a guarantee instead of a testable practice.", "Reading without choosing one observable action."],
        practicePrompts: reference.keyConcepts?.slice(0, 3).map((concept) => `What is one small action that would test ${concept} today?`) ?? ["What is one small action from this chapter you can test today?"],
        evidenceNote: reference.evidenceGrades?.length
          ? `This chapter carries the published evidence grades: ${reference.evidenceGrades.join(", ")}. Check the chapter audit for detail and limits.`
          : "This response is grounded in the LevelUp chapter text; no external evidence grade was attached to the selected reference.",
      };
      const tutor = validateTutorResult(raw);
      return tutor ? { ok: true, source: "local", value: tutor, note: "Deterministic local fallback; no remote AI endpoint is configured." } : failure("unavailable", "The local tutor could not build a valid response.");
    },
  };
}
