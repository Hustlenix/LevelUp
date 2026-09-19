"use client";

import { useSyncExternalStore } from "react";
import type { AiPlanState } from "./store-types.ts";
import type { AiSessionStatus, DailyPlan } from "./contracts.ts";
import { validatePlannerResult } from "./schemas.ts";

const KEY = "levelup-ai-plans-v1";
const MAX_STORED_PLANS = 30;
const listeners = new Set<() => void>();
let cache: AiPlanState | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function emptyState(): AiPlanState {
  return { plans: {} };
}

function readState(): AiPlanState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as { plans?: Record<string, unknown> } : null;
    const plans: AiPlanState["plans"] = {};
    for (const [date, value] of Object.entries(parsed?.plans ?? {})) {
      const plan = validatePlannerResult(value);
      if (plan && plan.date === date) plans[date] = plan;
    }
    return { plans };
  } catch {
    return emptyState();
  }
}

function writeState(state: AiPlanState) {
  cache = state;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage can be unavailable in private browsing or embedded contexts. */
  }
  emit();
}

export function subscribeAiPlans(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAiPlanStateSnapshot(): AiPlanState {
  if (!cache) cache = readState();
  return cache;
}

const SERVER_EMPTY: AiPlanState = Object.freeze({ plans: Object.freeze({}) });

export function useAiPlanStore(): AiPlanState {
  return useSyncExternalStore(subscribeAiPlans, getAiPlanStateSnapshot, () => SERVER_EMPTY);
}

export function saveAiPlan(plan: DailyPlan): void {
  const valid = validatePlannerResult(plan, plan.source);
  if (!valid) return;
  const current = getAiPlanStateSnapshot();
  const nextPlans = { ...current.plans, [valid.date]: valid };
  const dates = Object.keys(nextPlans).sort().reverse().slice(0, MAX_STORED_PLANS);
  const boundedPlans = Object.fromEntries(dates.map((date) => [date, nextPlans[date]]));
  writeState({ plans: boundedPlans });
}

export function setAiSessionStatus(date: string, sessionId: string, status: AiSessionStatus): void {
  const plan = getAiPlanStateSnapshot().plans[date];
  if (!plan) return;
  const sessions = plan.sessions.map((session) => session.id === sessionId ? { ...session, status } : session);
  if (!sessions.some((session) => session.id === sessionId)) return;
  saveAiPlan({ ...plan, sessions });
}

export function getAiPlan(date: string): DailyPlan | null {
  return getAiPlanStateSnapshot().plans[date] ?? null;
}

export function reloadAiPlanCache(): void {
  cache = null;
  emit();
}
