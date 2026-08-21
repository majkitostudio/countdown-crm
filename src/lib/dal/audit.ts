import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type AuditActionType =
  | "LOGIN"
  | "LOGOUT"
  | "LEAD_UPDATE"
  | "EXPORT_DATA"
  | "CALL_COMPLETED"
  | "SETTINGS_CHANGE"
  | "COMPLIANCE_VIOLATION"
  | "ORDER_CREATED"
  | "ORDER_CREATED_MANUAL"
  | "ORDER_PRODUCT_REASSIGNED"
  | "ORDER_STATUS_CHANGED";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

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

export interface CreateAuditLogInput {
  action: AuditActionType;
  severity: AuditSeverity;
  details: string;
  ipAddress?: string;
}

const AUDIT_SELECT =
  "id, workspace_id, timestamp, actor_id, actor_name, action, severity, details, ip_address";

function validateInput(input: CreateAuditLogInput): CreateAuditLogInput {
  if (!input || typeof input !== "object") {
    throw new DataAccessError("VALIDATION", "Audit log input is invalid.");
  }

  if (typeof input.action !== "string" || input.action.length > 80) {
    throw new DataAccessError("VALIDATION", "Audit action is invalid.");
  }

  if (!["low", "medium", "high", "critical"].includes(input.severity)) {
    throw new DataAccessError("VALIDATION", "Audit severity is invalid.");
  }

  if (typeof input.details !== "string" || !input.details.trim() || input.details.length > 5000) {
    throw new DataAccessError("VALIDATION", "Audit details must be between 1 and 5,000 characters.");
  }

  if (input.ipAddress !== undefined && typeof input.ipAddress !== "string") {
    throw new DataAccessError("VALIDATION", "Audit IP address is invalid.");
  }

  return {
    action: input.action,
    severity: input.severity,
    details: input.details.trim(),
    ipAddress: input.ipAddress?.trim() || "127.0.0.1",
  };
}

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

export async function createAuditLogForWorkspace(input: CreateAuditLogInput): Promise<AuditLogDTO> {
  const context = await requireWorkspaceContext();
  const validated = validateInput(input);
  const supabase = await createDataClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();

  if (profileError) {
    throw new DataAccessError("DATABASE", "Unable to resolve the audit operator.");
  }

  const actorName = profile?.full_name?.trim() || "Unknown operator";
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      workspace_id: context.workspaceId,
      actor_id: context.userId,
      actor_name: actorName,
      action: validated.action,
      target_resource: "System",
      details: validated.details,
      severity: validated.severity,
      ip_address: validated.ipAddress || "127.0.0.1",
    })
    .select(AUDIT_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to save the audit log.");
  }

  return mapAuditLog(data as AuditLogRow);
}
