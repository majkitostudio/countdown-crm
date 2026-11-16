import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceContext: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
  requireWorkspaceRole: vi.fn(),
}));
vi.mock("@/lib/dal/leadQueue", () => ({ getScopedLeadForWorkspace: vi.fn() }));

import { createOrderForWorkspace, updateOrderDetailsForWorkspace } from "@/lib/dal/orders";

const items = [{ product_id: "product-1", quantity: 1, unit_price: 0 }];
const address = { recipient_name: "Jana", line1: "Hlavní 1", city: "Praha", postal_code: "11000", country: "CZ" };

describe("server order product currency guard", () => {
  const rpc = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceContext.mockResolvedValue({ workspaceId: "workspace-1", role: "administrator" });
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockResolvedValue({ data: [{ id: "product-1", currency: "CZK" }], error: null });
    rpc.mockResolvedValue({ data: [{ id: "order-1", workspace_id: "workspace-1" }], error: null });
    mocks.createDataClient.mockResolvedValue({ from: vi.fn(() => query), rpc });
  });

  it.each([null, "", "  "])("rejects missing currency %s before creation", async (currency) => {
    query.in.mockResolvedValue({ data: [{ id: "product-1", currency }], error: null });
    await expect(createOrderForWorkspace({
      lead_id: "lead-1", items, order_source: "manual", delivery_address_snapshot: address,
    })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(rpc).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
  });

  it("rejects missing currency before editing", async () => {
    query.in.mockResolvedValue({ data: [{ id: "product-1", currency: null }], error: null });
    await expect(updateOrderDetailsForWorkspace({
      orderId: "order-1", expectedRevision: 1, items, order_source: "manual",
    })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["CZK", "EUR"])("allows an explicitly stored %s currency and zero price", async (currency) => {
    query.in.mockResolvedValue({ data: [{ id: "product-1", currency }], error: null });
    await expect(createOrderForWorkspace({
      lead_id: "lead-1", items, order_source: "manual", delivery_address_snapshot: address,
    })).resolves.toMatchObject({ id: "order-1" });
    expect(rpc).toHaveBeenCalledWith("create_order_with_items", expect.anything());
  });

  it("allows editing when the stored currency is present", async () => {
    await expect(updateOrderDetailsForWorkspace({
      orderId: "order-1", expectedRevision: 1, items, order_source: "manual",
    })).resolves.toMatchObject({ id: "order-1" });
    expect(rpc).toHaveBeenCalledWith("update_order_with_items", expect.anything());
  });

  it("fails closed when the product lookup fails or a product is inaccessible", async () => {
    for (const result of [{ data: null, error: { message: "offline" } }, { data: [], error: null }]) {
      query.in.mockResolvedValue(result);
      await expect(updateOrderDetailsForWorkspace({
        orderId: "order-1", expectedRevision: 1, items, order_source: "manual",
      })).rejects.toBeDefined();
      expect(rpc).not.toHaveBeenCalled();
    }
  });
});
