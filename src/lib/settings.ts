export interface UserSettings {
  ringtone_volume: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ringtone_volume: 80,
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
