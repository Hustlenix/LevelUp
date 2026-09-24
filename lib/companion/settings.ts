import { COMPANION_SETTINGS_KEY, type CompanionSettings, type StorageLike } from "./types.ts";

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: true,
  motion: "full",
  dialogue: "normal",
  sound: false,
  interaction: true,
};

export function validateCompanionSettings(value: unknown): value is CompanionSettings {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.enabled === "boolean" &&
    (input.motion === "full" || input.motion === "reduced" || input.motion === "off") &&
    (input.dialogue === "normal" || input.dialogue === "minimal" || input.dialogue === "off") &&
    typeof input.sound === "boolean" &&
    typeof input.interaction === "boolean"
  );
}

export function readCompanionSettings(storage: StorageLike | null = null): CompanionSettings {
  if (!storage) return { ...DEFAULT_COMPANION_SETTINGS };
  try {
    const raw = storage.getItem(COMPANION_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_COMPANION_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_COMPANION_SETTINGS };
    const candidate = parsed as Record<string, unknown>;
    const migrated: CompanionSettings = {
      enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULT_COMPANION_SETTINGS.enabled,
      motion: candidate.motion === "full" || candidate.motion === "reduced" || candidate.motion === "off" ? candidate.motion : DEFAULT_COMPANION_SETTINGS.motion,
      dialogue: candidate.dialogue === "normal" || candidate.dialogue === "minimal" || candidate.dialogue === "off" ? candidate.dialogue : DEFAULT_COMPANION_SETTINGS.dialogue,
      sound: typeof candidate.sound === "boolean" ? candidate.sound : DEFAULT_COMPANION_SETTINGS.sound,
      interaction: typeof candidate.interaction === "boolean" ? candidate.interaction : DEFAULT_COMPANION_SETTINGS.interaction,
    };
    return migrated;
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