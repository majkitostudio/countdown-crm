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

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "audit-101",
    timestamp: "2026-08-07 08:02:14",
    operatorId: "op-1",
    operatorName: "Jan Novák",
    actionType: "COMPLIANCE_VIOLATION",
    severity: "high",
    details: "Detekováno absolutní lékopisné tvrzení 'vyléčí' u doplňku stravy",
    ipAddress: "192.168.1.42",
  },
  {
    id: "audit-102",
    timestamp: "2026-08-07 07:45:30",
    operatorId: "op-2",
    operatorName: "Marie Kovářová",
    actionType: "EXPORT_DATA",
    severity: "medium",
    details: "Vygenerován a stažen CSV report prodejů za tento měsíc (142 řádků)",
    ipAddress: "192.168.1.58",
  },
  {
    id: "audit-103",
    timestamp: "2026-08-07 07:15:00",
    operatorId: "op-3",
    operatorName: "Petr Svoboda",
    actionType: "LOGIN",
    severity: "low",
    details: "Úspěšné přihlášení operátora do Operator Console",
    ipAddress: "192.168.1.15",
  },
  {
    id: "audit-104",
    timestamp: "2026-08-07 06:50:22",
    operatorId: "op-2",
    operatorName: "Marie Kovářová",
    actionType: "ORDER_CREATED",
    severity: "low",
    details: "Vytvořena nová 1-click objednávka #ORD-9821 v hodnotě 12 900 Kč",
    ipAddress: "192.168.1.58",
  },
  {
    id: "audit-105",
    timestamp: "2026-08-06 23:10:04",
    operatorId: "op-4",
    operatorName: "Tomáš Černý",
    actionType: "SETTINGS_CHANGE",
    severity: "critical",
    details: "Změněna konfigurace přístupových práv pro skupinu Operátoři",
    ipAddress: "192.168.1.99",
  },
  {
    id: "audit-106",
    timestamp: "2026-08-06 21:40:15",
    operatorId: "op-1",
    operatorName: "Jan Novák",
    actionType: "LEAD_UPDATE",
    severity: "low",
    details: "Aktualizován stav ledu #LEAD-402 z 'Kontaktován' na 'Kvalifikován'",
    ipAddress: "192.168.1.42",
  },
  {
    id: "audit-107",
    timestamp: "2026-08-06 19:15:00",
    operatorId: "op-3",
    operatorName: "Petr Svoboda",
    actionType: "CALL_COMPLETED",
    severity: "low",
    details: "Dokončen hovor ID #CALL-882 (Délka: 03:12, Spokojenost: 94%)",
    ipAddress: "192.168.1.15",
  },
];

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
