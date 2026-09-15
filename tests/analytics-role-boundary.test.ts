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

function createAnalyticsClient(options: {
  orders?: Array<Record<string, unknown>>;
  calls?: Array<Record<string, unknown>>;
  teams?: Array<Record<string, unknown>>;
  errors?: Partial<Record<"orders" | "calls" | "teams" | "profiles", boolean>>;
} = {}) {
  const orders = options.orders || [
    {
      id: "order-1",
      workspace_id: "workspace-1",
      team_id: "team-1",
      agent_id: "agent-1",
      status: "completed",
      total_amount: 125,
      currency: "USD",
      created_at: "2026-08-26T10:00:00.000Z",
    },
  ];
  const calls = options.calls || [
    {
      id: "call-1",
      workspace_id: "workspace-1",
      team_id: "team-1",
      agent_id: "agent-1",
      created_at: "2026-08-26T09:00:00.000Z",
    },
  ];
  const teams = options.teams || [
    { id: "team-1", workspace_id: "workspace-1", name: "Sales" },
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
  const rowsByTable: Record<string, Array<Record<string, unknown>>> = { orders, calls, teams, profiles };
  const filtersByTable: Record<string, string[]> = {};

  return {
    filtersByTable,
    from(table: string) {
      let rows = [...(rowsByTable[table] || [])];
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: unknown) {
          filtersByTable[table] = [...(filtersByTable[table] || []), `${column}=${String(value)}`];
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        in(column: string, values: unknown[]) {
          filtersByTable[table] = [...(filtersByTable[table] || []), `${column} in ${values.join("|")}`];
          rows = rows.filter((row) => values.includes(row[column]));
          return query;
        },
        then(resolve: (value: { data: Array<Record<string, unknown>> | null; error: Error | null }) => unknown) {
          const error = options.errors?.[table as keyof typeof options.errors]
            ? new Error(`${table} unavailable`)
            : null;
          return Promise.resolve({ data: error ? null : rows, error }).then(resolve);
        },
      };
      return query;
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

  it("returns only the Team Leader's permitted teams and applies that scope before aggregation", async () => {
    const client = createAnalyticsClient({
      // The teams query represents the database RLS result for this leader.
      // The second team's activity is present only to prove the server filter
      // runs before the numbers are calculated.
      teams: [
        { id: "team-1", workspace_id: "workspace-1", name: "Sales" },
      ],
      orders: [
        {
          id: "order-1",
          workspace_id: "workspace-1",
          team_id: "team-1",
          agent_id: "agent-1",
          status: "completed",
          total_amount: 125,
          currency: "USD",
          created_at: "2026-08-26T10:00:00.000Z",
        },
        {
          id: "order-2",
          workspace_id: "workspace-1",
          team_id: "team-2",
          agent_id: "agent-2",
          status: "completed",
          total_amount: 900,
          currency: "USD",
          created_at: "2026-08-26T11:00:00.000Z",
        },
      ],
    });
    mocks.createDataClient.mockResolvedValue(client);

    const result = await getAnalyticsData("workspace-1");

    expect(result).toMatchObject({
      scope: "team",
      scopeLabel: "Moje týmy",
      accessibleTeams: [{ id: "team-1", name: "Sales" }],
    });
    expect(client.filtersByTable.orders).toContain("team_id in team-1");
    expect(client.filtersByTable.calls).toContain("team_id in team-1");
    expect(result.totalRevenue).toBe(125);
  });

  it("keeps Administrator analytics workspace-wide without adding a team filter", async () => {
    mocks.requireWorkspaceRole.mockResolvedValueOnce({ ...workspaceContext, role: "administrator" });
    const client = createAnalyticsClient({
      teams: [
        { id: "team-1", workspace_id: "workspace-1", name: "Sales" },
        { id: "team-2", workspace_id: "workspace-1", name: "Retention" },
      ],
    });
    mocks.createDataClient.mockResolvedValue(client);

    const result = await getAnalyticsData("workspace-1");

    expect(result).toMatchObject({ scope: "workspace", scopeLabel: "Celý workspace" });
    expect(result.accessibleTeams).toHaveLength(2);
    expect(client.filtersByTable.orders?.some((filter) => filter.startsWith("team_id in"))).toBe(false);
    expect(client.filtersByTable.calls?.some((filter) => filter.startsWith("team_id in"))).toBe(false);
  });

  it.each([
    ["calls", { calls: "unavailable", orders: "ready" }, { totalCalls: 0, totalRevenue: 125 }],
    ["orders", { calls: "ready", orders: "unavailable" }, { totalCalls: 1, totalRevenue: 0 }],
    ["profiles", { operators: "unavailable" }, { totalCalls: 1, totalRevenue: 125 }],
    ["teams", { teams: "unavailable" }, { totalCalls: 1, totalRevenue: 125 }],
  ] as const)("keeps healthy analytics when the %s source is unavailable", async (failedSource, expectedSources, expectedValues) => {
    mocks.createDataClient.mockResolvedValue(createAnalyticsClient({ errors: { [failedSource]: true } }));

    const result = await getAnalyticsData("workspace-1");

    expect(result.sources).toMatchObject(expectedSources);
    expect(result).toMatchObject(expectedValues);
    if (failedSource === "teams") {
      expect(result.scope).toBe("team");
      expect(result.accessibleTeams).toEqual([]);
    }
    if (failedSource === "profiles") {
      expect(result.teamMetricsAvailable).toBe(false);
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

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ id: "call-call-1", customerName: "Customer" });
    expect(result.sources).toEqual({ calls: "ready", orders: "ready" });
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
