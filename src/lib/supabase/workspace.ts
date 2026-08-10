import { createClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedWorkspaceId: string | null | undefined;

/**
 * Transitional browser bridge for legacy services. It does not grant access;
 * Supabase RLS must still verify the membership for the returned workspace.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  if (cachedWorkspaceId !== undefined) return cachedWorkspaceId;

  const supabase = createClient() as unknown as SupabaseClient;
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    cachedWorkspaceId = null;
    return null;
  }

  cachedWorkspaceId = typeof data.workspace_id === "string" ? data.workspace_id : null;
  return cachedWorkspaceId;
}
