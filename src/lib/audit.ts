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
  | "ORDER_CREATED_MANUAL"
  | "ORDER_PRODUCT_REASSIGNED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_DETAILS_UPDATED"
  | "CALL_REVIEW_COMPLETED"
  | "CALL_REVIEW_CORRECTED";

export interface CallReviewAuditState {
  id: string;
  revisionNumber: number;
  verdict: string;
  coachingNote: string;
  correctionReason: string | null;
  reviewerId: string;
  createdAt: string;
}

export interface CallReviewAuditDetails {
  previous: CallReviewAuditState | null;
  next: CallReviewAuditState;
  correctionReason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReviewState(value: unknown): CallReviewAuditState | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string"
    || !Number.isInteger(value.revision_number)
    || (value.revision_number as number) < 1
    || typeof value.verdict !== "string"
    || typeof value.coaching_note !== "string"
    || (value.correction_reason !== null && typeof value.correction_reason !== "string")
    || typeof value.reviewer_id !== "string"
    || typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    revisionNumber: value.revision_number as number,
    verdict: value.verdict,
    coachingNote: value.coaching_note,
    correctionReason: value.correction_reason as string | null,
    reviewerId: value.reviewer_id,
    createdAt: value.created_at,
  };
}

export function parseCallReviewAuditDetails(value: string): CallReviewAuditDetails | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const next = parseReviewState(parsed.new);
  const previousRecord = parsed.previous;
  const previous = isRecord(previousRecord) && Object.keys(previousRecord).length === 0
    ? null
    : parseReviewState(previousRecord);
  if (!next || (previousRecord !== null && previousRecord !== undefined && previous === null && !(isRecord(previousRecord) && Object.keys(previousRecord).length === 0))) {
    return null;
  }
  if (parsed.correction_reason !== null && typeof parsed.correction_reason !== "string") {
    return null;
  }

  return {
    previous,
    next,
    correctionReason: parsed.correction_reason as string | null,
  };
}

export function auditActionLabel(action: AuditActionType): string {
  if (action === "CALL_REVIEW_COMPLETED") return "Call review completed";
  if (action === "CALL_REVIEW_CORRECTED") return "Call review corrected";
  return action;
}

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
