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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Authenticated workspace required");
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Workspace membership lookup failed");
  }

  if (!data) {
    throw new Error("Authenticated user has no workspace membership");
  }

  cachedWorkspaceId = typeof data.workspace_id === "string" ? data.workspace_id : null;
  return cachedWorkspaceId;
}
