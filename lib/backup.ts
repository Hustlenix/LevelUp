export interface BackupProgressEntry {
  complete: boolean;
  maxScroll: number;
  updatedAt: number;
}

export interface BackupHighlight {
  id: string;
  slug: string;
  text: string;
  color: string;
  ts: number;
}

export interface BackupQuizScore {
  score: number;
  total: number;
  ts: number;
}

export interface BackupStreak {
  current: number;
  best: number;
  last: string;
}

export interface BackupState {
  theme: string | null;
  readerScale: string | null;
  progress: Record<string, BackupProgressEntry>;
  bookmarks: string[];
  highlights: BackupHighlight[];
  quiz: Record<string, BackupQuizScore>;
  reflections: Record<string, string>;
  streak: BackupStreak | null;
}

export const BACKUP_SCHEMA = 1;

const READER_SCALES = ["0.85", "1", "1.15", "1.3"];
const THEMES = ["light", "dark", "deepwork", "cyberpunk"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isProgressEntry(v: unknown): v is BackupProgressEntry {
  return (
    isRecord(v) &&
    typeof v.complete === "boolean" &&
    typeof v.maxScroll === "number" &&
    typeof v.updatedAt === "number"
  );
}

function isHighlight(v: unknown): v is BackupHighlight {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.slug === "string" &&
    typeof v.text === "string" &&
    typeof v.color === "string" &&
    typeof v.ts === "number"
  );
}

function isQuizScore(v: unknown): v is BackupQuizScore {
  return (
    isRecord(v) &&
    typeof v.score === "number" &&
    typeof v.total === "number" &&
    typeof v.ts === "number"
  );
}

function isStreak(v: unknown): v is BackupStreak {
  return (
    isRecord(v) &&
    typeof v.current === "number" &&
    typeof v.best === "number" &&
    typeof v.last === "string"
  );
}

export function buildBackup(state: BackupState): { schema: number; exportedAt: string; [k: string]: unknown } {
  return {
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    theme: state.theme,
    readerScale: state.readerScale,
    progress: state.progress,
    bookmarks: state.bookmarks,
    highlights: state.highlights,
    quiz: state.quiz,
    reflections: state.reflections,
    streak: state.streak,
  };
}

export function validateBackup(json: unknown): { ok: boolean; errors: string[]; data?: BackupState } {
  const errors: string[] = [];
  if (!isRecord(json)) return { ok: false, errors: ["Backup file is not a JSON object."] };
  if (json.schema !== BACKUP_SCHEMA) {
    return { ok: false, errors: [`Unsupported backup schema (expected ${BACKUP_SCHEMA}).`] };
  }
  if (json.theme !== null && (typeof json.theme !== "string" || !THEMES.includes(json.theme))) {
    errors.push("theme must be one of light, dark, deepwork, cyberpunk.");
  }
  if (
    json.readerScale !== null &&
    (typeof json.readerScale !== "string" || !READER_SCALES.includes(json.readerScale))
  ) {
    errors.push("readerScale must be one of 0.85, 1, 1.15, 1.3.");
  }
  if (!isRecord(json.progress)) {
    errors.push("progress must be an object.");
  } else {
    for (const [slug, v] of Object.entries(json.progress)) {
      if (!isProgressEntry(v)) errors.push(`progress.${slug} has an invalid shape.`);
    }
  }
  if (
    !Array.isArray(json.bookmarks) ||
    !json.bookmarks.every((b) => typeof b === "string")
  ) {
    errors.push("bookmarks must be an array of strings.");
  }
  if (!Array.isArray(json.highlights)) {
    errors.push("highlights must be an array.");
  } else {
    for (const h of json.highlights) {
      if (!isHighlight(h)) errors.push("A highlight has an invalid shape.");
    }
  }
  if (!isRecord(json.quiz)) {
    errors.push("quiz must be an object.");
  } else {
    for (const [slug, v] of Object.entries(json.quiz)) {
      if (!isQuizScore(v)) errors.push(`quiz.${slug} has an invalid shape.`);
    }
  }
  if (
    !isRecord(json.reflections) ||
    !Object.values(json.reflections).every((r) => typeof r === "string")
  ) {
    errors.push("reflections must be an object of strings.");
  }
  if (json.streak !== null && !isStreak(json.streak)) {
    errors.push("streak has an invalid shape.");
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    data: {
      theme: json.theme as string | null,
      readerScale: json.readerScale as string | null,
      progress: json.progress as Record<string, BackupProgressEntry>,
      bookmarks: json.bookmarks as string[],
      highlights: json.highlights as BackupHighlight[],
      quiz: json.quiz as Record<string, BackupQuizScore>,
      reflections: json.reflections as Record<string, string>,
      streak: json.streak as BackupStreak | null,
    },
  };
}