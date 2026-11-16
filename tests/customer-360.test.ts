import { describe, expect, it } from "vitest";
import { buildCustomer360Snapshot } from "@/lib/customer360";

const lead = { id: "lead-1", status: "customer" as const };

describe("Customer 360 retention playbook", () => {
  it("excludes missing amounts and reports incomplete fulfilled orders", () => {
    const snapshot = buildCustomer360Snapshot(lead, {
      calls: [],
      orders: [
        { id: "a", created_at: "2026-08-30T11:00:00Z", product_title: "A", total_amount: null, currency: "CZK", status: "completed" },
        { id: "b", created_at: "2026-08-30T11:00:00Z", product_title: "B", total_amount: 50, currency: null, status: "delivered" },
        { id: "c", created_at: "2026-08-30T11:00:00Z", product_title: "C", total_amount: 0, currency: "EUR", status: "completed" },
      ],
    });
    expect(snapshot.incompleteRevenueOrders).toBe(2);
    expect(snapshot.totalRevenue).toBeNull();
    expect(snapshot.revenueByCurrency).toEqual([{ currency: "EUR", amount: 0 }]);
  });
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
    expect(snapshot.revenueByCurrency).toEqual([{ currency: "CZK", amount: 125 }]);
    expect(snapshot.currency).toBe("CZK");
    expect(snapshot.nextAction.title).toBe("Zkontrolovat stav objednávky");
  });

  it("turns a no-answer or objection outcome into an explainable outreach action", () => {
    const snapshot = buildCustomer360Snapshot({ id: "lead-2", status: "contacted" }, {
      calls: [{ created_at: "2026-08-31T10:00:00.000Z", outcome: "objection" }],
      orders: [],
    });

    expect(snapshot.nextAction.title).toBe("Projít odpovědi na námitky");
    expect(snapshot.nextAction.href).toBe("/products");
  });

  it("does not invent a retention history for a new lead", () => {
    const snapshot = buildCustomer360Snapshot({ id: "lead-3", status: "new" }, { calls: [], orders: [] });

    expect(snapshot.totalCalls).toBe(0);
    expect(snapshot.totalOrders).toBe(0);
    expect(snapshot.currency).toBeNull();
    expect(snapshot.nextAction.title).toBe("Zahájit první kontakt");
  });

  it("keeps fulfilled revenue separated when a customer has multiple currencies", () => {
    const snapshot = buildCustomer360Snapshot(lead, {
      calls: [],
      orders: [
        { id: "order-czk", created_at: "2026-08-30T11:00:00.000Z", product_title: "CZK pack", total_amount: 125, currency: "CZK", status: "completed" },
        { id: "order-eur", created_at: "2026-08-31T11:00:00.000Z", product_title: "EUR pack", total_amount: 80, currency: "EUR", status: "delivered" },
      ],
    });

    expect(snapshot.totalRevenue).toBeNull();
    expect(snapshot.currency).toBeNull();
    expect(snapshot.revenueByCurrency).toEqual([
      { currency: "CZK", amount: 125 },
      { currency: "EUR", amount: 80 },
    ]);
  });
});
