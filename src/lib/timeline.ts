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
  };
}

import { listLeadActivityAction } from "@/app/actions/crm";

export async function getLeadTimeline(leadId: string): Promise<TimelineActivityEntry[]> {
  const activity = await listLeadActivityAction(leadId);
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
  ];

  return dbEntries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
