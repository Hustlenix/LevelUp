"use client";

import { useSyncExternalStore } from "react";
import { recordActivity } from "@/lib/activity";

export interface DailyCalibration {
  date: string;
  primaryOutcome: string;
  physicalAction: string;
  actionTime: string;
  obstacleReframe: string;
  breathingCompleted: boolean;
  completed: boolean;
}

export interface FocusBlockSession {
  id: string;
  date: string;
  taskName: string;
  durationMinutes: number;
  completedSeconds: number;
  distractions: string[];
  oneLineWin: string;
  completedAt: number;
}

export interface UrgeLog {
  id: string;
  timestamp: number;
  triggerType: string;
  delayedSeconds: number;
  resisted: boolean;
  notes?: string;
}

export interface PillarFloorCheck {
  date: string;
  health: { floor: string; done: boolean };
  wealth: { floor: string; done: boolean };
  love: { floor: string; done: boolean };
  self: { floor: string; done: boolean };
}

export interface ProtocolLog {
  id: string;
  protocolNum: string;
  protocolTitle: string;
  date: string;
  inputs: Record<string, string>;
  durationSeconds: number;
  completedAt: number;
}

const CALIBRATION_KEY = "levelup-daily-calibration-v1";
const FOCUS_KEY = "levelup-focus-sessions-v1";
const URGES_KEY = "levelup-urge-pauses-v1";
const PILLARS_KEY = "levelup-pillar-floors-v1";
const PROTOCOL_LOGS_KEY = "levelup-protocol-logs-v1";

const listeners = new Set<() => void>();

const SERVER_EMPTY_CALIBRATIONS: Record<string, DailyCalibration> = Object.freeze({});
const SERVER_EMPTY_FOCUS: readonly FocusBlockSession[] = Object.freeze([]);
const SERVER_EMPTY_URGES: readonly UrgeLog[] = Object.freeze([]);
const SERVER_EMPTY_PILLARS: Record<string, PillarFloorCheck> = Object.freeze({});
const SERVER_EMPTY_PROTOCOLS: readonly ProtocolLog[] = Object.freeze([]);

const getServerCalibrations = () => SERVER_EMPTY_CALIBRATIONS;
const getServerFocus = () => SERVER_EMPTY_FOCUS as FocusBlockSession[];
const getServerUrges = () => SERVER_EMPTY_URGES as UrgeLog[];
const getServerPillars = () => SERVER_EMPTY_PILLARS;
const getServerProtocols = () => SERVER_EMPTY_PROTOCOLS as ProtocolLog[];

function subscribeActionTools(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit() {
  for (const l of listeners) l();
}

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  emit();
}

// ----------------- CALIBRATION -----------------
let calibrationCache: Record<string, DailyCalibration> | null = null;

export function getCalibrationsSnapshot(): Record<string, DailyCalibration> {
  if (!calibrationCache) {
    calibrationCache = readJson<Record<string, DailyCalibration>>(CALIBRATION_KEY, {});
  }
  return calibrationCache;
}

export function useCalibrationStore(): Record<string, DailyCalibration> {
  return useSyncExternalStore(
    subscribeActionTools,
    getCalibrationsSnapshot,
    getServerCalibrations
  );
}

export function saveCalibration(data: Partial<DailyCalibration>) {
  const today = getTodayString();
  const existing = getCalibrationsSnapshot()[today] || {
    date: today,
    primaryOutcome: "",
    physicalAction: "",
    actionTime: "",
    obstacleReframe: "Obstacles are information, not verdicts.",
    breathingCompleted: false,
    completed: false,
  };

  const updated: DailyCalibration = {
    ...existing,
    ...data,
    date: today,
  };

  const next = { ...getCalibrationsSnapshot(), [today]: updated };
  calibrationCache = next;
  writeJson(CALIBRATION_KEY, next);
  recordActivity();
}

// ----------------- FOCUS BLOCKS -----------------
let focusCache: FocusBlockSession[] | null = null;

export function getFocusSnapshot(): FocusBlockSession[] {
  if (!focusCache) {
    focusCache = readJson<FocusBlockSession[]>(FOCUS_KEY, []);
  }
  return focusCache;
}

export function useFocusStore(): FocusBlockSession[] {
  return useSyncExternalStore(
    subscribeActionTools,
    getFocusSnapshot,
    getServerFocus
  );
}

