import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyUserPreferences,
  DEFAULT_USER_SETTINGS,
  readLegacyUserPreferences,
} from "@/lib/settings";

const LEGACY_SETTINGS_KEY = "countdown_crm_user_settings";
const LEGACY_DENSITY_KEY = "countdown-crm:operator-console:client-profile-density";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function setBrowserStorage(values: Record<string, string> = {}) {
  const storage = {
    getItem: vi.fn((key: string) => values[key] ?? null),
    removeItem: vi.fn(),
  } as unknown as Storage;

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

  return storage;
}

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;

  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("user settings", () => {
  it("defines deterministic server defaults for every active personal preference", () => {
    expect(DEFAULT_USER_SETTINGS).toEqual({
      ringtone_volume: 80,
      client_profile_density: "full",
    });
  });

  it("reads valid legacy browser values only for one-time server migration", () => {
    setBrowserStorage({
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ ringtone_volume: 25 }),
      [LEGACY_DENSITY_KEY]: "compact",
    });

    expect(readLegacyUserPreferences()).toEqual({
      ringtone_volume: 25,
      client_profile_density: "compact",
    });
  });

  it("ignores invalid legacy values instead of turning them into account settings", () => {
    setBrowserStorage({
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ ringtone_volume: 101 }),
      [LEGACY_DENSITY_KEY]: "unexpected",
    });

    expect(readLegacyUserPreferences()).toBeNull();
  });

  it("removes both legacy keys only after a successful server migration", () => {
    const storage = setBrowserStorage();

    clearLegacyUserPreferences();

    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_SETTINGS_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_DENSITY_KEY);
  });
});
