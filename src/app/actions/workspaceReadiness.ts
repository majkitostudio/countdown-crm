"use server";

import { getWorkspaceReadinessForWorkspace } from "@/lib/dal/workspaceReadiness";

export async function getWorkspaceReadinessAction() {
  return getWorkspaceReadinessForWorkspace();
}
