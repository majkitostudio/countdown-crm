import { describe, expect, it } from "vitest";
import {
  buildRecentContext,
  buildRecentContextFromCalendar,
  buildRecentContextFromSources,
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

const callbackEntries: RecentContextCallback[] = [
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

  it("keeps valid activities when the calendar source is unavailable", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "ready", data: activities },
      callbacks: { status: "unavailable", reason: "database", message: "Calendar temporarily unavailable." },
      now: Date.parse("2026-08-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.lastContact?.activity.id).toBe("call-latest");
    expect(result.context?.activeCallback).toBeNull();
    expect(result.unavailableSources).toEqual(["callbacks"]);
    expect(result.messages.calendar).toBe("Calendar temporarily unavailable.");
  });

  it("keeps valid calendar callbacks when activities are unavailable", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "unavailable", reason: "database", message: "Activities temporarily unavailable." },
      callbacks: { status: "ready", data: callbackEntries },
      now: Date.parse("2026-08-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.activeCallback?.id).toBe("callback-active");
    expect(result.context?.lastContact).toBeNull();
    expect(result.unavailableSources).toEqual(["activities"]);
    expect(result.messages.activities).toBe("Activities temporarily unavailable.");
  });

  it("returns empty only when both sources are verified empty", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-empty",
      activities: { status: "ready", data: [] },
      callbacks: { status: "ready", data: [] },
    });

    expect(result.state).toBe("ready");
    expect(result.isEmpty).toBe(true);
    expect(result.context).toEqual({
      lastContact: null,
      lastCallResult: null,
      lastOrder: null,
      activeCallback: null,
    });
    expect(result.unavailableSources).toEqual([]);
  });

  it("returns unavailable when both operational sources fail", () => {
    const result = buildRecentContextFromSources({
      leadId: "lead-1",
      activities: { status: "unavailable", reason: "database", message: "Activities failed." },
      callbacks: { status: "unavailable", reason: "database", message: "Calendar failed." },
    });

    expect(result.state).toBe("unavailable");
    expect(result.isEmpty).toBe(false);
    expect(result.context).toBeNull();
    expect(result.unavailableSources).toEqual(["activities", "callbacks"]);
  });
});
