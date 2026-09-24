import { COMPANION_SETTINGS_KEY, type CompanionSettings, type StorageLike } from "./types.ts";

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: true,
  motion: "full",
  dialogue: "normal",
  sound: false,
};

export function validateCompanionSettings(value: unknown): value is CompanionSettings {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.enabled === "boolean" &&
    (input.motion === "full" || input.motion === "reduced" || input.motion === "off") &&
    (input.dialogue === "normal" || input.dialogue === "minimal" || input.dialogue === "off") &&
    typeof input.sound === "boolean"
  );
}

export function readCompanionSettings(storage: StorageLike | null = null): CompanionSettings {
  if (!storage) return { ...DEFAULT_COMPANION_SETTINGS };
  try {
    const raw = storage.getItem(COMPANION_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_COMPANION_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!validateCompanionSettings(parsed)) return { ...DEFAULT_COMPANION_SETTINGS };
    return parsed;
  } catch {
    return { ...DEFAULT_COMPANION_SETTINGS };
  }
}

export function writeCompanionSettings(settings: CompanionSettings, storage: StorageLike | null = null): boolean {
  if (!storage || !validateCompanionSettings(settings)) return false;
  try {
    storage.setItem(COMPANION_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}