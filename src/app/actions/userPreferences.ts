"use server";

import {
  getUserPreferencesForWorkspace,
  updateUserPreferencesForWorkspace,
  type UserPreferencesDTO,
} from "@/lib/dal/userPreferences";
import type { UserSettings } from "@/lib/settings";

export async function getUserPreferencesAction(): Promise<UserPreferencesDTO> {
  return getUserPreferencesForWorkspace();
}

export async function updateUserPreferencesAction(
  input: UserSettings,
): Promise<UserPreferencesDTO> {
  return updateUserPreferencesForWorkspace(input);
}
