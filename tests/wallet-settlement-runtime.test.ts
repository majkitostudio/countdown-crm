import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
  listWorkspaceOperators: vi.fn(),
  rangeCalls: [] as Array<{ table: string; field: string | null; from: number; to: number }>,
  maxRows: 500,
  countDriftOnOrders: false,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/dal/memberships", () => ({
  listWorkspaceOperators: mocks.listWorkspaceOperators,
}));

import { getMonthlySettlementSummary } from "@/lib/dal/wallet";

const operator = {
  user_id: "operator-1",
  full_name: "Operator One",
  email: "operator@example.com",
};

function makeOrder(id: string, amount: number, status: "delivered" | "returned", dates: {
  delivered_at: string | null;
  returned_at: string | null;
}) {
  return {
    id,
    agent_id: operator.user_id,
    total_amount: amount,
    currency: "CZK",
    status,
    ...dates,
  };
}

function createQuery(table: string, rowsByField: Record<string, unknown[]>, rows: unknown[]) {
  const filters = new Map<string, unknown>();
  let field: string | null = null;
  let offset = 0;
  let end = 999;

  const builder = {
    eq(name: string, value: unknown) { filters.set(name, value); return builder; },
    in(name: string, value: unknown) { filters.set(name, value); return builder; },
    maybeSingle() { return Promise.resolve({ data: { currency: "CZK", monthly_commission_rate: 10 }, error: null }); },
    gte(name: string, value: unknown) { field = name; filters.set(`${name}.gte`, value); return builder; },
    lt(name: string, value: unknown) { field = name; filters.set(`${name}.lt`, value); return builder; },
    order() { return builder; },
    range(from: number, to: number) { offset = from; end = to; mocks.rangeCalls.push({ table, field, from, to }); return builder; },
    then(resolve: (value: { data: unknown[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
      const sourceRows = field ? rowsByField[field] || [] : rows;
      return Promise.resolve({
        data: sourceRows.slice(offset, Math.min(end + 1, offset + mocks.maxRows)),
        count: sourceRows.length + (mocks.countDriftOnOrders && table === "orders" && field === "delivered_at" && offset > 0 ? 1 : 0),
        error: null,
      }).then(resolve, reject);
    },
  };

  return builder;
}

function createSettlementClient({
  deliveredOrders,
  returnedOrders,
  bonusTransactions = [],
  finalizedTransactions = [],
}: {
  deliveredOrders: unknown[];
  returnedOrders: unknown[];
  bonusTransactions?: unknown[];
  finalizedTransactions?: unknown[];
}) {
  return {
    from(table: string) {
      return {
        select: () => {
          if (table === "wallet_settings") {
            return createQuery(table, {}, []);
          }
          if (table === "orders") {
            return createQuery(table, { delivered_at: deliveredOrders, returned_at: returnedOrders }, []);
          }
          if (table === "wallet_transactions") {
            return createQuery(table, {
              source_period_start: finalizedTransactions,
              created_at: bonusTransactions,
            }, []);
          }
          throw new Error(`Unexpected table ${table}`);
        },
      };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rangeCalls.length = 0;
  mocks.maxRows = 500;
  mocks.countDriftOnOrders = false;
  mocks.requireWorkspaceRole.mockResolvedValue({ workspaceId: "workspace-1" });
  mocks.listWorkspaceOperators.mockResolvedValue([operator]);
});

describe("monthly settlement order history and pagination", () => {
  it("includes old orders by delivery or return date and reads every page once", async () => {
    const deliveredOrders = Array.from({ length: 1_001 }, (_, index) => makeOrder(
      `old-delivered-${index}`,
      10,
      "delivered",
      { delivered_at: "2026-09-12T10:00:00.000Z", returned_at: null },
    ));
    const returnedOrder = makeOrder("old-returned", 50, "returned", {
      delivered_at: "2026-08-12T10:00:00.000Z",
      returned_at: "2026-09-16T10:00:00.000Z",
    });
    const returnedAfterDeliveryInMonth = makeOrder("same-month-delivery-return", 25, "returned", {
      delivered_at: "2026-09-11T10:00:00.000Z",
      returned_at: "2026-09-18T10:00:00.000Z",
    });
    const bonusTransactions = Array.from({ length: 1_001 }, (_, index) => ({
      id: `bonus-${index}`,
      user_id: operator.user_id,
      amount: 1,
      currency: "CZK",
      transaction_type: "order_bonus",
      created_at: "2026-09-20T10:00:00.000Z",
    }));

    mocks.createDataClient.mockResolvedValue(createSettlementClient({
      deliveredOrders,
      returnedOrders: [returnedOrder, returnedAfterDeliveryInMonth],
      bonusTransactions,
    }));

    const summary = await getMonthlySettlementSummary({ periodStart: "2026-09-01" });

    expect(summary.operators[0]).toMatchObject({
      deliveredCount: 1_002,
      deliveredTotal: 10_035,
      returnedCount: 2,
      returnedTotal: 75,
      netTurnover: 9_960,
      fixedBonuses: 1_001,
    });
    expect(mocks.rangeCalls.filter((call) => call.table === "orders" && call.field === "delivered_at")).toEqual([
      { table: "orders", field: "delivered_at", from: 0, to: 999 },
      { table: "orders", field: "delivered_at", from: 500, to: 1_499 },
      { table: "orders", field: "delivered_at", from: 1_000, to: 1_999 },
    ]);
    expect(mocks.rangeCalls.filter((call) => call.table === "wallet_transactions" && call.field === "created_at")).toEqual([
      { table: "wallet_transactions", field: "created_at", from: 0, to: 999 },
      { table: "wallet_transactions", field: "created_at", from: 500, to: 1_499 },
      { table: "wallet_transactions", field: "created_at", from: 1_000, to: 1_999 },
    ]);
  });

  it("fails closed when the matching row count changes between pages", async () => {
    mocks.countDriftOnOrders = true;
    mocks.createDataClient.mockResolvedValue(createSettlementClient({
      deliveredOrders: Array.from({ length: 1_001 }, (_, index) => makeOrder(
        `delivery-${index}`,
        10,
        "delivered",
        { delivered_at: "2026-09-12T10:00:00.000Z", returned_at: null },
      )),
      returnedOrders: [],
    }));

    await expect(getMonthlySettlementSummary({ periodStart: "2026-09-01" })).rejects.toMatchObject({ code: "DATABASE" });
  });
});
