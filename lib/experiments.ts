"use client";

import { useSyncExternalStore } from "react";
import { ANALYTICS_EVENTS, trackEvent } from "./analytics.ts";

export type ExperimentStatus = "planned" | "running" | "complete";
export type ExperimentDecision = "keep" | "modify" | "abandon" | "repeat";

export interface Experiment {
  id: string;
  hypothesis: string;
  durationDays: number;
  baseline: string;
  variable: string;
  metric: string;
  status: ExperimentStatus;
  result: string;
  reflection: string;
  decision: ExperimentDecision | null;
  createdAt: string;
  updatedAt: string;
}

const KEY = "levelup-experiments-v1";
const listeners = new Set<() => void>();
let cache: Experiment[] | null = null;

function read(): Experiment[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is Experiment => typeof value === "object" && value !== null && typeof (value as Experiment).id === "string") : [];
  } catch {
    return [];
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function getExperimentsSnapshot(): Experiment[] {
  if (!cache) cache = read();
  return cache;
}

export function subscribeExperiments(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useExperimentsStore(): Experiment[] {
  return useSyncExternalStore(subscribeExperiments, getExperimentsSnapshot, () => []);
}

function write(next: Experiment[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* local storage may be unavailable in private browsing */
  }
  emit();
}

export function addExperiment(input: Omit<Experiment, "id" | "createdAt" | "updatedAt">): Experiment {
  const now = new Date().toISOString();
  const experiment: Experiment = { ...input, id: `experiment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
  write([experiment, ...getExperimentsSnapshot()]);
  trackEvent(ANALYTICS_EVENTS.experimentStarted, { os_entity: "experiment" });
  return experiment;
}

export function updateExperiment(id: string, patch: Partial<Experiment>): void {
  const next = getExperimentsSnapshot().map((experiment) => experiment.id === id ? { ...experiment, ...patch, id, updatedAt: new Date().toISOString() } : experiment);
  write(next);
  if (patch.status === "complete") trackEvent(ANALYTICS_EVENTS.experimentCompleted, { os_entity: "experiment" });
}

export function restoreExperiments(experiments: Experiment[]): void {
  write(experiments);
}
