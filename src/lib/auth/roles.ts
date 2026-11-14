import type { Database } from "@/lib/supabase/types";

export type WorkspaceRole = Database["public"]["Tables"]["workspace_members"]["Row"]["role"];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  operator: "Operátor",
  team_leader: "Vedoucí týmu",
  administrator: "Administrátor",
};

export function getWorkspaceRoleLabel(role: WorkspaceRole | null | undefined): string {
  return role ? WORKSPACE_ROLE_LABELS[role] : "Role není dostupná";
}

export function isTeamLeaderOrAdministrator(role: WorkspaceRole | null | undefined): boolean {
  return role === "team_leader" || role === "administrator";
}

export function isAdministrator(role: WorkspaceRole | null | undefined): boolean {
  return role === "administrator";
}

export function canManageLeads(role: WorkspaceRole | null | undefined): boolean {
  return isTeamLeaderOrAdministrator(role);
}
