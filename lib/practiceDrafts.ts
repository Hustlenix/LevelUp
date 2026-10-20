export const PRACTICE_DRAFTS_KEY = "levelup-practice-drafts-v1";
export interface PracticeDraft { notes: string; checked: number[]; kind: string; updatedAt: number }
export interface PracticeDrafts { version: 1; entries: Record<string, PracticeDraft> }
export const EMPTY_PRACTICE_DRAFT: PracticeDraft = { notes: "", checked: [], kind: "Plan prepared", updatedAt: 0 };
export const emptyPracticeDrafts = (): PracticeDrafts => ({ version: 1, entries: {} });
export function isPracticeDrafts(value: unknown): value is PracticeDrafts {
  if (!value || typeof value !== "object") return false;
  const store = value as PracticeDrafts;
  return store.version === 1 && !!store.entries && typeof store.entries === "object" && !Array.isArray(store.entries) && Object.keys(store.entries).length <= 100 && Object.entries(store.entries).every(([key, draft]) => /^[a-z0-9-]+:[a-z0-9-]+$/.test(key) && key.length <= 150 && draft && typeof draft.notes === "string" && draft.notes.length <= 5000 && Array.isArray(draft.checked) && draft.checked.length <= 10 && draft.checked.every(n => Number.isInteger(n) && n >= 0 && n < 10) && new Set(draft.checked).size === draft.checked.length && ["Plan prepared", "Practice attempted", "Review completed"].includes(draft.kind) && Number.isFinite(draft.updatedAt) && draft.updatedAt >= 0);
}
export function editPracticeDraft(store: PracticeDrafts, key: string, patch: Partial<PracticeDraft>, now: number): PracticeDrafts {
  const next = { ...store, entries: { ...store.entries, [key]: { ...(store.entries[key] ?? EMPTY_PRACTICE_DRAFT), ...patch, updatedAt: now } } };
  return isPracticeDrafts(next) ? next : store;
}
