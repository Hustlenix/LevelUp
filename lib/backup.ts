import type { OSState } from "./os/types.ts";
import { validateOSState } from "./os/migrations.ts";
import type { PortfolioArtifact } from "./portfolio.ts";

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
  actionState?: {
    pillarsHistory?: Record<string, unknown>;
    focusSessions?: unknown[];
    protocolLogs?: unknown[];
    urgesLog?: unknown[];
    calibrations?: Record<string, unknown>;
  };
  studentProfile?: unknown; // validated via isStudentProfile at restore
  osState?: OSState;
  portfolio?: PortfolioArtifact[];
}

export const BACKUP_SCHEMA = 1;
export const BACKUP_TRANSACTION_KEY = "levelup-backup-transaction-v1";

export interface BackupStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

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
  const result: { schema: number; exportedAt: string; [k: string]: unknown } = {
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
  if (state.actionState !== undefined) {
    result.actionState = state.actionState;
  }
  if (state.studentProfile !== undefined) {
    result.studentProfile = state.studentProfile;
  }
  if (state.osState !== undefined) {
    result.osState = state.osState;
  }
  if (state.portfolio !== undefined) {
    result.portfolio = state.portfolio;
  }
  return result;
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
  let actionState: BackupState["actionState"] = undefined;
  if (json.actionState && isRecord(json.actionState)) {
    actionState = json.actionState as BackupState["actionState"];
  }
  let studentProfile: unknown;
  if (json.studentProfile !== undefined) {
    studentProfile = json.studentProfile;
  }
  let osState: OSState | undefined;
  if (json.osState !== undefined) {
    const checked = validateOSState(json.osState);
    if (!checked.ok || !checked.state) {
      errors.push(...checked.errors.map((error) => `osState: ${error}`));
    } else {
      osState = checked.state;
    }
  }
  let portfolio: PortfolioArtifact[] | undefined;
  if (json.portfolio !== undefined) {
    if (!Array.isArray(json.portfolio) || !json.portfolio.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.description === "string" && typeof item.kind === "string" && typeof item.createdAt === "string" && typeof item.updatedAt === "string")) {
      errors.push("portfolio has an invalid shape.");
    } else {
      portfolio = json.portfolio as PortfolioArtifact[];
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  const outData: BackupState = {
    theme: json.theme as string | null,
    readerScale: json.readerScale as string | null,
    progress: json.progress as Record<string, BackupProgressEntry>,
    bookmarks: json.bookmarks as string[],
    highlights: json.highlights as BackupHighlight[],
    quiz: json.quiz as Record<string, BackupQuizScore>,
    reflections: json.reflections as Record<string, string>,
    streak: json.streak as BackupStreak | null,
  };
  if (actionState !== undefined) {
    outData.actionState = actionState;
  }
  if (studentProfile !== undefined) {
    outData.studentProfile = studentProfile;
  }
  if (osState !== undefined) {
    outData.osState = osState;
  }
  if (portfolio !== undefined) {
    outData.portfolio = portfolio;
  }

  return {
    ok: true,
    errors: [],
    data: outData,
  };
}

function remove(storage: BackupStorageLike, key: string) {
  if (storage.removeItem) storage.removeItem(key);
  else storage.setItem(key, "");
}

function entriesForBackup(data: BackupState): Record<string, string> {
  const entries: Record<string, string> = {
    "levelup-progress-v1": JSON.stringify(data.progress),
    "levelup-bookmarks-v1": JSON.stringify(data.bookmarks),
    "levelup-highlights-v1": JSON.stringify(data.highlights),
    "levelup-quiz-v1": JSON.stringify(data.quiz),
    "levelup-reflections-v1": JSON.stringify(data.reflections),
    "levelup-streak-v1": JSON.stringify(data.streak ?? { current: 0, best: 0, last: "" }),
  };
  if (data.osState !== undefined) entries["levelup-os-state-v1"] = JSON.stringify(data.osState);
  if (data.portfolio !== undefined) entries["levelup-portfolio-v1"] = JSON.stringify(data.portfolio);
  if (data.actionState?.pillarsHistory) entries["levelup-pillar-floors-v1"] = JSON.stringify(data.actionState.pillarsHistory);
  if (data.actionState?.focusSessions) entries["levelup-focus-sessions-v1"] = JSON.stringify(data.actionState.focusSessions);
  if (data.actionState?.protocolLogs) entries["levelup-protocol-logs-v1"] = JSON.stringify(data.actionState.protocolLogs);
  if (data.actionState?.urgesLog) entries["levelup-urge-pauses-v1"] = JSON.stringify(data.actionState.urgesLog);
  if (data.actionState?.calibrations) entries["levelup-daily-calibration-v1"] = JSON.stringify(data.actionState.calibrations);
  if (data.theme) entries["levelup-theme"] = data.theme;
  if (data.readerScale) entries["levelup-reader-scale"] = data.readerScale;
  return entries;
}

export function recoverBackupTransaction(storage: BackupStorageLike): boolean {
  const raw = storage.getItem(BACKUP_TRANSACTION_KEY);
  if (!raw) return false;
  try {
    const transaction = JSON.parse(raw) as { previous?: Record<string, string | null> };
    for (const [key, value] of Object.entries(transaction.previous ?? {})) {
      if (value === null) remove(storage, key);
      else storage.setItem(key, value);
    }
  } finally {
    remove(storage, BACKUP_TRANSACTION_KEY);
  }
  return true;
}

/** Restore all legacy localStorage keys with a rollback journal. */
export function restoreBackupAtomically(data: BackupState, storage: BackupStorageLike): { ok: boolean; error?: string } {
  recoverBackupTransaction(storage);
  const entries = entriesForBackup(data);
  const previous: Record<string, string | null> = {};
  for (const key of Object.keys(entries)) previous[key] = storage.getItem(key);
  try {
    storage.setItem(BACKUP_TRANSACTION_KEY, JSON.stringify({ schema: 1, previous }));
    for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
    remove(storage, BACKUP_TRANSACTION_KEY);
    return { ok: true };
  } catch {
    try {
      for (const [key, value] of Object.entries(previous)) {
        if (value === null) remove(storage, key);
        else storage.setItem(key, value);
      }
      remove(storage, BACKUP_TRANSACTION_KEY);
    } catch {
      return { ok: false, error: "Backup restore failed and the rollback could not be completed." };
    }
    return { ok: false, error: "Backup restore failed; the previous local state was kept." };
  }
}
