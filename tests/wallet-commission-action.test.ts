import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWalletOverview: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/dal/wallet", () => ({
  addWalletBonusRule: vi.fn(),
  addWalletManualAdjustment: vi.fn(),
  finalizeWalletMonthlyCommission: vi.fn(),
  finalizeWorkspaceMonthlySettlement: vi.fn(),
  getMonthlySettlementSummary: vi.fn(),
  getWalletOverview: mocks.getWalletOverview,
  updateWalletSettings: vi.fn(),
}));

import { getCurrentOperatorCommissionAction } from "@/app/actions/wallet";

function walletOverview({
  balances = [{ user_id: "user-1", balance: 0 }],
  balanceState = "available",
  settings = { currency: "CZK" },
  settingsState = "available",
}: {
  balances?: Array<{ user_id: string; balance: number }>;
  balanceState?: "available" | "unavailable" | "not_applicable";
  settings?: { currency: string } | null;
  settingsState?: "available" | "unavailable" | "not_applicable";
} = {}) {
  return {
    currentUserId: "user-1",
    balances,
    settings,
    sections: {
      balances: { state: balanceState },
      settings: { state: settingsState },
    },
  };
}

describe("getCurrentOperatorCommissionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves a recorded zero and its actual currency", async () => {
    mocks.getWalletOverview.mockResolvedValue(walletOverview());

    await expect(getCurrentOperatorCommissionAction()).resolves.toEqual({
      status: "available",
      balance: 0,
      currency: "CZK",
    });
  });

  it("shows zero in the configured currency when there is no balance record", async () => {
    mocks.getWalletOverview.mockResolvedValue(walletOverview({ balances: [], settings: { currency: "EUR" } }));

    await expect(getCurrentOperatorCommissionAction()).resolves.toEqual({
      status: "available",
      balance: 0,
      currency: "EUR",
    });
  });

  it("does not turn an unavailable balance section into zero", async () => {
    mocks.getWalletOverview.mockResolvedValue(walletOverview({ balanceState: "unavailable" }));

    await expect(getCurrentOperatorCommissionAction()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("does not invent a currency when settings are unavailable", async () => {
    mocks.getWalletOverview.mockResolvedValue(
      walletOverview({ settings: null, settingsState: "unavailable" }),
    );

    await expect(getCurrentOperatorCommissionAction()).resolves.toEqual({
      status: "available",
      balance: 0,
      currency: null,
    });
  });

  it("returns unavailable when wallet loading throws", async () => {
    mocks.getWalletOverview.mockRejectedValue(new Error("offline"));

    await expect(getCurrentOperatorCommissionAction()).resolves.toEqual({
      status: "unavailable",
    });
  });
});
