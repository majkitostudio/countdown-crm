"use server";

import { requireWorkspaceContext } from "@/lib/dal/workspace";
import {
  deleteWorkspaceMember,
  listWorkspaceMembers,
  updateWorkspaceMemberRole,
} from "@/lib/dal/memberships";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";

export async function getCurrentWorkspaceContextAction() {
  const context = await requireWorkspaceContext();
  return {
    userId: context.userId,
    workspaceId: context.workspaceId,
    role: context.role,
  };
}

export async function listWorkspaceMembersAction(): Promise<WorkspaceMemberDTO[]> {
  return listWorkspaceMembers();
}

export async function updateWorkspaceMemberRoleAction(
  userId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMemberDTO> {
  return updateWorkspaceMemberRole(userId, role);
}

export async function removeWorkspaceMemberAction(userId: string): Promise<void> {
  return deleteWorkspaceMember(userId);
}
