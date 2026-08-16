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
    call_duration_seconds?: number;
    call_outcome?: string;
    paylink_url?: string;
    status_from?: string;
    status_to?: string;
  };
}

const INITIAL_TIMELINE_DATA: Record<string, TimelineActivityEntry[]> = {
  "lead-1": [
    {
      id: "tl-101",
      lead_id: "lead-1",
      type: "call",
      title: "Outbound Call Connected",
      description: "Customer expressed high interest in Bio-Boost stack. Price objection handled with 15% VIP bundle discount.",
      operator_name: "Historical operator",
      timestamp: "2026-08-05T14:32:00Z",
      metadata: {
        call_duration_seconds: 145,
        call_outcome: "order_placed",
      },
    },
    {
      id: "tl-102",
      lead_id: "lead-1",
      type: "order",
      title: "Order #ORD-8921 Placed",
      description: "Bio-Boost Anti-Aging Stack + Liposomal Vitamin C Bundle",
      operator_name: "Historical operator",
      timestamp: "2026-08-05T14:35:10Z",
      metadata: {
        order_id: "ORD-8921",
        order_value: 149.99,
      },
    },
    {
      id: "tl-103",
      lead_id: "lead-1",
      type: "sms_paylink",
      title: "SMS Pay-Link Dispatched",
      description: "Pay-Link sent via SMS to +420 774 123 456 for instant checkout.",
      operator_name: "Historical operator",
      timestamp: "2026-08-05T14:36:00Z",
      metadata: {
        paylink_url: "https://pay.countdowncrm.com/pl_8921",
      },
    },
    {
      id: "tl-104",
      lead_id: "lead-1",
      type: "note",
      title: "AI Note: Follow-up Scheduled",
      description: "Customer prefers delivery on Fridays between 10:00 - 12:00.",
      operator_name: "Historical operator",
      timestamp: "2026-08-04T09:15:00Z",
    },
    {
      id: "tl-105",
      lead_id: "lead-1",
      type: "status_change",
      title: "Lead Status Updated",
      description: "Status promoted from Prospect to Qualified Deal.",
      operator_name: "System AI",
      timestamp: "2026-08-03T16:00:00Z",
      metadata: {
        status_from: "Prospect",
        status_to: "Qualified Deal",
      },
    },
  ],
  "lead-2": [
    {
      id: "tl-201",
      lead_id: "lead-2",
      type: "call",
      title: "Initial Outreach Call",
      description: "No answer — Left voicemail regarding Collagen Glow Serum promo.",
      operator_name: "Historical operator",
      timestamp: "2026-08-05T11:20:00Z",
      metadata: {
        call_duration_seconds: 35,
        call_outcome: "no_answer",
      },
    },
    {
      id: "tl-202",
      lead_id: "lead-2",
      type: "note",
      title: "Custom Note Added",
      description: "Customer inquired about sensitive skin dermatological tests.",
      operator_name: "Historical operator",
      timestamp: "2026-08-04T15:40:00Z",
    },
  ],
};

import { isDemoModeActive } from "./demoMode";
import { listLeadActivityAction } from "@/app/actions/crm";

const timelineStore: Record<string, TimelineActivityEntry[]> = { ...INITIAL_TIMELINE_DATA };

export async function getLeadTimeline(leadId: string): Promise<TimelineActivityEntry[]> {
  if (isDemoModeActive()) {
    return timelineStore[leadId] || [];
  }

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
      description: order.product_title,
      operator_name: order.agent_name,
      timestamp: order.created_at,
      metadata: {
        order_value: order.total_amount,
      },
    })),
  ];

  return dbEntries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addTimelineEntry(
  leadId: string,
  entry: Omit<TimelineActivityEntry, "id" | "lead_id" | "timestamp">
): TimelineActivityEntry | null {
  if (!isDemoModeActive()) {
    return null;
  }

  const newEntry: TimelineActivityEntry = {
    ...entry,
    id: `tl-${Date.now()}`,
    lead_id: leadId,
    timestamp: new Date().toISOString(),
  };

  const current = timelineStore[leadId] || [];
  timelineStore[leadId] = [newEntry, ...current];
  return newEntry;
}
