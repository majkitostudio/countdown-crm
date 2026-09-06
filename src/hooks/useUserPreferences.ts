"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  getUserPreferencesAction,
  updateUserPreferencesAction,
} from "@/app/actions/userPreferences";
import {
  clearLegacyUserPreferences,
  DEFAULT_USER_SETTINGS,
  readLegacyUserPreferences,
  type UserSettings,
} from "@/lib/settings";

interface UserPreferencesState {
  preferences: UserSettings;
  setPreferences: Dispatch<SetStateAction<UserSettings>>;
  isLoading: boolean;
  error: string | null;
  save: (preferences: UserSettings) => Promise<UserSettings>;
}

export function useUserPreferences(): UserPreferencesState {
  const [preferences, setPreferences] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void getUserPreferencesAction()
      .then(async (serverPreferences) => {
        let resolved: UserSettings = {
          ringtone_volume: serverPreferences.ringtone_volume,
          client_profile_density: serverPreferences.client_profile_density,
        };

        if (!serverPreferences.persisted) {
          const legacy = readLegacyUserPreferences();
          if (legacy) {
            const migrated = await updateUserPreferencesAction({ ...resolved, ...legacy });
            resolved = {
              ringtone_volume: migrated.ringtone_volume,
              client_profile_density: migrated.client_profile_density,
            };
            clearLegacyUserPreferences();
          }
        }

        if (isCurrent) {
          setPreferences(resolved);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : "User preferences could not be loaded.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const save = useCallback(async (nextPreferences: UserSettings): Promise<UserSettings> => {
    try {
      const saved = await updateUserPreferencesAction(nextPreferences);
      const resolved = {
        ringtone_volume: saved.ringtone_volume,
        client_profile_density: saved.client_profile_density,
      };
      setPreferences(resolved);
      setError(null);
      return resolved;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "User preferences could not be saved.");
      throw saveError;
    }
  }, []);

  return { preferences, setPreferences, isLoading, error, save };
}
