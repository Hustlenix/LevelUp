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
const PORTFOLIO_KINDS: PortfolioArtifactKind[] = ["artifact", "evidence", "reflection", "result"];
const SERVER_EMPTY_PORTFOLIO: readonly PortfolioArtifact[] = Object.freeze([]);

export function isPortfolioArtifact(value: unknown): value is PortfolioArtifact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Partial<PortfolioArtifact>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.description === "string" && PORTFOLIO_KINDS.includes(item.kind as PortfolioArtifactKind) && typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function normalizePortfolioArtifacts(value: unknown): PortfolioArtifact[] {
  return Array.isArray(value) ? value.filter(isPortfolioArtifact).slice(0, 500) : [];
}

function read(storage: PortfolioStorage | null): PortfolioArtifact[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(PORTFOLIO_KEY) ?? "[]") as unknown;
    return normalizePortfolioArtifacts(parsed);
  } catch { return []; }
}
function storage(): PortfolioStorage | null { if (typeof window === "undefined") return null; try { return window.localStorage; } catch { return null; } }
function emit() { for (const listener of listeners) listener(); }
function write(items: PortfolioArtifact[], target: PortfolioStorage | null = storage()) { cache = items; try { target?.setItem(PORTFOLIO_KEY, JSON.stringify(items)); } catch { /* local storage unavailable */ } emit(); }
export function getPortfolioSnapshot(target: PortfolioStorage | null = storage()): PortfolioArtifact[] { if (!cache) cache = read(target); return cache; }
export function subscribePortfolio(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export function usePortfolioStore(): PortfolioArtifact[] {
  return useSyncExternalStore(
    subscribePortfolio,
    getPortfolioSnapshot,
    () => SERVER_EMPTY_PORTFOLIO as PortfolioArtifact[],
  );
}
export function addPortfolioArtifact(input: Omit<PortfolioArtifact, "id" | "createdAt" | "updatedAt">, target: PortfolioStorage | null = storage()): PortfolioArtifact { const now = new Date().toISOString(); const item: PortfolioArtifact = { ...input, id: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now }; write([item, ...getPortfolioSnapshot(target)], target); return item; }
export function updatePortfolioArtifact(id: string, patch: Partial<PortfolioArtifact>, target: PortfolioStorage | null = storage()): void { write(getPortfolioSnapshot(target).map((item) => item.id === id ? { ...item, ...patch, id, updatedAt: new Date().toISOString() } : item), target); }
export function deletePortfolioArtifact(id: string, target: PortfolioStorage | null = storage()): void { write(getPortfolioSnapshot(target).filter((item) => item.id !== id), target); }
export function restorePortfolioArtifacts(items: PortfolioArtifact[], target: PortfolioStorage | null = storage()): boolean { const normalized = normalizePortfolioArtifacts(items); if (normalized.length !== items.length) return false; write(normalized, target); return true; }
