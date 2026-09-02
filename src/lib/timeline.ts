import { listLeadAuditLogsAction } from "@/app/actions/audit";
import { listLeadActivityAction } from "@/app/actions/crm";
import { listLeadNotesAction } from "@/app/actions/leadNotes";

export type TimelineActivityType =
  | "call"
  | "order"
  | "sms_paylink"
  | "note"
  | "status_change";

export interface TimelineActivityEntry {
  id: string;
  lead_id: string;
  type: TimelineActivityType;
  title: string;
  description?: string;
  operator_name: string;
  timestamp: string;
  metadata?: {
    order_id?: string;
    order_value?: number;
    order_source?: string;
    source_note?: string;
    call_duration_seconds?: number;
    call_outcome?: string;
    paylink_url?: string;
    status_from?: string;
    status_to?: string;
    audit_action?: string;
    target_resource?: string;
  };
}

export async function getLeadTimeline(
  leadId: string,
  options: { includeAudit?: boolean } = {},
): Promise<TimelineActivityEntry[]> {
  const [activity, notes, auditLogs] = await Promise.all([
    listLeadActivityAction(leadId),
    listLeadNotesAction(leadId),
    options.includeAudit ? listLeadAuditLogsAction(leadId) : Promise.resolve([]),
  ]);
  const dbEntries: TimelineActivityEntry[] = [
    ...activity.calls.map((call) => ({
      id: `tl-call-${call.id}`,
      lead_id: leadId,
      type: "call" as const,
      title: "Call Logged in Workspace",
      description: `Duration: ${Math.round((call.duration_seconds || 0) / 60)}m ${(call.duration_seconds || 0) % 60}s • Outcome: ${call.outcome} • Sentiment: ${call.sentiment}`,
      operator_name: call.agent_name,
      timestamp: call.created_at,
      metadata: {
        call_duration_seconds: call.duration_seconds || 0,
        call_outcome: call.outcome,
      },
    })),
    ...activity.orders.map((order) => ({
      id: `tl-ord-${order.id}`,
      lead_id: leadId,
      type: "order" as const,
      title: `Order Completed ($${order.total_amount.toFixed(2)})`,
      description: `${order.product_title} • Source: ${order.order_source}${order.source_note ? ` • ${order.source_note}` : ""}`,
      operator_name: order.agent_name,
      timestamp: order.created_at,
      metadata: {
        order_value: order.total_amount,
        order_source: order.order_source,
        source_note: order.source_note || undefined,
      },
    })),
    ...notes.map((note) => ({
      id: `tl-note-${note.id}`,
      lead_id: leadId,
      type: "note" as const,
      title: "Operator Note",
      description: note.body,
      operator_name: note.author_name,
      timestamp: note.created_at,
    })),
    ...auditLogs.map((auditLog) => ({
      id: `tl-audit-${auditLog.id}`,
      lead_id: leadId,
      type: "status_change" as const,
      title: "Lead change committed",
      description: auditLog.details,
      operator_name: auditLog.actor_name,
      timestamp: auditLog.timestamp,
      metadata: {
        audit_action: auditLog.action,
        target_resource: auditLog.target_resource,
      },
    })),
  ];

  return dbEntries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
