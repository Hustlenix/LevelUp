"use client";

import { useSyncExternalStore } from "react";

export type PortfolioArtifactKind = "artifact" | "evidence" | "reflection" | "result";
export interface PortfolioArtifact {
  id: string;
  title: string;
  description: string;
  kind: PortfolioArtifactKind;
  goalId?: string;
  milestoneId?: string;
  taskId?: string;
  sessionId?: string;
  completionEventId?: string;
  chapterSlug?: string;
  createdAt: string;
  updatedAt: string;
}

export const PORTFOLIO_KEY = "levelup-portfolio-v1";
export interface PortfolioStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const listeners = new Set<() => void>();
let cache: PortfolioArtifact[] | null = null;

function read(storage: PortfolioStorage | null): PortfolioArtifact[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(PORTFOLIO_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is PortfolioArtifact => typeof item === "object" && item !== null && typeof (item as PortfolioArtifact).id === "string" && typeof (item as PortfolioArtifact).title === "string") : [];
  } catch { return []; }
}
function storage(): PortfolioStorage | null { return typeof window === "undefined" ? null : window.localStorage; }
function emit() { for (const listener of listeners) listener(); }
function write(items: PortfolioArtifact[], target: PortfolioStorage | null = storage()) { cache = items; try { target?.setItem(PORTFOLIO_KEY, JSON.stringify(items)); } catch { /* local storage unavailable */ } emit(); }
export function getPortfolioSnapshot(target: PortfolioStorage | null = storage()): PortfolioArtifact[] { if (!cache) cache = read(target); return cache; }
export function subscribePortfolio(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function usePortfolioStore(): PortfolioArtifact[] { return useSyncExternalStore(subscribePortfolio, getPortfolioSnapshot, () => []); }
export function addPortfolioArtifact(input: Omit<PortfolioArtifact, "id" | "createdAt" | "updatedAt">, target: PortfolioStorage | null = storage()): PortfolioArtifact { const now = new Date().toISOString(); const item: PortfolioArtifact = { ...input, id: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now }; write([item, ...getPortfolioSnapshot(target)], target); return item; }
export function updatePortfolioArtifact(id: string, patch: Partial<PortfolioArtifact>, target: PortfolioStorage | null = storage()): void { write(getPortfolioSnapshot(target).map((item) => item.id === id ? { ...item, ...patch, id, updatedAt: new Date().toISOString() } : item), target); }
export function deletePortfolioArtifact(id: string, target: PortfolioStorage | null = storage()): void { write(getPortfolioSnapshot(target).filter((item) => item.id !== id), target); }
export function restorePortfolioArtifacts(items: PortfolioArtifact[], target: PortfolioStorage | null = storage()): void { write(items, target); }
