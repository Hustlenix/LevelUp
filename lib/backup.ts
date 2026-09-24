import type { OSState } from "./os/types.ts";
import { validateOSState } from "./os/migrations.ts";
import { validateCompanionState } from "./companion/migrations.ts";
import {
  COMPANION_KEY,
  COMPANION_PENDING_KEY,
  type CompanionEvent,
  type CompanionState,
} from "./companion/types.ts";
import type { PortfolioArtifact } from "./portfolio.ts";
import { isPortfolioArtifact } from "./portfolio.ts";
import type { NotificationState } from "./notifications.ts";
import type { Experiment } from "./experiments.ts";
import { isExperiment } from "./experiments.ts";

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
  companionState?: CompanionState;
  companionPending?: CompanionEvent[];
  portfolio?: PortfolioArtifact[];
  notifications?: NotificationState;
  experiments?: Experiment[];
}

export const BACKUP_SCHEMA = 1;
export const BACKUP_TRANSACTION_KEY = "levelup-backup-transaction-v1";

export interface BackupStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export interface BackupJournal { schema: number; previous: Record<string, string | null>; }

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

function isNotificationState(v: unknown): v is NotificationState {
  if (!isRecord(v)) return false;
  const validTime = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  return typeof v.enabled === "boolean" && validTime(v.quietStart) && validTime(v.quietEnd) && Array.isArray(v.dismissedIds) && v.dismissedIds.every((id) => typeof id === "string") && Array.isArray(v.readIds) && v.readIds.every((id) => typeof id === "string");
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
  if (state.companionState !== undefined) {
    result.companionState = state.companionState;
  }
  if (state.companionPending !== undefined) {
    result.companionPending = state.companionPending;
  }
  if (state.portfolio !== undefined) {
    result.portfolio = state.portfolio;
  }
  if (state.notifications !== undefined) {
    result.notifications = state.notifications;
  }
  if (state.experiments !== undefined) {
    result.experiments = state.experiments;
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
  let companionState: CompanionState | undefined;
  if (json.companionState !== undefined) {
    const checked = validateCompanionState(json.companionState);
    if (!checked.ok || !checked.state) {
      errors.push(...checked.errors.map((error) => `companionState: ${error}`));
    } else {
      companionState = checked.state;
    }
  }
  let companionPending: CompanionEvent[] | undefined;
  if (json.companionPending !== undefined) {
    const isValidPending = (entry: unknown): entry is CompanionEvent =>
      isRecord(entry) &&
      typeof entry.id === "string" &&
      typeof entry.kind === "string" &&
      typeof entry.occurredAt === "string";
    if (!Array.isArray(json.companionPending) || !json.companionPending.every(isValidPending)) {
      errors.push("companionPending has an invalid shape.");
    } else {
      companionPending = json.companionPending as CompanionEvent[];
    }
  }
  let portfolio: PortfolioArtifact[] | undefined;
  if (json.portfolio !== undefined) {
    if (!Array.isArray(json.portfolio) || !json.portfolio.every(isPortfolioArtifact)) {
      errors.push("portfolio has an invalid shape.");
    } else {
      portfolio = json.portfolio as PortfolioArtifact[];
    }
  }
  let notifications: NotificationState | undefined;
  if (json.notifications !== undefined) {
    if (!isNotificationState(json.notifications)) errors.push("notifications has an invalid shape.");
    else notifications = json.notifications;
  }
  let experiments: Experiment[] | undefined;
  if (json.experiments !== undefined) {
    if (!Array.isArray(json.experiments) || !json.experiments.every(isExperiment)) errors.push("experiments has an invalid shape.");
    else experiments = json.experiments;
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
  if (companionState !== undefined) {
    outData.companionState = companionState;
  }
  if (companionPending !== undefined) {
    outData.companionPending = companionPending;
  }
  if (portfolio !== undefined) {
    outData.portfolio = portfolio;
  }
  if (notifications !== undefined) {
    outData.notifications = notifications;
  }
  if (experiments !== undefined) {
    outData.experiments = experiments;
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
  if (data.companionState !== undefined) entries[COMPANION_KEY] = JSON.stringify(data.companionState);
  if (data.companionPending !== undefined) entries[COMPANION_PENDING_KEY] = JSON.stringify(data.companionPending);
  if (data.portfolio !== undefined) entries["levelup-portfolio-v1"] = JSON.stringify(data.portfolio);
  if (data.notifications !== undefined) entries["levelup-notifications-v1"] = JSON.stringify(data.notifications);
  if (data.experiments !== undefined) entries["levelup-experiments-v1"] = JSON.stringify(data.experiments);
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
  const transaction = inspectBackupTransaction(storage);
  if (!transaction) return false;
  try {
    for (const [key, value] of Object.entries(transaction.previous)) {
      if (value === null) remove(storage, key);
      else storage.setItem(key, value);
    }
  } finally {
    remove(storage, BACKUP_TRANSACTION_KEY);
  }
  return true;
}

export function inspectBackupTransaction(storage: BackupStorageLike): BackupJournal | null {
  const raw = storage.getItem(BACKUP_TRANSACTION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<BackupJournal>;
    if (value.schema !== 1 || typeof value.previous !== "object" || value.previous === null) return null;
    return { schema: 1, previous: value.previous as Record<string, string | null> };
  } catch {
    return null;
  }
}

export function clearBackupTransaction(storage: BackupStorageLike): void {
  remove(storage, BACKUP_TRANSACTION_KEY);
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
