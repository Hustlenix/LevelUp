export const LIFE_SCHEMA_VERSION = 1 as const;

export const LIFE_SKILLS = [
  "focus",
  "learning",
  "fitness",
  "discipline",
  "confidence",
  "mind",
  "career",
] as const;

export type LifeSkill = (typeof LIFE_SKILLS)[number];
export type LifeIntensity = "gentle" | "steady" | "ambitious";
export type ConsistencyLevel = "starting" | "sometimes" | "consistent";
export type CompanionStage = "seed" | "spark" | "scout" | "builder" | "guide" | "legend";

export interface LifeProfile {
  name: string;
  goals: LifeSkill[];
  minutesPerDay: number;
  intensity: LifeIntensity;
  consistency: ConsistencyLevel;
  wakeTime: string | null;
  sleepTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MissionRecord {
  id: string;
  missionId: string;
  title: string;
  skill: LifeSkill;
  minutes: number;
  xp: number;
  date: string;
  completedAt: string;
  proof: string;
}

export interface LifeProgression {
  totalXp: number;
  skillXp: Record<LifeSkill, number>;
  completions: MissionRecord[];
  streak: { current: number; best: number; lastDate: string | null };
}

export interface LifePreferences {
  reducedMotion: boolean;
  sound: boolean;
  reminders: boolean;
}

export interface LifeState {
  schemaVersion: typeof LIFE_SCHEMA_VERSION;
  profile: LifeProfile | null;
  progression: LifeProgression;
  preferences: LifePreferences;
  updatedAt: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  skill: LifeSkill;
  minutes: number;
  xp: number;
  difficulty: "Easy" | "Focused" | "Challenge";
  proofPrompt: string;
  primary: boolean;
  date: string;
}

export interface LevelSummary {
  level: number;
  title: string;
  currentXp: number;
  nextXp: number;
  progress: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}
