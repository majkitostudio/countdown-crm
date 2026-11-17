import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import {
  isSelectableTelephonyAdapter,
  isTelnyxActivationBlocked,
  type SelectableTelephonyAdapter,
  type TelephonyAdapter,
} from "@/lib/telephony/telephonyAdapterShared";

type SettingsRow = Database["public"]["Tables"]["workspace_telephony_settings"]["Row"];

export interface WorkspaceTelephonySettings {
  workspace_id: string;
  active_adapter: TelephonyAdapter;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const SETTINGS_SELECT = "workspace_id, active_adapter, updated_by, created_at, updated_at";

function fallbackSettings(workspaceId: string): WorkspaceTelephonySettings {
  return {
    workspace_id: workspaceId,
    active_adapter: "simulation",
    updated_by: null,
    created_at: null,
    updated_at: null,
  };
}

function mapSettings(row: SettingsRow): WorkspaceTelephonySettings {
  return {
    workspace_id: row.workspace_id,
    active_adapter: row.active_adapter,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getWorkspaceTelephonySettings(): Promise<WorkspaceTelephonySettings> {
  const { workspaceId } = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_telephony_settings")
    .select(SETTINGS_SELECT)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Telephony settings could not be loaded.");
  }

  return data ? mapSettings(data as SettingsRow) : fallbackSettings(workspaceId);
}

export async function updateWorkspaceTelephonyAdapter(
  adapter: SelectableTelephonyAdapter,
): Promise<WorkspaceTelephonySettings> {
  if (!isSelectableTelephonyAdapter(adapter)) {
    throw new DataAccessError("VALIDATION", "Unsupported telephony adapter.");
  }
  if (isTelnyxActivationBlocked(adapter)) {
    throw new DataAccessError("VALIDATION", "Aktivace Telnyxu je zablokována, dokud nebude telefonní číslo externě ověřeno.");
  }

  const context = await requireWorkspaceRole(["administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_telephony_adapter_with_audit", {
    p_workspace_id: context.workspaceId,
    p_adapter: adapter,
  });

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Telephony settings could not be saved.");
  }

  return mapSettings(data as SettingsRow);
}

export async function getActiveTelephonyAdapter(): Promise<TelephonyAdapter> {
  return (await getWorkspaceTelephonySettings()).active_adapter;
}
