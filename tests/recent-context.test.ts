import { describe, expect, it } from "vitest";
import {
  buildRecentContext,
  buildRecentContextFromCalendar,
  type RecentContextCallback,
} from "@/components/workspace/recentContext";
import type { WorkspaceActivity } from "@/lib/domain";

const activities: WorkspaceActivity[] = [
  {
    id: "order-old",
    record: { id: "lead-1", type: "lead" },
    type: "order",
    title: "Order Completed",
    actor: "Operator",
    timestamp: "2026-08-20T10:00:00.000Z",
    metadata: { order_value: 1200, order_currency: "CZK" },
    source: "supabase",
  },
  {
    id: "call-old",
    record: { id: "lead-1", type: "lead" },
    type: "call",
    title: "Call Logged",
    description: "Older call",
    actor: "Operator",
    timestamp: "2026-08-25T10:00:00.000Z",
    metadata: { call_outcome: "no_answer" },
    source: "supabase",
  },
  {
    id: "call-latest",
    record: { id: "lead-1", type: "lead" },
    type: "call",
    title: "Call Logged",
    description: "Latest call",
    actor: "Operator",
    timestamp: "2026-08-30T10:00:00.000Z",
    metadata: { call_outcome: "order_placed" },
    source: "supabase",
  },
  {
    id: "order-latest",
    record: { id: "lead-1", type: "lead" },
    type: "order",
    title: "Order Completed",
    actor: "Operator",
    timestamp: "2026-08-31T10:00:00.000Z",
    metadata: { order_value: 2500, order_currency: "CZK" },
    source: "supabase",
  },
];

const callbacks: RecentContextCallback[] = [
  { id: "callback-later", lead_id: "lead-2", scheduled_at: "2026-09-05T10:00:00.000Z" },
  { id: "callback-active", lead_id: "lead-1", scheduled_at: "2026-09-01T10:00:00.000Z" },
];

describe("recent context", () => {
  it("selects the latest contact, result, order and active callback for a lead", () => {
    const result = buildRecentContext("lead-1", activities, callbacks, Date.parse("2026-08-31T00:00:00.000Z"));

    expect(result.lastContact?.activity.id).toBe("call-latest");
    expect(result.lastCallResult?.activity.metadata?.call_outcome).toBe("order_placed");
    expect(result.lastOrder?.activity.id).toBe("order-latest");
    expect(result.activeCallback?.id).toBe("callback-active");
  });

  it("returns null signals when a lead has no matching context", () => {
    const result = buildRecentContext("lead-empty", activities, callbacks);

    expect(result).toEqual({
      lastContact: null,
      lastCallResult: null,
      lastOrder: null,
      activeCallback: null,
    });
  });

  it("preserves callback-source unavailability instead of reporting no active callback", () => {
    const result = buildRecentContextFromCalendar(
      "lead-1",
      activities,
      {
        entries: [],
        sources: {
          callbacks: {
            state: "unavailable",
            message: "Scheduled callbacks could not be loaded.",
          },
          reminders: { state: "available" },
        },
      },
      Date.parse("2026-08-31T00:00:00.000Z"),
    );

    expect(result.callbackSource).toEqual({
      state: "unavailable",
      message: "Scheduled callbacks could not be loaded.",
    });
    expect(result.context.activeCallback).toBeNull();
    expect(result.context.lastContact?.activity.id).toBe("call-latest");
  });
});
