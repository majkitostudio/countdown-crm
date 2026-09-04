import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  createDataClient: vi.fn(),
  listWorkspaceOperators: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
  requireWorkspaceRole: vi.fn(),
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/dal/memberships", () => ({
  listWorkspaceOperators: mocks.listWorkspaceOperators,
}));

import { getWalletOverview } from "@/lib/dal/wallet";

const managerContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const operatorContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "operator" as const,
};

const baseSettings = {
  workspace_id: "workspace-1",
  currency: "CZK" as const,
  monthly_commission_rate: 8,
  updated_by: "user-1",
  created_at: "2026-09-04T08:00:00.000Z",
  updated_at: "2026-09-04T08:00:00.000Z",
};

const baseTransaction = {
  id: "txn-1",
  workspace_id: "workspace-1",
  user_id: "user-2",
  amount: 125,
  currency: "CZK" as const,
  transaction_type: "manual_adjustment",
  source_type: "manual",
  source_event_id: null,
  source_order_id: null,
  source_period_start: null,
  reason: "Bonus correction",
  author_id: "user-1",
  audit_log_id: "audit-1",
  rule_snapshot: null,
  created_at: "2026-09-04T10:00:00.000Z",
};

const baseBalance = {
  user_id: "user-2",
  transaction_count: 1,
  balance: 125,
  total_credits: 125,
  total_debits: 0,
};

const baseMember = {
  workspace_id: "workspace-1",
  user_id: "user-2",
  role: "operator" as const,
  full_name: "Wallet Member",
  email: "wallet@example.com",
  avatar_url: null,
  created_at: "2026-09-01T08:00:00.000Z",
  updated_at: "2026-09-01T08:00:00.000Z",
};

const baseProfile = {
  id: "user-2",
  full_name: "Wallet Member",
};

type QueryResult = { data: unknown; error: unknown };

function createThenableQuery(result: QueryResult) {
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };

  return builder;
}

function createRejectedQuery(reason: unknown) {
  const rejection = Promise.reject(reason);
  const builder = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => rejection),
    maybeSingle: vi.fn(() => rejection),
    then: rejection.then.bind(rejection),
  };
  return builder;
}

function createWalletClient({
  settingsResult = { data: baseSettings, error: null },
  rulesResult = { data: [], error: null },
  transactionsResult = { data: [baseTransaction], error: null },
  profilesResult = { data: [baseProfile], error: null },
  balancesResult = { data: [baseBalance], error: null },
  profilesRejection,
}: {
  settingsResult?: QueryResult;
  rulesResult?: QueryResult;
  transactionsResult?: QueryResult;
  profilesResult?: QueryResult;
  balancesResult?: QueryResult;
  profilesRejection?: unknown;
} = {}) {
  return {
    from(table: string) {
      if (table === "wallet_settings") {
        return { select: vi.fn(() => createThenableQuery(settingsResult)) };
      }

      if (table === "wallet_bonus_rules") {
        return { select: vi.fn(() => createThenableQuery(rulesResult)) };
      }

      if (table === "wallet_transactions") {
        return { select: vi.fn(() => createThenableQuery(transactionsResult)) };
      }

      if (table === "profiles") {
        return { select: vi.fn(() => profilesRejection === undefined ? createThenableQuery(profilesResult) : createRejectedQuery(profilesRejection)) };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    rpc(fn: string) {
      if (fn === "get_wallet_balances") {
        return Promise.resolve(balancesResult);
      }

      throw new Error(`Unexpected rpc ${fn}`);
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceContext.mockResolvedValue(managerContext);
  mocks.createDataClient.mockResolvedValue(createWalletClient());
  mocks.listWorkspaceOperators.mockResolvedValue([baseMember]);
});

describe("wallet runtime partial-failure contract", () => {
  it("keeps transactions when settings and balances fail", async () => {
    mocks.createDataClient.mockResolvedValue(
      createWalletClient({
        settingsResult: { data: null, error: { message: "settings exploded" } },
        balancesResult: { data: null, error: { message: "balance exploded" } },
      }),
    );

    const overview = await getWalletOverview();

    expect(overview.transactions).toHaveLength(1);
    expect(overview.settings).toBeNull();
    expect(overview.balances).toEqual([]);
    expect(overview.sections.settings.state).toBe("unavailable");
    expect(overview.sections.balances.state).toBe("unavailable");
  });

  it("keeps rows and falls back to Unknown user when profile lookup fails", async () => {
    mocks.createDataClient.mockResolvedValue(
      createWalletClient({
        profilesResult: { data: null, error: { message: "profiles exploded" } },
      }),
    );

    const overview = await getWalletOverview();

    expect(overview.transactions).toEqual([
      expect.objectContaining({ user_name: "Unknown user" }),
    ]);
    expect(overview.balances).toEqual([
      expect.objectContaining({ user_name: "Unknown user" }),
    ]);
    expect(overview.sections.profiles.state).toBe("unavailable");
  });

  it("keeps rows and marks profiles unavailable when the profile query rejects", async () => {
    mocks.createDataClient.mockResolvedValue(
      createWalletClient({ profilesRejection: new Error("profile transport failed") }),
    );

    const overview = await getWalletOverview();

    expect(overview.transactions).toEqual([
      expect.objectContaining({ user_name: "Unknown user" }),
    ]);
    expect(overview.balances).toEqual([
      expect.objectContaining({ user_name: "Unknown user" }),
    ]);
    expect(overview.sections.profiles).toEqual({
      state: "unavailable",
      message: "Wallet member names could not be loaded.",
    });
  });

  it("marks manager-only sections as not applicable for operators", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue(operatorContext);
    mocks.createDataClient.mockResolvedValue(
      createWalletClient({
        transactionsResult: { data: [], error: null },
        balancesResult: { data: [], error: null },
        profilesResult: { data: [], error: null },
      }),
    );

    const overview = await getWalletOverview();

    expect(overview.canManage).toBe(false);
    expect(overview.settings).toBeNull();
    expect(overview.rules).toEqual([]);
    expect(overview.members).toEqual([]);
    expect(overview.sections.settings).toEqual({ state: "not_applicable" });
    expect(overview.sections.rules).toEqual({ state: "not_applicable" });
    expect(overview.sections.members).toEqual({ state: "not_applicable" });
  });

  it("keeps an empty successful ledger distinct from an unavailable one", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue(operatorContext);
    mocks.createDataClient.mockResolvedValue(
      createWalletClient({
        transactionsResult: { data: [], error: null },
        balancesResult: { data: [], error: null },
        profilesResult: { data: [], error: null },
      }),
    );

    const overview = await getWalletOverview();

    expect(overview.transactions).toEqual([]);
    expect(overview.sections.transactions).toEqual({ state: "available" });
    expect(overview.sections.balances).toEqual({ state: "available" });
  });

  it("rethrows forbidden workspace errors instead of downgrading them to partial unavailable", async () => {
    mocks.requireWorkspaceContext.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "User is not a member of this workspace"),
    );

    await expect(getWalletOverview()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "User is not a member of this workspace",
    });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });
});
