import "server-only";

import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext } from "./workspace";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}

function normalizeText(value: string, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new DataAccessError("VALIDATION", `${label} is invalid.`);
  }
  return value.trim();
}

function normalizeEndpoint(value: string): string {
  const endpoint = normalizeText(value, "Push endpoint", 2048);
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new DataAccessError("VALIDATION", "Push endpoint is invalid.");
  }
  if (parsed.protocol !== "https:") {
    throw new DataAccessError("VALIDATION", "Push endpoint must use HTTPS.");
  }
  return endpoint;
}

function normalizeUserAgent(value: string | null | undefined): string | null {
  if (value === null || value === undefined || !value.trim()) return null;
  return normalizeText(value, "User agent", 512);
}

export async function registerPushSubscriptionForWorkspace(
  input: PushSubscriptionInput,
  requestedWorkspaceId?: string,
): Promise<void> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const endpoint = normalizeEndpoint(input.endpoint);
  const p256dh = normalizeText(input.p256dh, "Push key", 512);
  const auth = normalizeText(input.auth, "Push auth key", 512);
  const supabase = await createDataClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        workspace_id: context.workspaceId,
        user_id: context.userId,
        endpoint,
        p256dh,
        auth,
        user_agent: normalizeUserAgent(input.user_agent),
        disabled_at: null,
        last_failure_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id,endpoint" },
    );

  if (error) throw new DataAccessError("DATABASE", "Push subscription could not be saved.");
}

export async function removePushSubscriptionForWorkspace(
  endpoint: string,
  requestedWorkspaceId?: string,
): Promise<void> {
  const context = await requireWorkspaceContext(requestedWorkspaceId);
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const supabase = await createDataClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", context.userId)
    .eq("endpoint", normalizedEndpoint);

  if (error) throw new DataAccessError("DATABASE", "Push subscription could not be removed.");
}
