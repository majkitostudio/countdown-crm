"use server";

import {
  registerPushSubscriptionForWorkspace,
  removePushSubscriptionForWorkspace,
  type PushSubscriptionInput,
} from "@/lib/dal/pushSubscriptions";

export async function registerPushSubscriptionAction(
  input: PushSubscriptionInput,
  workspaceId?: string,
): Promise<void> {
  return registerPushSubscriptionForWorkspace(input, workspaceId);
}

export async function removePushSubscriptionAction(
  endpoint: string,
  workspaceId?: string,
): Promise<void> {
  return removePushSubscriptionForWorkspace(endpoint, workspaceId);
}
