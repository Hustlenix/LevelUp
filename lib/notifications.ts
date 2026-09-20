"use client";

import { useSyncExternalStore } from "react";
import type { OSState } from "./os/types";

export const NOTIFICATIONS_KEY = "levelup-notifications-v1";
export interface NotificationState { enabled: boolean; quietStart: string; quietEnd: string; dismissedIds: string[]; readIds: string[]; }
export interface NotificationStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface InboxItem { id: string; kind: "session" | "review" | "recovery"; title: string; body: string; date: string; actionHref: string; }
export const defaultNotificationState = (): NotificationState => ({ enabled: true, quietStart: "22:00", quietEnd: "07:00", dismissedIds: [], readIds: [] });
function validTime(value: unknown): value is string { return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function normalizeNotificationState(value: unknown): NotificationState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return defaultNotificationState();
  const input = value as Partial<NotificationState>;
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
    quietStart: validTime(input.quietStart) ? input.quietStart : "22:00",
    quietEnd: validTime(input.quietEnd) ? input.quietEnd : "07:00",
    dismissedIds: Array.isArray(input.dismissedIds) ? input.dismissedIds.filter((id): id is string => typeof id === "string").slice(-200) : [],
    readIds: Array.isArray(input.readIds) ? input.readIds.filter((id): id is string => typeof id === "string").slice(-200) : [],
  };
}
export function deriveInbox(state: OSState, date: string): InboxItem[] { const items: InboxItem[] = []; for (const session of Object.values(state.sessions)) { if (session.date === date && session.status === "planned") items.push({ id: `session:${session.id}`, kind: "session", title: "A focus block is ready", body: `${session.plannedMinutes} minutes are planned for today.`, date, actionHref: "/focus/" }); if (session.date < date && session.status !== "completed" && session.status !== "skipped") items.push({ id: `recovery:${session.id}`, kind: "recovery", title: "Recover an unfinished block", body: `The ${session.plannedMinutes}-minute block from ${session.date} is waiting for a restart.`, date: session.date, actionHref: "/review/" }); } return items; }
export function dismissInboxItem(state: NotificationState, id: string): NotificationState { return { ...state, dismissedIds: [...new Set([...state.dismissedIds, id])] }; }
export function markInboxRead(state: NotificationState, id: string): NotificationState { return { ...state, readIds: [...new Set([...state.readIds, id])] }; }

const listeners = new Set<() => void>();
let cache: NotificationState | null = null;
const SERVER_NOTIFICATION_STATE = defaultNotificationState();

function browserStorage(): NotificationStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function readNotificationState(storage: Pick<NotificationStorage, "getItem"> | null): NotificationState {
  try {
    return normalizeNotificationState(JSON.parse(storage?.getItem(NOTIFICATIONS_KEY) ?? "{}"));
  } catch {
    return defaultNotificationState();
  }
}

function getNotificationSnapshot(): NotificationState {
  if (!cache) cache = readNotificationState(browserStorage());
  return cache;
}

export function getNotificationStateSnapshot(): NotificationState {
  return getNotificationSnapshot();
}

export function getNotificationServerSnapshot(): NotificationState {
  return SERVER_NOTIFICATION_STATE;
}

function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationsStore(): NotificationState {
  return useSyncExternalStore(subscribeNotifications, getNotificationSnapshot, getNotificationServerSnapshot);
}

export function saveNotificationState(next: NotificationState): void {
  cache = normalizeNotificationState(next);
  try {
    browserStorage()?.setItem(NOTIFICATIONS_KEY, JSON.stringify(cache));
  } catch {
    /* private browsing */
  }
  for (const listener of listeners) listener();
}

export function restoreNotificationState(next: NotificationState): boolean {
  const normalized = normalizeNotificationState(next);
  if (JSON.stringify(normalized) !== JSON.stringify(next)) return false;
  saveNotificationState(normalized);
  return true;
}
