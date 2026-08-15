import type { Database } from "@/lib/supabase/types";

export type OperatorRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export interface OperatorIdentity {
  id: string;
  name: string;
  email: string;
  role: OperatorRole | null;
  avatarUrl: string | null;
}

export function getOperatorRoleLabel(role: OperatorRole | null): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "agent":
      return "Agent";
    default:
      return "Role unavailable";
  }
}

export function getOperatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
