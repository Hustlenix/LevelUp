import { LIFE_SCHEMA_VERSION, LIFE_SKILLS, type LifeSkill, type LifeState } from "./types.ts";

const emptySkillXp = (): Record<LifeSkill, number> => Object.fromEntries(LIFE_SKILLS.map((skill) => [skill, 0])) as Record<LifeSkill, number>;

export function createEmptyLifeState(now = "1970-01-01T00:00:00.000Z"): LifeState {
  return {
    schemaVersion: LIFE_SCHEMA_VERSION,
    profile: null,
    progression: { totalXp: 0, skillXp: emptySkillXp(), completions: [], streak: { current: 0, best: 0, lastDate: null } },
    preferences: { reducedMotion: false, sound: false, reminders: false },
    updatedAt: now,
  };
}

