import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  getScopedLeadForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
  requireWorkspaceRole: vi.fn(),
}));
vi.mock("@/lib/dal/leadQueue", () => ({ getScopedLeadForWorkspace: mocks.getScopedLeadForWorkspace }));

import { createOrderForWorkspace } from "@/lib/dal/orders";

const address = {
  recipient_name: "Jana Nováková",
  line1: "Hlavní 1",
  line2: "Byt 3",
  city: "Praha",
  postal_code: "110 00",
  country: "CZ",
};

describe("manual order delivery address contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceContext.mockResolvedValue({
      userId: "operator-1",
      workspaceId: "workspace-1",
      role: "operator",
    });
    mocks.getScopedLeadForWorkspace.mockResolvedValue({ id: "lead-1" });
  });

  it("rejects an incomplete address before opening an RPC boundary", async () => {
    await expect(createOrderForWorkspace({
      lead_id: "lead-1",
      items: [{ product_id: "product-1", quantity: 1, unit_price: 10 }],
      order_source: "manual",
      delivery_address_snapshot: { line1: "Hlavní 1" },
    } as never)).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mocks.requireWorkspaceContext).not.toHaveBeenCalled();
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("forwards the validated snapshot to the atomic manual-order RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "order-1" }], error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(createOrderForWorkspace({
      lead_id: "lead-1",
      items: [{ product_id: "product-1", quantity: 1, unit_price: 10 }],
      order_source: "manual",
      delivery_address_snapshot: address,
    } as never)).resolves.toMatchObject({ id: "order-1" });

    expect(rpc).toHaveBeenCalledWith("create_order_with_items", expect.objectContaining({
      p_delivery_address_snapshot: address,
    }));
  });
});
