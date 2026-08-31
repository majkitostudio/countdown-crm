import { describe, expect, it } from "vitest";
import { buildCustomer360Snapshot } from "@/lib/customer360";

const lead = { id: "lead-1", status: "customer" as const };

describe("Customer 360 retention playbook", () => {
  it("summarizes persisted calls, fulfilled orders and revenue", () => {
    const snapshot = buildCustomer360Snapshot(lead, {
      calls: [
        { created_at: "2026-08-29T10:00:00.000Z", outcome: "order_placed" },
        { created_at: "2026-08-30T10:00:00.000Z", outcome: "completed" },
      ],
      orders: [
        { id: "order-1", created_at: "2026-08-30T11:00:00.000Z", product_title: "Starter pack", total_amount: 125, currency: "CZK", status: "delivered" },
        { id: "order-2", created_at: "2026-08-31T11:00:00.000Z", product_title: "Pending pack", total_amount: 80, currency: "CZK", status: "pending" },
      ],
    });

    expect(snapshot.totalCalls).toBe(2);
    expect(snapshot.totalOrders).toBe(2);
    expect(snapshot.fulfilledOrders).toBe(1);
    expect(snapshot.totalRevenue).toBe(125);
    expect(snapshot.currency).toBe("CZK");
    expect(snapshot.nextAction.title).toBe("Check order progress");
  });

  it("turns a no-answer or objection outcome into an explainable outreach action", () => {
    const snapshot = buildCustomer360Snapshot({ id: "lead-2", status: "contacted" }, {
      calls: [{ created_at: "2026-08-31T10:00:00.000Z", outcome: "objection" }],
      orders: [],
    });

    expect(snapshot.nextAction.title).toBe("Review objection battlecards");
    expect(snapshot.nextAction.href).toBe("/products");
  });

  it("does not invent a retention history for a new lead", () => {
    const snapshot = buildCustomer360Snapshot({ id: "lead-3", status: "new" }, { calls: [], orders: [] });

    expect(snapshot.totalCalls).toBe(0);
    expect(snapshot.totalOrders).toBe(0);
    expect(snapshot.currency).toBeNull();
    expect(snapshot.nextAction.title).toBe("Start first outreach");
  });
});
