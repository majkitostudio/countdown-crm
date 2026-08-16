// src/lib/audit.ts

import { saveAuditLogToSupabase } from "./supabase/auditService";
import { fetchAuditLogsFromSupabase } from "./supabase/auditService";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

export type AuditActionType =
  | "LOGIN"
  | "LOGOUT"
  | "LEAD_UPDATE"
  | "EXPORT_DATA"
  | "CALL_COMPLETED"
  | "SETTINGS_CHANGE"
  | "COMPLIANCE_VIOLATION"
  | "ORDER_CREATED";

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
  return fetchAuditLogsFromSupabase();
}

export async function addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
  const saved = await saveAuditLogToSupabase(entry);
  if (!saved) throw new Error("Audit log could not be saved");
  return newEntry;
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
