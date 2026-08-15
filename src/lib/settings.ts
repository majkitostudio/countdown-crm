export interface UserSettings {
  default_language: "cs-CZ" | "sk-SK" | "en-US";
  audio_effects_enabled: boolean;
  ringtone_volume: number;
  gemini_auto_analyze: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  default_language: "cs-CZ",
  audio_effects_enabled: true,
  ringtone_volume: 80,
  gemini_auto_analyze: true,
};

const SETTINGS_KEY = "countdown_crm_user_settings";

/**
 * Retrieves current operator settings from localStorage or defaults
 */
export function getUserSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS;

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.warn("Failed to load settings from localStorage:", e);
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Saves operator settings to localStorage
 */
export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings to localStorage:", e);
  }
}
