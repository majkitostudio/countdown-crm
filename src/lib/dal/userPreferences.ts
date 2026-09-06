import "server-only";

import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import type { Database } from "@/lib/supabase/types";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/settings";

type PreferencesRow = Database["public"]["Tables"]["workspace_user_preferences"]["Row"];

export interface UserPreferencesDTO extends UserSettings {
  workspace_id: string;
  user_id: string;
  persisted: boolean;
  updated_at: string | null;
}

const PREFERENCES_SELECT = "workspace_id, user_id, ringtone_volume, client_profile_density, updated_at";

function validatePreferences(input: UserSettings): void {
  if (
    !input
    || typeof input !== "object"
    || !Number.isInteger(input.ringtone_volume)
    || input.ringtone_volume < 0
    || input.ringtone_volume > 100
    || (input.client_profile_density !== "full" && input.client_profile_density !== "compact")
  ) {
    throw new DataAccessError("VALIDATION", "Invalid user preferences.");
  }
}

function mapPreferences(row: PreferencesRow): UserPreferencesDTO {
  return {
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    ringtone_volume: row.ringtone_volume,
    client_profile_density: row.client_profile_density,
    persisted: true,
    updated_at: row.updated_at,
  };
}

export async function getUserPreferencesForWorkspace(): Promise<UserPreferencesDTO> {
  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_user_preferences")
    .select(PREFERENCES_SELECT)
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "User preferences could not be loaded.");
  }

  if (!data) {
    return {
      workspace_id: context.workspaceId,
      user_id: context.userId,
      ...DEFAULT_USER_SETTINGS,
      persisted: false,
      updated_at: null,
    };
  }

  return mapPreferences(data as PreferencesRow);
}

export async function updateUserPreferencesForWorkspace(
  input: UserSettings,
): Promise<UserPreferencesDTO> {
  validatePreferences(input);

  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_user_preferences")
    .upsert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      ringtone_volume: input.ringtone_volume,
      client_profile_density: input.client_profile_density,
    }, { onConflict: "workspace_id,user_id" })
    .select(PREFERENCES_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "User preferences could not be saved.");
  }

  return mapPreferences(data as PreferencesRow);
}
