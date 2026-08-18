import type { WorkspaceRole } from "@/lib/auth/roles";

export type OperatorRole = WorkspaceRole;

export interface OperatorIdentity {
  id: string;
  name: string;
  email: string;
  role: OperatorRole | null;
  avatarUrl: string | null;
}

export function getOperatorRoleLabel(role: OperatorRole | null): string {
  if (!role) return "Role unavailable";
  return role === "operator"
    ? "Operator"
    : role === "team_leader"
      ? "Team Leader"
      : "Administrator";
}

export function getOperatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
