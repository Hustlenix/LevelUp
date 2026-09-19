"use client";

import type { OSState } from "./os/types";

export const NOTIFICATIONS_KEY = "levelup-notifications-v1";
export interface NotificationState { enabled: boolean; quietStart: string; quietEnd: string; dismissedIds: string[]; readIds: string[]; }
export interface InboxItem { id: string; kind: "session" | "review" | "recovery"; title: string; body: string; date: string; actionHref: string; }
export const defaultNotificationState = (): NotificationState => ({ enabled: true, quietStart: "22:00", quietEnd: "07:00", dismissedIds: [], readIds: [] });
export function deriveInbox(state: OSState, date: string): InboxItem[] { const items: InboxItem[] = []; for (const session of Object.values(state.sessions)) { if (session.date === date && session.status === "planned") items.push({ id: `session:${session.id}`, kind: "session", title: "A focus block is ready", body: `${session.plannedMinutes} minutes are planned for today.`, date, actionHref: "/focus/" }); if (session.date < date && session.status !== "completed" && session.status !== "skipped") items.push({ id: `recovery:${session.id}`, kind: "recovery", title: "Recover an unfinished block", body: `The ${session.plannedMinutes}-minute block from ${session.date} is waiting for a restart.`, date: session.date, actionHref: "/review/" }); } return items; }
export function dismissInboxItem(state: NotificationState, id: string): NotificationState { return { ...state, dismissedIds: [...new Set([...state.dismissedIds, id])] }; }
export function markInboxRead(state: NotificationState, id: string): NotificationState { return { ...state, readIds: [...new Set([...state.readIds, id])] }; }
