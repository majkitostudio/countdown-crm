import type { WorkspaceRole } from "@/lib/auth/roles";

const ROLE_HOME_PATHS: Record<WorkspaceRole, string> = {
  operator: "/workspace",
  team_leader: "/exceptions",
  administrator: "/dashboard",
};

export function getRoleHomePath(role: WorkspaceRole): string {
  return ROLE_HOME_PATHS[role];
}
