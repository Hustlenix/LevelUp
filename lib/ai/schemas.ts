import {
  AI_LIMITS,
  type AiSource,
  type CoachRequest,
  type CoachResult,
  type DailyPlan,
  type PlanSession,
  type PlannerRequest,
  type TutorRequest,
  type TutorResult,
} from "./contracts.ts";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

export function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!cleaned || cleaned.length > max) return null;
  return cleaned;
}

function safeDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function safeSlug(value: unknown): string | null {
  const slug = boundedText(value, AI_LIMITS.chapterSlugChars);
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function safeId(value: unknown, fallback: string): string | null {
  if (value === undefined) return fallback;
  const id = boundedText(value, 80);
  return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

export function validatePlannerRequest(value: unknown): PlannerRequest | null {
  const input = record(value);
  if (!input) return null;
  const date = safeDate(input.date);
  const availableMinutes = input.availableMinutes;
  if (!date || typeof availableMinutes !== "number" || !Number.isInteger(availableMinutes)) return null;
  if (availableMinutes < 5 || availableMinutes > AI_LIMITS.maxPlanMinutes) return null;
  let objective: string | undefined;
  if (input.objective !== undefined) {
    objective = boundedText(input.objective, AI_LIMITS.objectiveChars) ?? undefined;
    if (!objective) return null;
  }
  return { date, availableMinutes, ...(objective ? { objective } : {}) };
}

export function validateCoachRequest(value: unknown): CoachRequest | null {
  const input = record(value);
  const question = boundedText(input?.question, AI_LIMITS.questionChars);
  return question ? { question } : null;
}

export function validateTutorRequest(value: unknown): TutorRequest | null {
  const input = record(value);
  const chapterSlug = safeSlug(input?.chapterSlug);
  const mode = input?.mode;
  const level = input?.level;
  if (!chapterSlug || (mode !== "explain" && mode !== "summarize" && mode !== "practice")) return null;
  if (level !== "beginner" && level !== "normal" && level !== "advanced") return null;
  return { chapterSlug, mode, level };
}

export function validatePlannerResult(value: unknown, defaultSource: AiSource = "local"): DailyPlan | null {
  const input = record(value);
  if (!input) return null;
  const date = safeDate(input.date);
  const availableMinutes = input.availableMinutes;
  const objective = boundedText(input.objective, AI_LIMITS.objectiveChars);
  const priority = boundedText(input.priority, 100);
  const sessions = input.sessions;
  if (!date || typeof availableMinutes !== "number" || !Number.isInteger(availableMinutes)) return null;
  if (availableMinutes < 5 || availableMinutes > AI_LIMITS.maxPlanMinutes || !objective || !priority || !Array.isArray(sessions)) return null;
  if (sessions.length === 0 || sessions.length > AI_LIMITS.maxSessions) return null;

  const normalized: PlanSession[] = [];
  let total = 0;
  for (let index = 0; index < sessions.length; index += 1) {
    const session = record(sessions[index]);
    if (!session) return null;
    const id = safeId(session.id, `session-${index + 1}`);
    const title = boundedText(session.title, AI_LIMITS.maxSessionTitleChars);
    const reason = boundedText(session.reason, AI_LIMITS.maxSessionReasonChars);
    const minutes = session.durationMinutes;
    const type = session.type;
    if (!id || !title || !reason || typeof minutes !== "number" || !Number.isInteger(minutes)) return null;
    if (minutes < 5 || minutes > AI_LIMITS.maxSessionMinutes) return null;
    if (type !== "learn" && type !== "practice" && type !== "review" && type !== "focus" && type !== "reflect") return null;
    const chapterSlug = session.chapterSlug === undefined ? undefined : safeSlug(session.chapterSlug);
    if (session.chapterSlug !== undefined && !chapterSlug) return null;
    const protocolNum = session.protocolNum === undefined ? undefined : boundedText(session.protocolNum, 20);
    if (protocolNum !== undefined && (!protocolNum || !/^2\.\d+$/.test(protocolNum))) return null;
    total += minutes;
    normalized.push({
      id,
      title,
      durationMinutes: minutes,
      type,
      reason,
      status: session.status === "started" || session.status === "completed" ? session.status : "pending",
      ...(chapterSlug ? { chapterSlug } : {}),
      ...(protocolNum ? { protocolNum } : {}),
    });
  }
  if (total > availableMinutes) return null;
  const source = input.source === "local" ? "local" : defaultSource;
  const generatedAt = typeof input.generatedAt === "string" && input.generatedAt.length <= 60
    ? input.generatedAt
    : `${date}T00:00:00.000Z`;
  return { date, availableMinutes, objective, priority, sessions: normalized, source, generatedAt };
}

export function validateCoachResult(value: unknown): CoachResult | null {
  const input = record(value);
  const answer = boundedText(input?.answer, AI_LIMITS.maxAnswerChars);
  if (!answer || !Array.isArray(input?.nextActions) || !Array.isArray(input?.basis)) return null;
  const nextActions = input.nextActions.slice(0, AI_LIMITS.maxActions).map((item) => boundedText(item, AI_LIMITS.maxActionChars));
  const basis = input.basis.slice(0, AI_LIMITS.maxActions).map((item) => boundedText(item, AI_LIMITS.maxActionChars));
  if (nextActions.some((item) => !item) || basis.some((item) => !item)) return null;
  const suggestedChapterSlug = input.suggestedChapterSlug === undefined ? undefined : safeSlug(input.suggestedChapterSlug);
  if (input.suggestedChapterSlug !== undefined && !suggestedChapterSlug) return null;
  return {
    answer,
    nextActions: nextActions as string[],
    basis: basis as string[],
    ...(suggestedChapterSlug ? { suggestedChapterSlug } : {}),
  };
}

export function validateTutorResult(value: unknown): TutorResult | null {
  const input = record(value);
  const chapterSlug = safeSlug(input?.chapterSlug);
  const title = boundedText(input?.title, 160);
  const answer = boundedText(input?.answer, AI_LIMITS.maxAnswerChars);
  const mode = input?.mode;
  const level = input?.level;
  const evidenceNote = boundedText(input?.evidenceNote, 300);
  if (!chapterSlug || !title || !answer || !evidenceNote || !Array.isArray(input?.takeaways) || !Array.isArray(input?.commonMistakes) || !Array.isArray(input?.practicePrompts)) return null;
  if (mode !== "explain" && mode !== "summarize" && mode !== "practice") return null;
  if (level !== "beginner" && level !== "normal" && level !== "advanced") return null;
  const takeaways = input.takeaways.slice(0, 5).map((item) => boundedText(item, 260));
  const commonMistakes = input.commonMistakes.slice(0, 5).map((item) => boundedText(item, 260));
  const practicePrompts = input.practicePrompts.slice(0, 5).map((item) => boundedText(item, 260));
  if ([...takeaways, ...commonMistakes, ...practicePrompts].some((item) => !item)) return null;
  return {
    chapterSlug,
    title,
    mode,
    level,
    answer,
    takeaways: takeaways as string[],
    commonMistakes: commonMistakes as string[],
    practicePrompts: practicePrompts as string[],
    evidenceNote,
  };
}
