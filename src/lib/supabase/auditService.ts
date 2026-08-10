import { createClient } from "./client";
import { Database } from "./types";
import { AuditLogEntry } from "../audit";
import { getCurrentWorkspaceId } from "./workspace";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

/**
 * Supabase Data Access Service for Enterprise Security Audit Logs
 */

export async function fetchAuditLogsFromSupabase(): Promise<AuditLogEntry[]> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Audit log query failed");
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as AuditLogRow[]).map((l) => ({
    id: l.id,
    timestamp: l.timestamp ? new Date(l.timestamp).toISOString().replace("T", " ").substring(0, 19) : "",
    operatorId: l.actor_id,
    operatorName: l.actor_name,
    actionType: l.action as AuditLogEntry["actionType"],
    severity: l.severity as AuditLogEntry["severity"],
    details: l.details,
    ipAddress: l.ip_address || "127.0.0.1",
  }));
}

export async function saveAuditLogToSupabase(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<boolean> {
  const supabase = getDb();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  const { error } = await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: entry.operatorId,
    actor_name: entry.operatorName,
    action: entry.actionType,
    target_resource: "System",
    details: entry.details,
    severity: entry.severity,
    ip_address: entry.ipAddress || "127.0.0.1",
  });

  if (error) {
    console.warn("[auditService] Failed to insert audit log into Supabase:", error);
    return false;
  }

  return true;
}
