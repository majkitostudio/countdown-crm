export interface UserSettings {
  ringtone_volume: number;
  client_profile_density: "full" | "compact";
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ringtone_volume: 80,
  client_profile_density: "full",
};

const LEGACY_SETTINGS_KEY = "countdown_crm_user_settings";
const LEGACY_DENSITY_KEY = "countdown-crm:operator-console:client-profile-density";

function isValidVolume(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= 100;
}

function isValidDensity(value: unknown): value is UserSettings["client_profile_density"] {
  return value === "full" || value === "compact";
}

/** Reads browser-only values from older CRM versions for one-time migration. */
export function readLegacyUserPreferences(): Partial<UserSettings> | null {
  if (typeof window === "undefined") return null;

  const legacy: Partial<UserSettings> = {};

  try {
    const storedSettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as { ringtone_volume?: unknown };
      if (isValidVolume(parsed.ringtone_volume)) {
        legacy.ringtone_volume = parsed.ringtone_volume;
      }
    }
  } catch {
    // Malformed or blocked browser storage is ignored during migration.
  }

  try {
    const density = localStorage.getItem(LEGACY_DENSITY_KEY);
    if (isValidDensity(density)) {
      legacy.client_profile_density = density;
    }
  } catch {
    // Server defaults remain authoritative when storage is unavailable.
  }

  return Object.keys(legacy).length > 0 ? legacy : null;
}

export function clearLegacyUserPreferences(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    localStorage.removeItem(LEGACY_DENSITY_KEY);
  } catch {
    // A successful server save is enough; blocked storage is harmless.
  }
}
