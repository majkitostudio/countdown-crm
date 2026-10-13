import type { WorkspaceRole } from "@/lib/auth/roles";

const ROLE_HOME_PATHS: Record<WorkspaceRole, string> = {
  operator: "/console",
  team_leader: "/exceptions",
  administrator: "/reports",
};

export function getRoleHomePath(role: WorkspaceRole): string {
  return ROLE_HOME_PATHS[role];
}
