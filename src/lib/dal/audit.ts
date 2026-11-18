import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type AuditLogDTO = Pick<
  AuditLogRow,
  | "id"
  | "workspace_id"
  | "timestamp"
  | "actor_id"
  | "actor_name"
  | "action"
  | "severity"
  | "details"
  | "ip_address"
>;

const AUDIT_SELECT =
  "id, workspace_id, timestamp, actor_id, actor_name, action, severity, details, ip_address";

function mapAuditLog(row: AuditLogRow): AuditLogDTO {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    timestamp: row.timestamp,
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    action: row.action,
    severity: row.severity,
    details: row.details,
    ip_address: row.ip_address,
  };
}

export async function listAuditLogsForWorkspace(): Promise<AuditLogDTO[]> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_SELECT)
    .eq("workspace_id", workspaceId)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load audit logs.");
  }

  return ((data || []) as AuditLogRow[]).map(mapAuditLog);
}
