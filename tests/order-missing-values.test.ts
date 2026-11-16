import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/auth/config", () => ({ isDemoAuthEnabled: () => false }));

import { listWorkspaceOrdersInContext } from "@/lib/dal/activity";

describe("order read with missing values", () => {
  it("preserves missing values and zero without using the item currency", async () => {
    const base = {
      id: "order", lead_id: "lead", agent_id: null, total_amount: null, currency: null,
      items: [{ id: "item", product_id: "p", product_title: "P", unit_price: 1, minimum_unit_price: 1, quantity: 1, line_total: 1, currency: "EUR" }],
      status: "pending", order_source: "manual", source_note: null, revision: 1, created_at: "2026-01-01",
    };
    mocks.rpc.mockResolvedValue({ data: [base, { ...base, id: "zero", total_amount: 0, currency: "CZK" }], error: null });
    const orders = await listWorkspaceOrdersInContext({ workspaceId: "workspace" } as Parameters<typeof listWorkspaceOrdersInContext>[0]);
    expect(orders.map(({ total_amount, currency }) => ({ total_amount, currency }))).toEqual([
      { total_amount: null, currency: null },
      { total_amount: 0, currency: "CZK" },
    ]);
  });
});
