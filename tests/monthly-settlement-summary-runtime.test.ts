import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isDemoAuthEnabled: vi.fn(),
  createDataClient: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  listWorkspaceOperators: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/config", () => ({ isDemoAuthEnabled: mocks.isDemoAuthEnabled }));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }));
vi.mock("@/lib/dal/memberships", () => ({ listWorkspaceOperators: mocks.listWorkspaceOperators }));

import { getMonthlySettlementSummary } from "@/lib/dal/wallet";

type QueryResult = { data: unknown; error: { message: string } | null };

function query(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "gte", "lt"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function settlementClient(overrides: {
  settings?: QueryResult;
  orders?: QueryResult;
  commissionTransactions?: QueryResult;
  bonusTransactions?: QueryResult;
} = {}) {
  const results = {
    settings: overrides.settings ?? { data: { workspace_id: "workspace-1", currency: "CZK", monthly_commission_rate: 8 }, error: null },
    orders: overrides.orders ?? { data: [], error: null },
    commissionTransactions: overrides.commissionTransactions ?? { data: [], error: null },
    bonusTransactions: overrides.bonusTransactions ?? { data: [], error: null },
  };
  let walletTransactionQuery = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === "wallet_settings") return query(results.settings);
      if (table === "orders") return query(results.orders);
      if (table === "wallet_transactions") {
        walletTransactionQuery++;
        return query(walletTransactionQuery === 1 ? results.commissionTransactions : results.bonusTransactions);
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("monthly settlement summary runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDemoAuthEnabled.mockReturnValue(false);
    mocks.requireWorkspaceRole.mockResolvedValue({
      userId: "leader-1",
      workspaceId: "workspace-1",
      role: "team_leader",
    });
    mocks.listWorkspaceOperators.mockResolvedValue([
      { user_id: "operator-1", full_name: "Operator One", email: "operator@example.test" },
    ]);
  });

  it("does not replace unavailable wallet settings with a default currency and rate", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      settings: { data: null, error: { message: "settings unavailable" } },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Wallet settings could not be loaded.",
    );
  });

  it("does not report a valid zero settlement when order loading fails", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      orders: { data: null, error: { message: "orders unavailable" } },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Monthly settlement orders could not be loaded.",
    );
  });

  it("does not report a valid settlement when finalized commission loading fails", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      commissionTransactions: { data: null, error: { message: "commission transactions unavailable" } },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Finalized commission transactions could not be loaded.",
    );
  });

  it("does not report a valid settlement when monthly bonus loading fails", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      bonusTransactions: { data: null, error: { message: "bonus transactions unavailable" } },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Monthly bonus transactions could not be loaded.",
    );
  });

  it("rejects orders in another currency instead of totaling them as the configured currency", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      orders: {
        data: [{
          id: "order-eur",
          agent_id: "operator-1",
          total_amount: 100,
          currency: "EUR",
          status: "delivered",
          delivered_at: "2026-09-10T12:00:00.000Z",
          returned_at: null,
        }],
        error: null,
      },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Monthly settlement contains orders in another currency.",
    );
  });

  it("rejects finalized wallet entries in another currency", async () => {
    mocks.createDataClient.mockResolvedValue(settlementClient({
      commissionTransactions: {
        data: [{ id: "commission-eur", user_id: "operator-1", amount: 8, currency: "EUR", source_period_start: "2026-09-01", source_type: "commission_period" }],
        error: null,
      },
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toThrow(
      "Monthly settlement contains wallet entries in another currency.",
    );
  });

  it("keeps a cross-month return in the return month's commission only", async () => {
    const orders = [
      {
        id: "order-returned-cross-month",
        agent_id: "operator-1",
        total_amount: 1000,
        currency: "CZK",
        status: "returned",
        delivered_at: "2026-09-24T10:00:00.000Z",
        returned_at: "2026-10-03T11:00:00.000Z",
      },
      {
        id: "order-delivered-october",
        agent_id: "operator-1",
        total_amount: 2000,
        currency: "CZK",
        status: "delivered",
        delivered_at: "2026-10-12T10:00:00.000Z",
        returned_at: null,
      },
    ];
    mocks.createDataClient.mockResolvedValue(settlementClient({
      orders: { data: orders, error: null },
    }));

    const september = await getMonthlySettlementSummary({ periodStart: "2026-09-01" });
    const october = await getMonthlySettlementSummary({ periodStart: "2026-10-01" });

    expect(september.operators[0]).toMatchObject({
      deliveredTotal: 1000,
      returnedTotal: 0,
      netTurnover: 1000,
      commissionAmount: 80,
    });
    expect(october.operators[0]).toMatchObject({
      deliveredTotal: 2000,
      returnedTotal: 1000,
      netTurnover: 1000,
      commissionAmount: 80,
    });
  });
});
