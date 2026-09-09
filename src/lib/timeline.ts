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
    order_currency?: string;
    order_source?: string;
    source_note?: string;
    call_duration_seconds?: number;
    call_outcome?: string;
    paylink_url?: string;
    status_from?: string;
    status_to?: string;
  };
}

import { listLeadActivityPageAction, listLeadActivityEventsAction } from "@/app/actions/crm";
import type { CustomerActivityEvent, CustomerActivityPageOptions } from "./customerActivity";

export async function getLeadActivityPage(leadId: string, options?: CustomerActivityPageOptions) {
  const page = await listLeadActivityPageAction(leadId, options);
  return {
    ...page,
    items: page.items.map(toTimelineEntry),
  };
}

function toTimelineEntry(event: CustomerActivityEvent): TimelineActivityEntry {
  return {
      id: event.id,
      lead_id: event.lead_id,
      type: event.source === "lead_note" ? "note" : event.source,
      title: event.preview.title,
      description: event.preview.text ?? undefined,
      operator_name: event.actor.display_name,
      timestamp: event.occurred_at,
      metadata: {
        order_id: event.source === "order" ? event.source_entity_id : undefined,
        order_value: event.metadata.amount,
        order_currency: event.metadata.currency,
        order_source: event.metadata.order_source,
        source_note: event.metadata.source_note,
        call_duration_seconds: event.metadata.duration_seconds,
        call_outcome: event.metadata.call_outcome,
      },
    };
}

export async function getLeadTimeline(leadId: string): Promise<TimelineActivityEntry[]> {
  return (await listLeadActivityEventsAction(leadId)).map(toTimelineEntry);
}