export function logFocusSession(session: Omit<FocusBlockSession, "id" | "date" | "completedAt">) {
  const full: FocusBlockSession = {
    ...session,
    id: `focus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: getTodayString(),
    completedAt: Date.now(),
  };
  const next = [full, ...getFocusSnapshot()];
  focusCache = next;
  writeJson(FOCUS_KEY, next);
  recordActivity();
  return full;
}

// ----------------- URGES -----------------
let urgesCache: UrgeLog[] | null = null;

export function getUrgesSnapshot(): UrgeLog[] {
  if (!urgesCache) {
    urgesCache = readJson<UrgeLog[]>(URGES_KEY, []);
  }
  return urgesCache;
}

export function useUrgesStore(): UrgeLog[] {
  return useSyncExternalStore(
    subscribeActionTools,
    getUrgesSnapshot,
    getServerUrges
  );
}

export function logUrgePause(triggerType: string, delayedSeconds: number, resisted: boolean, notes?: string) {
  const entry: UrgeLog = {
    id: `urge_${Date.now()}`,
    timestamp: Date.now(),
    triggerType,
    delayedSeconds,
    resisted,
    notes,
  };
  const next = [entry, ...getUrgesSnapshot()];
  urgesCache = next;
  writeJson(URGES_KEY, next);
  recordActivity();
  return entry;
}

// ----------------- PILLAR FLOORS -----------------
let pillarsCache: Record<string, PillarFloorCheck> | null = null;

const DEFAULT_FLOORS = {
  health: "10 pushups or 15-min walk",
  wealth: "1 high-leverage outreach or 30m deep work",
  love: "1 honest check-in or presence without phones",
  self: "5 minutes reflection or reading 1 chapter",
};

export function getPillarsSnapshot(): Record<string, PillarFloorCheck> {
  if (!pillarsCache) {
    pillarsCache = readJson<Record<string, PillarFloorCheck>>(PILLARS_KEY, {});
  }
  return pillarsCache;
}

export function usePillarsStore(): Record<string, PillarFloorCheck> {
  return useSyncExternalStore(
    subscribeActionTools,
    getPillarsSnapshot,
    getServerPillars
  );
}

export function togglePillarFloor(pillar: "health" | "wealth" | "love" | "self") {
  const today = getTodayString();
  const existing = getPillarsSnapshot()[today] || {
    date: today,
    health: { floor: DEFAULT_FLOORS.health, done: false },
    wealth: { floor: DEFAULT_FLOORS.wealth, done: false },
    love: { floor: DEFAULT_FLOORS.love, done: false },
    self: { floor: DEFAULT_FLOORS.self, done: false },
  };

  const updated: PillarFloorCheck = {
    ...existing,
    [pillar]: {
      ...existing[pillar],
      done: !existing[pillar].done,
    },
  };

  const next = { ...getPillarsSnapshot(), [today]: updated };
  pillarsCache = next;
  writeJson(PILLARS_KEY, next);
  recordActivity();
}

export function updatePillarFloorRule(pillar: "health" | "wealth" | "love" | "self", floorText: string) {
  const today = getTodayString();
  const existing = getPillarsSnapshot()[today] || {
    date: today,
    health: { floor: DEFAULT_FLOORS.health, done: false },
    wealth: { floor: DEFAULT_FLOORS.wealth, done: false },
    love: { floor: DEFAULT_FLOORS.love, done: false },
    self: { floor: DEFAULT_FLOORS.self, done: false },
  };

  const updated: PillarFloorCheck = {
    ...existing,
    [pillar]: {
      ...existing[pillar],
      floor: floorText,
    },
  };

  const next = { ...getPillarsSnapshot(), [today]: updated };
  pillarsCache = next;
  writeJson(PILLARS_KEY, next);
}

// ----------------- PROTOCOL SESSIONS -----------------
let protocolLogsCache: ProtocolLog[] | null = null;

export function getProtocolLogsSnapshot(): ProtocolLog[] {
  if (!protocolLogsCache) {
    protocolLogsCache = readJson<ProtocolLog[]>(PROTOCOL_LOGS_KEY, []);
  }
  return protocolLogsCache;
}

export function useProtocolLogsStore(): ProtocolLog[] {
  return useSyncExternalStore(
    subscribeActionTools,
    getProtocolLogsSnapshot,
    getServerProtocols
  );
}

export function logProtocolExecution(protocolNum: string, protocolTitle: string, inputs: Record<string, string>, durationSeconds: number) {
  const log: ProtocolLog = {
    id: `proto_${Date.now()}`,
    protocolNum,
    protocolTitle,
    date: getTodayString(),
    inputs,
    durationSeconds,
    completedAt: Date.now(),
  };
  const next = [log, ...getProtocolLogsSnapshot()];
  protocolLogsCache = next;
  writeJson(PROTOCOL_LOGS_KEY, next);
  recordActivity();
  return log;
}

// ----------------- AUDIO CHIME (WEB AUDIO API) -----------------
let sharedChimeCtx: AudioContext | null = null;

function getSharedChimeContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedChimeCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedChimeCtx = new AudioCtx();
      }
    }
    if (sharedChimeCtx && sharedChimeCtx.state === "suspended") {
      sharedChimeCtx.resume().catch(() => {});
    }
    return sharedChimeCtx;
  } catch {
    return null;
  }
}

function runChimeTone(ctx: AudioContext, type: "start" | "finish" | "breath" | "tick") {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "finish") {
      // Harmonic singing bowl chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(528, now); // Solfeggio 528Hz
      osc.frequency.exponentialRampToValueAtTime(1056, now + 0.8);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.start(now);
      osc.stop(now + 1.8);
    } else if (type === "start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === "breath") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === "tick") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    /* ignore */
  }
}

export function playBellChime(type: "start" | "finish" | "breath" | "tick" = "finish") {
  if (typeof window === "undefined") return;
  try {
    const ctx = getSharedChimeContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        runChimeTone(ctx, type);
      }).catch(() => {});
    } else {
      runChimeTone(ctx, type);
    }
  } catch {
    /* audio playback prevented by browser autoplay policy */
  }
}

export function reloadActionToolsCaches() {
  calibrationCache = null;
  focusCache = null;
  urgesCache = null;
  pillarsCache = null;
  protocolLogsCache = null;
  emit();
}
