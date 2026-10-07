import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

import {
  updateOrderStatusForWorkspace,
  bulkUpdateOrderStatusForWorkspace,
} from "@/lib/dal/orders";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261007120000_manager_order_fulfillment_status_updates.sql",
    import.meta.url
  ),
  "utf8"
).replace(/\s+/g, " ");

describe("Milestone 1.1: Order Fulfillment Lifecycle Contract", () => {
  it("enforces manager authorization and sets fulfillment event context in the database migration", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_order_status_with_history");
    expect(migration).toContain("Only workspace managers can mark orders as delivered or returned");
    expect(migration).toContain("PERFORM set_config('countdown.fulfillment_event_id', fulfillment_event, true)");
    expect(migration).toContain("delivered_at = coalesce(delivered_at, clock_timestamp())");
    expect(migration).toContain("returned_at = coalesce(returned_at, clock_timestamp())");
    expect(migration).toContain("UPDATE public.order_status_history SET note = trim(p_note)");
  });

  describe("DAL: updateOrderStatusForWorkspace", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.requireWorkspaceContext.mockResolvedValue({
        userId: "manager-1",
        workspaceId: "workspace-1",
        role: "team_leader",
      });
    });

    it("rejects invalid inputs before calling database", async () => {
      await expect(
        updateOrderStatusForWorkspace({ orderId: "", status: "delivered" })
      ).rejects.toMatchObject({ code: "VALIDATION" });

      await expect(
        updateOrderStatusForWorkspace({
          orderId: "order-1",
          status: "delivered",
          note: "x".repeat(501),
        })
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });

    it("successfully calls update_order_status_with_history RPC and returns updated order", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: "order-1",
            workspace_id: "workspace-1",
            status: "delivered",
            total_amount: 1500,
            currency: "CZK",
          },
        ],
        error: null,
      });

      mocks.createDataClient.mockResolvedValue({ rpc: mockRpc });

      const result = await updateOrderStatusForWorkspace({
        orderId: "order-1",
        status: "delivered",
        note: "Zákazník převzal balíček od kurýra DPD",
      });

      expect(mockRpc).toHaveBeenCalledWith("update_order_status_with_history", {
        p_order_id: "order-1",
        p_status: "delivered",
        p_note: "Zákazník převzal balíček od kurýra DPD",
      });
      expect(result.status).toBe("delivered");
    });

    it("translates database validation errors into friendly DAL validation errors", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Only workspace managers can mark orders as delivered or returned" },
      });

      mocks.createDataClient.mockResolvedValue({ rpc: mockRpc });

      await expect(
        updateOrderStatusForWorkspace({
          orderId: "order-1",
          status: "delivered",
        })
      ).rejects.toMatchObject({
        code: "VALIDATION",
        message: expect.stringContaining("Only workspace managers"),
      });
    });
  });

  describe("DAL: bulkUpdateOrderStatusForWorkspace", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.requireWorkspaceContext.mockResolvedValue({
        userId: "admin-1",
        workspaceId: "workspace-1",
        role: "administrator",
      });
      mocks.requireWorkspaceRole.mockResolvedValue({
        userId: "admin-1",
        workspaceId: "workspace-1",
        role: "administrator",
      });
    });

    it("rejects empty order list", async () => {
      await expect(
        bulkUpdateOrderStatusForWorkspace({
          orderIds: [],
          status: "sent",
        })
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });

    it("requires manager or administrator role", async () => {
      mocks.requireWorkspaceRole.mockRejectedValue(new Error("Insufficient permissions"));

      await expect(
        bulkUpdateOrderStatusForWorkspace({
          orderIds: ["order-1", "order-2"],
          status: "sent",
        })
      ).rejects.toThrow("Insufficient permissions");

      expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["team_leader", "administrator"]);
    });

    it("updates all selected orders and reports success count", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: "order-1",
            workspace_id: "workspace-1",
            status: "sent",
          },
        ],
        error: null,
      });
      mocks.createDataClient.mockResolvedValue({ rpc: mockRpc });

      const result = await bulkUpdateOrderStatusForWorkspace({
        orderIds: ["order-1", "order-2"],
        status: "sent",
        note: "Expedováno dnešním svozem",
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });
  });

  describe("UI components contract", () => {
    it("OrderStatusEditor allows delivered and returned for managers", () => {
      const editorFile = readFileSync(
        new URL("../src/components/orders/OrderStatusEditor.tsx", import.meta.url),
        "utf8"
      );
      expect(editorFile).toContain('"delivered"');
      expect(editorFile).toContain('"returned"');
      expect(editorFile).toContain("managerStatuses");
    });

    it("OrderPipeline includes bulk selection and bulk action bar for managers", () => {
      const pipelineFile = readFileSync(
        new URL("../src/components/orders/OrderPipeline.tsx", import.meta.url),
        "utf8"
      );
      const ordersPageFile = readFileSync(
        new URL("../src/app/orders/page.tsx", import.meta.url),
        "utf8"
      );
      expect(pipelineFile).toContain("onBulkStatusUpdate");
      expect(ordersPageFile).toContain("bulkUpdateOrderStatusAction");
      expect(pipelineFile).toContain('data-testid="bulk-action-bar"');
      expect(pipelineFile).toContain("toggleSelectAll");
      expect(pipelineFile).toContain("Mark Delivered");
      expect(pipelineFile).toContain("Mark Sent");
      expect(pipelineFile).toContain("Mark Returned");
    });
  });
});
