// src/lib/audit.ts

import { createAuditLogAction, listAuditLogsAction } from "@/app/actions/audit";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

export type AuditActionType =
  | "LOGIN"
  | "LOGOUT"
  | "LEAD_UPDATE"
  | "EXPORT_DATA"
  | "CALL_COMPLETED"
  | "SETTINGS_CHANGE"
  | "COMPLIANCE_VIOLATION"
  | "ORDER_CREATED"
  | "ORDER_CREATED_MANUAL";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  actionType: AuditActionType;
  severity: AuditSeverity;
  details: string;
  ipAddress: string;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const rows = await listAuditLogsAction();
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp
      ? new Date(row.timestamp).toISOString().replace("T", " ").substring(0, 19)
      : "",
    operatorId: row.actor_id,
    operatorName: row.actor_name,
    actionType: row.action as AuditActionType,
    severity: row.severity as AuditSeverity,
    details: row.details,
    ipAddress: row.ip_address || "127.0.0.1",
  }));
}

export async function addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
  const saved = await createAuditLogAction({
    action: entry.actionType,
    severity: entry.severity,
    details: entry.details,
    ipAddress: entry.ipAddress,
  });

  return {
    id: saved.id,
    timestamp: saved.timestamp
      ? new Date(saved.timestamp).toISOString().replace("T", " ").substring(0, 19)
      : "",
    operatorId: saved.actor_id,
    operatorName: saved.actor_name,
    actionType: saved.action as AuditActionType,
    severity: saved.severity as AuditSeverity,
    details: saved.details,
    ipAddress: saved.ip_address || "127.0.0.1",
  };
}

export function exportAuditLogsToCSV(logs: AuditLogEntry[]): void {
  if (typeof window === "undefined") return;

  const headers = ["ID", "Čas Záznamu", "Operátor ID", "Operátor", "Typ Akce", "Závažnost", "Detail", "IP Adresa"];
  const rows = logs.map((l) => [
    `"${l.id}"`,
    `"${l.timestamp}"`,
    `"${l.operatorId}"`,
    `"${l.operatorName}"`,
    `"${l.actionType}"`,
    `"${l.severity}"`,
    `"${l.details}"`,
    `"${l.ipAddress}"`,
  ].join(","));

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `security_audit_log_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
