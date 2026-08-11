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
      operator_name: "Alex Vance",
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
      operator_name: "Alex Vance",
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
      operator_name: "Alex Vance",
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
      operator_name: "Jan Dvořák",
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
      operator_name: "Jan Dvořák",
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
      operator_name: "Jan Dvořák",
      timestamp: "2026-08-04T15:40:00Z",
    },
  ],
};

import { createClient } from "./supabase/client";
import { getCurrentWorkspaceId } from "./supabase/workspace";
import { isDemoModeActive } from "./demoMode";

const timelineStore: Record<string, TimelineActivityEntry[]> = { ...INITIAL_TIMELINE_DATA };

import { Database } from "./supabase/types";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type OrderWithProduct = Database["public"]["Tables"]["orders"]["Row"] & { products?: { title: string } | null };

export async function getLeadTimeline(leadId: string): Promise<TimelineActivityEntry[]> {
  if (isDemoModeActive()) {
    return timelineStore[leadId] || [];
  }

  try {
    const supabase = createClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error("No active workspace");

    const [callsRes, ordersRes] = await Promise.all([
      supabase.from("calls").select("*").eq("lead_id", leadId).eq("workspace_id", workspaceId),
      supabase.from("orders").select("*, products(title)").eq("lead_id", leadId).eq("workspace_id", workspaceId),
    ]);

    if (callsRes.error || ordersRes.error) {
      throw new Error("Timeline query failed");
    }

    const calls = (callsRes.data || []) as CallRow[];
    const orders = (ordersRes.data || []) as unknown as OrderWithProduct[];

    const dbEntries: TimelineActivityEntry[] = [];

    calls.forEach((c) => {
      dbEntries.push({
        id: `tl-call-${c.id}`,
        lead_id: leadId,
        type: "call",
        title: "Call Logged in Workspace",
        description: `Duration: ${Math.round((c.duration_seconds || 0) / 60)}m ${(c.duration_seconds || 0) % 60}s • Outcome: ${c.outcome} • Sentiment: ${c.ai_sentiment || "Neutral"}`,
        operator_name: "Senior Agent",
        timestamp: c.created_at,
        metadata: {
          call_duration_seconds: c.duration_seconds || 0,
          call_outcome: c.outcome,
        },
      });
    });

    orders.forEach((o) => {
      dbEntries.push({
        id: `tl-ord-${o.id}`,
        lead_id: leadId,
        type: "order",
        title: `Order Completed ($${Number(o.total_amount || 0).toFixed(2)})`,
        description: o.products?.title || "Purchased Product Stack",
        operator_name: "Senior Agent",
        timestamp: o.created_at,
        metadata: {
          order_value: Number(o.total_amount || 0),
        },
      });
    });

    return dbEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    throw err instanceof Error ? err : new Error("Timeline query failed");
  }
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
