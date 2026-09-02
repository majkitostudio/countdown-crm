import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
  listWorkspaceCallsInContext: vi.fn(),
  listWorkspaceOrdersInContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/dal/activity", () => ({
  listWorkspaceCallsInContext: mocks.listWorkspaceCallsInContext,
  listWorkspaceOrdersInContext: mocks.listWorkspaceOrdersInContext,
}));
vi.mock("@/lib/auth/roles", () => ({
  getWorkspaceRoleLabel: (role: string) => role,
}));

import { getAnalyticsData, getRecentActivity, ANALYTICS_ALLOWED_ROLES } from "@/lib/analytics";
import { DataAccessError } from "@/lib/dal/errors";

const workspaceContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

function createAnalyticsClient() {
  const orders = [
    {
      id: "order-1",
      workspace_id: "workspace-1",
      agent_id: "agent-1",
      status: "completed",
      total_amount: 125,
      currency: "USD",
      created_at: "2026-08-26T10:00:00.000Z",
    },
  ];
  const calls = [
    {
      id: "call-1",
      workspace_id: "workspace-1",
      agent_id: "agent-1",
      created_at: "2026-08-26T09:00:00.000Z",
    },
  ];
  const profiles = [
    {
      id: "agent-1",
      full_name: "Workspace Operator",
      email: "operator@example.com",
      role: "operator",
      status: "active",
      avatar_url: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
  ];

  return {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({
                data: table === "orders" ? orders : calls,
                error: null,
              });
            },
            in() {
              return Promise.resolve({ data: profiles, error: null });
            },
          };
        },
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue(workspaceContext);
  mocks.createDataClient.mockResolvedValue(createAnalyticsClient());
  mocks.listWorkspaceCallsInContext.mockResolvedValue([]);
  mocks.listWorkspaceOrdersInContext.mockResolvedValue([]);
});

describe("analytics server role boundary", () => {
  it("allows only Team Leaders and Administrators at the analytics DAL boundary", async () => {
    for (const role of ["team_leader", "administrator"] as const) {
      mocks.requireWorkspaceRole.mockResolvedValueOnce({ ...workspaceContext, role });

      const result = await getAnalyticsData("workspace-1");

      expect(result.totalRevenue).toBe(125);
      expect(mocks.requireWorkspaceRole).toHaveBeenLastCalledWith(ANALYTICS_ALLOWED_ROLES, "workspace-1");
    }
  });

  it("rejects an Operator before any analytics query can return data", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"));

    await expect(getAnalyticsData()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("rejects a missing or cross-workspace membership before reading analytics data", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new DataAccessError("FORBIDDEN", "User is not a member of this workspace"));

    await expect(getAnalyticsData("workspace-foreign")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(ANALYTICS_ALLOWED_ROLES, "workspace-foreign");
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("uses one authorized context for privileged recent activity", async () => {
    mocks.listWorkspaceCallsInContext.mockResolvedValue([
      {
        id: "call-1",
        created_at: "2026-08-26T10:00:00.000Z",
        lead_name: "Customer",
        agent_name: "Operator",
        duration_seconds: 30,
        outcome: "completed",
        sentiment: "Neutral",
      },
    ]);

    const result = await getRecentActivity(8, "workspace-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "call-call-1", customerName: "Customer" });
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledOnce();
    expect(mocks.listWorkspaceCallsInContext).toHaveBeenCalledWith(workspaceContext, 8);
    expect(mocks.listWorkspaceOrdersInContext).toHaveBeenCalledWith(workspaceContext, 8);
  });

  it("rejects privileged recent activity for an Operator without calling activity readers", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"));

    await expect(getRecentActivity()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listWorkspaceCallsInContext).not.toHaveBeenCalled();
    expect(mocks.listWorkspaceOrdersInContext).not.toHaveBeenCalled();
  });
});
