export const AI_LIMITS = {
  questionChars: 500,
  objectiveChars: 240,
  chapterSlugChars: 120,
  contextChars: 12000,
  referenceChars: 1400,
  maxReferences: 4,
  maxSessions: 8,
  maxSessionTitleChars: 120,
  maxSessionReasonChars: 240,
  maxSessionMinutes: 180,
  maxPlanMinutes: 240,
  maxAnswerChars: 1800,
  maxActions: 4,
  maxActionChars: 220,
  requestBytes: 32000,
  responseBytes: 50000,
  ollamaTimeoutMs: 5000,
  ollamaStatusTimeoutMs: 1800,
} as const;

export type AiOperation = "coach" | "planner" | "tutor";
export type AiSource = "local" | "ollama";
export type PlanSessionType = "learn" | "practice" | "review" | "focus" | "reflect";
export type AiSessionStatus = "pending" | "started" | "completed";
export type TutorMode = "explain" | "summarize" | "practice";
export type TutorLevel = "beginner" | "normal" | "advanced";

export interface PlannerRequest {
  date: string;
  availableMinutes: number;
  objective?: string;
}

export interface CoachRequest {
  question: string;
}

export interface TutorRequest {
  chapterSlug: string;
  mode: TutorMode;
  level: TutorLevel;
}

export interface AiContext {
  date: string;
  profile: {
    name: string;
    ageTier: "child" | "teen" | "adult";
    grade: string;
    board: string | null;
    subjects: string[];
    weakSubjects: string[];
    preferredMinutesPerDay: number;
    preferredSessionMinutes: number;
  };
  progress: {
    totalChapters: number;
    completedCount: number;
    completionPct: number;
    completedSlugs: string[];
    nextChapterSlug: string | null;
    nextChapterTitle: string | null;
    quizWeaknesses: string[];
  };
  exams: {
    subjectName: string;
    date: string;
    daysUntil: number;
  }[];
  behavior: {
    streakCurrent: number;
    streakBest: number;
    lastActivity: string;
    highlightCount: number;
    reflectionCount: number;
    highlightedChapterSlugs: string[];
    reflectedChapterSlugs: string[];
    focusMinutesLast7Days: number;
    focusSessionsLast7Days: number;
    todayFocusMinutes: number;
    todayFocusTaskNames: string[];
    pillarFloorsToday: Record<string, boolean>;
    missedSignals: string[];
    calibrationOutcome: string | null;
  };
  mission: {
    label: string;
    type: "review" | "practice" | "focus";
    minutes: number;
    subjectName: string | null;
    revision: boolean;
    isOffDay: boolean;
  };
  roadmap: {
    phase: number | null;
    title: string | null;
    focus: string | null;
    milestone: string | null;
    items: string[];
  };
  signals: string[];
}

export interface ContentReference {
  id: string;
  type: string;
  title: string;
  sub: string;
  teaser: string;
  url: string;
  excerpt: string;
  keyConcepts?: string[];
  protocols?: string[];
  evidenceGrades?: string[];
  untrustedReference: true;
}

export interface PlanSession {
  id: string;
  title: string;
  durationMinutes: number;
  type: PlanSessionType;
  reason: string;
  status: AiSessionStatus;
  chapterSlug?: string;
  protocolNum?: string;
}

export interface DailyPlan {
  date: string;
  availableMinutes: number;
  objective: string;
  priority: string;
  sessions: PlanSession[];
  source: AiSource;
  generatedAt: string;
}

export interface CoachResult {
  answer: string;
  nextActions: string[];
  basis: string[];
  suggestedChapterSlug?: string;
}

export interface TutorResult {
  chapterSlug: string;
  title: string;
  mode: TutorMode;
  level: TutorLevel;
  answer: string;
  takeaways: string[];
  commonMistakes: string[];
  practicePrompts: string[];
  evidenceNote: string;
}

export interface AiError {
  code: "invalid-request" | "invalid-endpoint" | "timeout" | "network" | "http" | "invalid-response" | "unavailable";
  message: string;
}

export type ProviderResult<T> =
  | { ok: true; source: AiSource; value: T; note?: string }
  | { ok: false; source?: AiSource; error: AiError };

export type AiServiceResult<T> =
  | { ok: true; source: AiSource; value: T; note?: string; fallbackReason?: "no-ollama" | "ollama-unavailable" }
  | { ok: false; source?: AiSource; error: AiError };

export interface AiProvider {
  planner(request: PlannerRequest, context: AiContext, refs: ContentReference[]): Promise<ProviderResult<DailyPlan>>;
  coach(request: CoachRequest, context: AiContext, refs: ContentReference[]): Promise<ProviderResult<CoachResult>>;
  tutor(request: TutorRequest, context: AiContext, refs: ContentReference[]): Promise<ProviderResult<TutorResult>>;
}
