import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
  requireWorkspaceContext: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/dal/leadQueue", () => ({
  getScopedLeadForWorkspace: vi.fn(),
}));

import { updateLeadStatusForWorkspace } from "@/lib/dal/leads";
import { reassignOrdersProductForWorkspace } from "@/lib/dal/orders";
import { DataAccessError } from "@/lib/dal/errors";

const workspaceContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260826190619_atomic_business_mutations_audit.sql",
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue(workspaceContext);
});

describe("atomic business mutation DAL wiring", () => {
  it("uses one lead RPC and returns the durable row", async () => {
    const lead = {
      id: "lead-1",
      workspace_id: "workspace-1",
      status: "contacted",
    };
    const rpc = vi.fn().mockResolvedValue({ data: [lead], error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(updateLeadStatusForWorkspace("lead-1", "contacted", "workspace-1"))
      .resolves.toEqual(lead);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("update_lead_status_with_audit", {
      p_workspace_id: "workspace-1",
      p_lead_id: "lead-1",
      p_status: "contacted",
    });
  });

  it("maps an atomic RPC/audit failure without claiming a changed lead", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "audit insert failed" },
    });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(updateLeadStatusForWorkspace("lead-1", "contacted", "workspace-1"))
      .rejects.toMatchObject({ code: "DATABASE", message: "Lead update failed" });
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("rejects an unauthorized role before invoking either mutation RPC", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"),
    );
    const rpc = vi.fn();
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(updateLeadStatusForWorkspace("lead-1", "contacted", "workspace-1"))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(reassignOrdersProductForWorkspace("source-1", "target-1", "workspace-1"))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses one order RPC and preserves the server returned moved IDs", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        source_product_id: "source-1",
        target_product_id: "target-1",
        moved_order_ids: ["order-1", "order-2"],
      }],
      error: null,
    });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(reassignOrdersProductForWorkspace("source-1", "target-1", "workspace-1"))
      .resolves.toEqual({
        sourceProductId: "source-1",
        targetProductId: "target-1",
        movedOrderIds: ["order-1", "order-2"],
      });
    expect(rpc).toHaveBeenCalledWith("reassign_orders_product_with_audit", {
      p_workspace_id: "workspace-1",
      p_source_product_id: "source-1",
      p_target_product_id: "target-1",
    });
  });

  it("maps an atomic order RPC/audit failure without claiming moved orders", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "audit insert failed" },
    });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(reassignOrdersProductForWorkspace("source-1", "target-1", "workspace-1"))
      .rejects.toMatchObject({
        code: "DATABASE",
        message: "Unable to reassign the selected orders.",
      });
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("accepts a duplicate desired-state retry with no moved rows", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        source_product_id: "source-1",
        target_product_id: "target-1",
        moved_order_ids: [],
      }],
      error: null,
    });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(reassignOrdersProductForWorkspace("source-1", "target-1", "workspace-1"))
      .resolves.toMatchObject({ movedOrderIds: [] });
  });
});

describe("atomic business mutation SQL contract", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("uses invoker functions with explicit authenticated-only execution", () => {
    expect(migration.match(/^SECURITY INVOKER$/gm)).toHaveLength(2);
    expect(migration).not.toMatch(/SECURITY DEFINER/);
    expect(migration.match(/REVOKE ALL ON FUNCTION[\s\S]*?FROM PUBLIC, anon;/g)).toHaveLength(2);
    expect(migration.match(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO authenticated;/g)).toHaveLength(2);
  });

  it("binds both mutations to the requested workspace and manager/admin role", () => {
    expect(migration.match(/private\.is_workspace_manager_or_admin\(p_workspace_id\)/g)).toHaveLength(2);
    expect(migration).toContain("lead.workspace_id = p_workspace_id");
    expect(migration).toContain("order_row.workspace_id = p_workspace_id");
    expect(migration).toContain("product.workspace_id = p_workspace_id");
  });

  it("keeps the audit insert inside each mutation and makes retries no-ops", () => {
    expect(migration).toContain("IF lead_row.status IS NOT DISTINCT FROM p_status THEN");
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("set_config('countdown.order_edit_rpc', 'on', true)");
    expect(migration).toContain("IF COALESCE(cardinality(moved_ids), 0) > 0 THEN");
    expect(migration.match(/INSERT INTO public\.audit_logs/g)).toHaveLength(2);
  });
});
