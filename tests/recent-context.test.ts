import { describe, expect, it } from "vitest";
import {
  buildRecentContext,
  buildRecentContextFromCalendar,
  buildRecentContextFromSources,
  type RecentContextScheduledCall,
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

const scheduledCalls: RecentContextScheduledCall[] = [
  { id: "scheduled-call-later", lead_id: "lead-2", scheduled_at: "2026-09-05T10:00:00.000Z" },
  { id: "scheduled-call-active", lead_id: "lead-1", scheduled_at: "2026-09-01T10:00:00.000Z" },
];

const scheduledCallEntries: RecentContextScheduledCall[] = [
  { id: "scheduled-call-active", lead_id: "lead-1", scheduled_at: "2026-09-01T10:00:00.000Z" },
];

describe("recent context", () => {
  it("selects the latest contact, result, order and active scheduled call for a lead", () => {
    const result = buildRecentContext("lead-1", activities, scheduledCalls, Date.parse("2026-08-31T00:00:00.000Z"));

    expect(result.lastContact?.activity.id).toBe("call-latest");
    expect(result.lastCallResult?.activity.metadata?.call_outcome).toBe("order_placed");
    expect(result.lastOrder?.activity.id).toBe("order-latest");
    expect(result.activeScheduledCall?.id).toBe("scheduled-call-active");
  });

  it("returns null signals when a lead has no matching context", () => {
    const result = buildRecentContext("lead-empty", activities, scheduledCalls);

    expect(result).toEqual({
      lastContact: null,
      lastCallResult: null,
      lastOrder: null,
      activeScheduledCall: null,
    });
  });

  it("preserves scheduledCall-source unavailability instead of reporting no active scheduledCall", () => {
    const result = buildRecentContextFromCalendar(
      "lead-1",
      activities,
      {
        entries: [],
        sources: {
          scheduledCalls: {
            state: "unavailable",
            message: "Scheduled calls could not be loaded.",
          },
          reminders: { state: "available" },
        },
      },
      Date.parse("2026-08-31T00:00:00.000Z"),
    );

    expect(result.scheduledCallSource).toEqual({
      state: "unavailable",
      message: "Scheduled calls could not be loaded.",
    });
    expect(result.context.activeScheduledCall).toBeNull();
    expect(result.context.lastContact?.activity.id).toBe("call-latest");
  });

  it("keeps valid activities when the calendar source is unavailable", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "ready", data: activities },
      scheduledCalls: { status: "unavailable", reason: "database", message: "Calendar temporarily unavailable." },
      now: Date.parse("2026-08-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.lastContact?.activity.id).toBe("call-latest");
    expect(result.context?.activeScheduledCall).toBeNull();
    expect(result.unavailableSources).toEqual(["scheduledCalls"]);
    expect(result.messages.calendar).toBe("Calendar temporarily unavailable.");
  });

  it("keeps valid calendar scheduled calls when activities are unavailable", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "unavailable", reason: "database", message: "Activities temporarily unavailable." },
      scheduledCalls: { status: "ready", data: scheduledCallEntries },
      now: Date.parse("2026-08-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.activeScheduledCall?.id).toBe("scheduled-call-active");
    expect(result.context?.lastContact).toBeNull();
    expect(result.unavailableSources).toEqual(["activities"]);
    expect(result.messages.activities).toBe("Activities temporarily unavailable.");
  });

  it("returns empty only when both sources are verified empty", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-empty",
      activities: { status: "ready", data: [] },
      scheduledCalls: { status: "ready", data: [] },
    });

    expect(result.state).toBe("ready");
    expect(result.isEmpty).toBe(true);
    expect(result.context).toEqual({
      lastContact: null,
      lastCallResult: null,
      lastOrder: null,
      activeScheduledCall: null,
    });
    expect(result.unavailableSources).toEqual([]);
  });

  it("returns unavailable when both operational sources fail", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "unavailable", reason: "database", message: "Activities failed." },
      scheduledCalls: { status: "unavailable", reason: "database", message: "Calendar failed." },
    });

    expect(result.state).toBe("unavailable");
    expect(result.isEmpty).toBe(false);
    expect(result.context).toBeNull();
    expect(result.unavailableSources).toEqual(["activities", "scheduledCalls"]);
  });
});
