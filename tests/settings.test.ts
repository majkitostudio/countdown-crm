import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_USER_SETTINGS,
  getUserSettings,
  saveUserSettings,
} from "@/lib/settings";

const SETTINGS_KEY = "countdown_crm_user_settings";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function setBrowserStorage(value: string | null = null) {
  const storage = {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  } as unknown as Storage;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  return storage;
}

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;

  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("user settings", () => {
  it("uses the deterministic defaults during server rendering", () => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;

    expect(getUserSettings()).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("loads a valid persisted ringtone volume in the browser", () => {
    setBrowserStorage(JSON.stringify({ ringtone_volume: 10 }));

    expect(getUserSettings()).toEqual({ ringtone_volume: 10 });
  });

  it.each([
    "not-json",
    JSON.stringify({ ringtone_volume: -1 }),
    JSON.stringify({ ringtone_volume: 101 }),
    JSON.stringify({ ringtone_volume: "10" }),
  ])("falls back to defaults for invalid local storage: %s", (storedValue) => {
    setBrowserStorage(storedValue);

    expect(getUserSettings()).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("persists the ringtone volume locally", () => {
    const storage = setBrowserStorage();

    saveUserSettings({ ringtone_volume: 25 });

    expect(storage.setItem).toHaveBeenCalledWith(
      SETTINGS_KEY,
      JSON.stringify({ ringtone_volume: 25 }),
    );
  });
});
